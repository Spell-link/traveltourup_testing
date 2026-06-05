import "server-only";

import type { Prisma } from "@/generated/prisma";
import { Prisma as PrismaRuntime } from "@/generated/prisma";
import type {
  FunnelStage,
  JourneyEventType,
  JourneyProductType,
} from "@/lib/constants/customer-journey";
import { denormFieldsFromSnapshot } from "@/lib/journey/journey-snapshot-denorm";
import {
  mergeTripSnapshots,
  parseTripSnapshot,
  type JourneyTripSnapshot,
} from "@/lib/journey/journey-trip-snapshot";
import { buildTripUnitKey } from "@/lib/journey/journey-trip-unit";
import { prisma } from "@/lib/prisma";
import { shouldAdvanceFunnelStage } from "@/lib/services/journey/customer-journey.core";

export type RecordJourneyEventInput = {
  userId: string;
  eventType: JourneyEventType | string;
  productType: JourneyProductType | string;
  productRef: string;
  stage: FunnelStage;
  properties?: Record<string, unknown> | null;
  clientEventId?: string | null;
  title?: string | null;
  subtitle?: string | null;
  priceAmount?: string | null;
  priceCurrency?: string | null;
  /** @deprecated Prefer tripSnapshot — merged into search_context */
  searchContext?: Record<string, unknown> | null;
  tripSnapshot?: Partial<JourneyTripSnapshot> | null;
  convertedBookingId?: string | null;
  /** When true, do not advance funnel stage (e.g. product.enriched) */
  preserveStage?: boolean;
};

function asJson(value: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return PrismaRuntime.JsonNull as unknown as Prisma.InputJsonValue;
  return value as Prisma.InputJsonValue;
}

function resolveMergedSnapshot(
  existingContext: unknown,
  tripSnapshot: Partial<JourneyTripSnapshot> | null | undefined,
  legacySearchContext: Record<string, unknown> | null | undefined,
): JourneyTripSnapshot | null {
  const base = parseTripSnapshot(existingContext);
  const legacyAsSnapshot =
    legacySearchContext && typeof legacySearchContext === "object"
      ? (legacySearchContext as Partial<JourneyTripSnapshot>)
      : null;
  const merged = mergeTripSnapshots(base, legacyAsSnapshot);
  const final = mergeTripSnapshots(merged, tripSnapshot ?? null);
  if (!final.product_ref) return null;
  return final;
}

function resolveTripUnitKey(input: {
  productType: string;
  productRef: string;
  title?: string | null;
  mergedSnapshot: JourneyTripSnapshot | null;
  existingTitle?: string | null;
}): string {
  const denorm = denormFieldsFromSnapshot(input.mergedSnapshot);
  return buildTripUnitKey({
    product_type: input.productType,
    product_ref: input.productRef,
    title: input.title ?? input.existingTitle ?? null,
    ...denorm,
  });
}

async function findExistingInterest(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    productType: string;
    productRef: string;
    tripUnitKey: string;
  },
) {
  const byTripUnit = await tx.customerProductInterest.findUnique({
    where: {
      user_id_product_type_trip_unit_key: {
        user_id: input.userId,
        product_type: input.productType,
        trip_unit_key: input.tripUnitKey,
      },
    },
  });
  if (byTripUnit) return byTripUnit;

  const byProductRef = await tx.customerProductInterest.findFirst({
    where: {
      user_id: input.userId,
      product_type: input.productType,
      product_ref: input.productRef,
    },
  });
  if (byProductRef) return byProductRef;

  const refKey = `ref:${input.productRef}`;
  if (refKey !== input.tripUnitKey) {
    return tx.customerProductInterest.findUnique({
      where: {
        user_id_product_type_trip_unit_key: {
          user_id: input.userId,
          product_type: input.productType,
          trip_unit_key: refKey,
        },
      },
    });
  }

  return null;
}

export async function recordJourneyEvent(input: RecordJourneyEventInput): Promise<void> {
  const productRef = input.productRef.trim();
  if (!productRef) return;

  const clientEventId = input.clientEventId?.trim() || null;
  if (clientEventId) {
    const dup = await prisma.customerJourneyEvent.findUnique({
      where: {
        user_id_client_event_id: {
          user_id: input.userId,
          client_event_id: clientEventId,
        },
      },
      select: { id: true },
    });
    if (dup) return;
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const preliminarySnapshot = resolveMergedSnapshot(
      null,
      input.tripSnapshot
        ? { ...input.tripSnapshot, product_ref: productRef, product_type: input.productType as JourneyProductType }
        : null,
      input.searchContext,
    );
    const preliminaryTripUnitKey = resolveTripUnitKey({
      productType: input.productType,
      productRef,
      title: input.title,
      mergedSnapshot: preliminarySnapshot,
    });

    const existing = await findExistingInterest(tx, {
      userId: input.userId,
      productType: input.productType,
      productRef,
      tripUnitKey: preliminaryTripUnitKey,
    });

    const mergedSnapshot = resolveMergedSnapshot(
      existing?.search_context,
      input.tripSnapshot
        ? { ...input.tripSnapshot, product_ref: productRef, product_type: input.productType as JourneyProductType }
        : null,
      input.searchContext,
    );

    const tripUnitKey = resolveTripUnitKey({
      productType: input.productType,
      productRef,
      title: input.title,
      mergedSnapshot,
      existingTitle: existing?.title,
    });

    const eventProperties: Record<string, unknown> = {
      ...(input.properties ?? {}),
      ...(mergedSnapshot ? { snapshot: mergedSnapshot } : {}),
    };

    const effectiveStage =
      input.preserveStage && existing
        ? (existing.funnel_stage as FunnelStage)
        : input.preserveStage && !existing
          ? input.stage
          : input.stage;

    await tx.customerJourneyEvent.create({
      data: {
        user_id: input.userId,
        event_type: input.eventType,
        product_type: input.productType,
        product_ref: productRef,
        trip_unit_key: tripUnitKey,
        funnel_stage: effectiveStage,
        properties: asJson(eventProperties),
        client_event_id: clientEventId,
      },
    });

    const nextStage =
      input.preserveStage && existing
        ? existing.funnel_stage
        : existing && !shouldAdvanceFunnelStage(existing.funnel_stage, input.stage)
          ? existing.funnel_stage
          : input.stage;

    const convertedBookingId =
      input.convertedBookingId?.trim() || existing?.converted_booking_id || null;

    const denorm = denormFieldsFromSnapshot(mergedSnapshot);

    const shared = {
      funnel_stage: nextStage,
      trip_unit_key: tripUnitKey,
      product_ref: productRef,
      last_seen_at: now,
      last_event_type: input.eventType,
      ...(input.title != null ? { title: input.title } : {}),
      ...(input.subtitle != null ? { subtitle: input.subtitle } : {}),
      ...(input.priceAmount != null ? { price_amount: input.priceAmount } : {}),
      ...(input.priceCurrency != null ? { price_currency: input.priceCurrency } : {}),
      ...(mergedSnapshot ? { search_context: asJson(mergedSnapshot as unknown as Record<string, unknown>) } : {}),
      ...(denorm.origin_label != null ? { origin_label: denorm.origin_label } : {}),
      ...(denorm.destination_label != null ? { destination_label: denorm.destination_label } : {}),
      ...(denorm.start_date != null ? { start_date: denorm.start_date } : {}),
      ...(denorm.end_date != null ? { end_date: denorm.end_date } : {}),
      ...(denorm.travelers_summary != null ? { travelers_summary: denorm.travelers_summary } : {}),
      ...(denorm.trip_type != null ? { trip_type: denorm.trip_type } : {}),
      ...(convertedBookingId ? { converted_booking_id: convertedBookingId } : {}),
    };

    if (existing) {
      await tx.customerProductInterest.update({
        where: { id: existing.id },
        data: shared,
      });
    } else {
      await tx.customerProductInterest.create({
        data: {
          user_id: input.userId,
          product_type: input.productType,
          first_seen_at: now,
          ...shared,
        },
      });
    }
  });
}

/** Best-effort — never throw to callers on instrumentation paths. */
export function trackJourneyEvent(input: RecordJourneyEventInput): void {
  void recordJourneyEvent(input).catch(() => undefined);
}

export { isAbandonedInterest } from "@/lib/services/journey/customer-journey.core";
