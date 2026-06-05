import "server-only";

import type { Prisma } from "@/generated/prisma";
import type { AuthzContext } from "@/lib/authz/types";
import { AppError } from "@/lib/api/errors";
import { assertPermission } from "@/lib/authz/server";
import {
  JOURNEY_ABANDON_AFTER_CHECKOUT_HOURS,
  JOURNEY_ABANDON_AFTER_VIEW_HOURS,
  type FunnelStage,
} from "@/lib/constants/customer-journey";
import {
  formatOutreachSummary,
  formatRouteLabel,
  parseTripSnapshot,
  type JourneyTripSnapshot,
} from "@/lib/journey/journey-trip-snapshot";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { isAbandonedInterest } from "@/lib/services/journey/customer-journey.core";
import type { adminJourneyInterestsQuerySchema } from "@/lib/validations/customer-journey.schema";
import type { z } from "zod";

type InterestsQuery = z.infer<typeof adminJourneyInterestsQuerySchema>;

const FUNNEL_STEP_ORDER: FunnelStage[] = [
  "viewed",
  "checkout_clicked",
  "checkout_started",
  "payment_prepared",
  "booking_confirmed",
  "booking_changed",
  "booking_cancelled",
];

export type AdminJourneyInterestRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  product_type: string;
  product_ref: string;
  funnel_stage: string;
  title: string | null;
  subtitle: string | null;
  price_amount: string | null;
  price_currency: string | null;
  origin_label: string | null;
  destination_label: string | null;
  start_date: string | null;
  end_date: string | null;
  travelers_summary: string | null;
  trip_type: string | null;
  route_label: string;
  dates_label: string;
  first_seen_at: string;
  last_seen_at: string;
  last_event_type: string | null;
  converted_booking_id: string | null;
  is_abandoned: boolean;
  contact_incomplete: boolean;
  hours_since_last_seen: number;
  event_count: number;
  trip_unit_key: string;
};

export type AdminJourneyTimelineEvent = {
  id: string;
  event_type: string;
  product_type: string;
  product_ref: string;
  funnel_stage: string;
  properties: Prisma.JsonValue | null;
  created_at: string;
};

export type AdminJourneyInterestDetail = {
  interest: AdminJourneyInterestRow;
  snapshot: JourneyTripSnapshot | null;
  outreach_summary: string;
  detail_path: string | null;
  related_product_refs: string[];
  funnel_steps: Array<{
    stage: FunnelStage;
    label: string;
    reached: boolean;
    current: boolean;
    at: string | null;
  }>;
  events: AdminJourneyTimelineEvent[];
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    currency_id: string;
    country_code: string | null;
  };
};

async function emailsForUserIds(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const supabase = createSupabaseServiceRoleClient();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const { data } = await supabase.auth.admin.getUserById(id);
        map.set(id, data.user?.email ?? "");
      } catch {
        map.set(id, "");
      }
    }),
  );
  return map;
}

function formatPhone(phone: string | null, countryCode: string | null): string | null {
  if (!phone?.trim()) return null;
  const cc = countryCode?.trim();
  return cc ? `${cc} ${phone.trim()}` : phone.trim();
}

function formatDatesLabel(start: string | null, end: string | null): string {
  if (start && end && start !== end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return "—";
}

function hoursSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000)));
}

function mapInterestRow(
  r: {
    id: string;
    user_id: string;
    product_type: string;
    product_ref: string;
    trip_unit_key: string;
    funnel_stage: string;
    title: string | null;
    subtitle: string | null;
    price_amount: string | null;
    price_currency: string | null;
    origin_label: string | null;
    destination_label: string | null;
    start_date: string | null;
    end_date: string | null;
    travelers_summary: string | null;
    trip_type: string | null;
    search_context: Prisma.JsonValue | null;
    first_seen_at: Date;
    last_seen_at: Date;
    last_event_type: string | null;
    converted_booking_id: string | null;
    user: {
      first_name: string;
      last_name: string;
      phone: string | null;
      phone_country_code: string | null;
      phone_verified_at: Date | null;
    };
  },
  email: string,
  extras?: { event_count?: number },
): AdminJourneyInterestRow {
  const phone = formatPhone(r.user.phone, r.user.phone_country_code);
  const snapshot = parseTripSnapshot(r.search_context);
  const routeLabel =
    r.product_type === "hotel"
      ? formatRouteLabel({
          product_type: "hotel",
          hotel_name: r.origin_label ?? undefined,
          location_label: r.destination_label ?? undefined,
        })
      : r.origin_label && r.destination_label
        ? `${r.origin_label} → ${r.destination_label}`
        : snapshot
          ? formatRouteLabel(snapshot)
          : r.subtitle || "—";

  const lastSeenIso = r.last_seen_at.toISOString();

  return {
    id: r.id,
    user_id: r.user_id,
    user_name: `${r.user.first_name} ${r.user.last_name}`.trim() || "—",
    user_email: email || "—",
    user_phone: phone,
    product_type: r.product_type,
    product_ref: r.product_ref,
    funnel_stage: r.funnel_stage,
    title: r.title,
    subtitle: r.subtitle,
    price_amount: r.price_amount,
    price_currency: r.price_currency,
    origin_label: r.origin_label,
    destination_label: r.destination_label,
    start_date: r.start_date,
    end_date: r.end_date,
    travelers_summary: r.travelers_summary,
    trip_type: r.trip_type,
    route_label: routeLabel,
    dates_label: formatDatesLabel(r.start_date, r.end_date),
    first_seen_at: r.first_seen_at.toISOString(),
    last_seen_at: lastSeenIso,
    last_event_type: r.last_event_type,
    converted_booking_id: r.converted_booking_id,
    is_abandoned: isAbandonedInterest(r),
    contact_incomplete: !email || !phone || !r.user.phone_verified_at,
    hours_since_last_seen: hoursSince(lastSeenIso),
    event_count: extras?.event_count ?? 0,
    trip_unit_key: r.trip_unit_key,
  };
}

function buildFunnelSteps(
  currentStage: string,
  events: Array<{ funnel_stage: string; created_at: Date }>,
): AdminJourneyInterestDetail["funnel_steps"] {
  const stageTimes = new Map<string, string>();
  for (const ev of events) {
    if (!stageTimes.has(ev.funnel_stage)) {
      stageTimes.set(ev.funnel_stage, ev.created_at.toISOString());
    }
  }

  const currentIdx = FUNNEL_STEP_ORDER.indexOf(currentStage as FunnelStage);

  return FUNNEL_STEP_ORDER.map((stage, idx) => ({
    stage,
    label: stage.replace(/_/g, " "),
    reached: currentIdx >= idx || stageTimes.has(stage),
    current: currentStage === stage,
    at: stageTimes.get(stage) ?? null,
  }));
}

export async function listAdminJourneyInterests(input: {
  authz: AuthzContext | null;
  query: InterestsQuery;
}): Promise<{ items: AdminJourneyInterestRow[]; total: number; page: number; limit: number }> {
  assertPermission(input.authz, "admin.journey:read");

  const { page, limit, stage, product_type, abandoned_only, from, to, sort, order } = input.query;
  const skip = (page - 1) * limit;

  const checkoutCutoff = new Date(Date.now() - JOURNEY_ABANDON_AFTER_CHECKOUT_HOURS * 60 * 60 * 1000);
  const viewCutoff = new Date(Date.now() - JOURNEY_ABANDON_AFTER_VIEW_HOURS * 60 * 60 * 1000);

  const where: Prisma.CustomerProductInterestWhereInput = {
    ...(stage ? { funnel_stage: stage } : {}),
    ...(product_type ? { product_type } : {}),
    ...(from || to
      ? {
          last_seen_at: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
    ...(abandoned_only
      ? {
          converted_booking_id: null,
          funnel_stage: {
            notIn: ["booking_confirmed", "booking_changed", "booking_cancelled"],
          },
          OR: [
            {
              funnel_stage: { in: ["checkout_started", "payment_prepared"] },
              last_seen_at: { lt: checkoutCutoff },
            },
            {
              funnel_stage: { in: ["viewed", "checkout_clicked"] },
              last_seen_at: { lt: viewCutoff },
            },
          ],
        }
      : {}),
  };

  const [rows, totalRaw] = await Promise.all([
    prisma.customerProductInterest.findMany({
      where,
      orderBy: { [sort]: order },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
            phone_country_code: true,
            phone_verified_at: true,
          },
        },
      },
    }),
    prisma.customerProductInterest.count({ where }),
  ]);

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const emailByUserId = await emailsForUserIds(userIds);

  const eventCounts =
    rows.length > 0
      ? await prisma.customerJourneyEvent.groupBy({
          by: ["trip_unit_key"],
          where: {
            user_id: { in: userIds },
            trip_unit_key: { in: rows.map((r) => r.trip_unit_key) },
          },
          _count: { _all: true },
        })
      : [];
  const countByTripKey = new Map(eventCounts.map((e) => [e.trip_unit_key ?? "", e._count._all]));

  const items = rows.map((r) =>
    mapInterestRow(r, emailByUserId.get(r.user_id) ?? "", {
      event_count: countByTripKey.get(r.trip_unit_key) ?? 0,
    }),
  );

  return { items, total: totalRaw, page, limit };
}

export async function getAdminJourneyInterestDetail(input: {
  authz: AuthzContext | null;
  interestId: string;
}): Promise<AdminJourneyInterestDetail> {
  assertPermission(input.authz, "admin.journey:read");

  const row = await prisma.customerProductInterest.findUnique({
    where: { id: input.interestId },
    include: {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          phone: true,
          phone_country_code: true,
          phone_verified_at: true,
          currency_id: true,
          country_code: true,
        },
      },
    },
  });

  if (!row) {
    throw new AppError(404, "Journey intent not found.", "NOT_FOUND");
  }

  const [emailMap, events] = await Promise.all([
    emailsForUserIds([row.user_id]),
    prisma.customerJourneyEvent.findMany({
      where: {
        user_id: row.user_id,
        OR: [
          { trip_unit_key: row.trip_unit_key },
          {
            product_type: row.product_type,
            product_ref: row.product_ref,
            trip_unit_key: null,
          },
        ],
      },
      orderBy: { created_at: "asc" },
    }),
  ]);

  const relatedProductRefs = [...new Set(events.map((e) => e.product_ref))];
  const email = emailMap.get(row.user_id) ?? "";
  const phone = formatPhone(row.user.phone, row.user.phone_country_code);
  const snapshot = parseTripSnapshot(row.search_context);
  const interest = mapInterestRow(row, email, { event_count: events.length });

  return {
    interest,
    snapshot,
    outreach_summary: formatOutreachSummary(snapshot, row.funnel_stage),
    detail_path: snapshot?.detail_path ?? null,
    related_product_refs: relatedProductRefs,
    funnel_steps: buildFunnelSteps(row.funnel_stage, events),
    events: events.map((e) => ({
      id: e.id,
      event_type: e.event_type,
      product_type: e.product_type,
      product_ref: e.product_ref,
      funnel_stage: e.funnel_stage,
      properties: e.properties,
      created_at: e.created_at.toISOString(),
    })),
    user: {
      id: row.user.id,
      name: `${row.user.first_name} ${row.user.last_name}`.trim() || "—",
      email,
      phone,
      currency_id: row.user.currency_id,
      country_code: row.user.country_code,
    },
  };
}

export async function getAdminUserJourneyTimeline(input: {
  authz: AuthzContext | null;
  userId: string;
}): Promise<{
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  interests: AdminJourneyInterestRow[];
  events: AdminJourneyTimelineEvent[];
}> {
  assertPermission(input.authz, "admin.journey:read");

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      phone: true,
      phone_country_code: true,
      phone_verified_at: true,
    },
  });
  if (!user) {
    throw new AppError(404, "User not found.", "NOT_FOUND");
  }

  const [interests, events, emailMap] = await Promise.all([
    prisma.customerProductInterest.findMany({
      where: { user_id: input.userId },
      orderBy: { last_seen_at: "desc" },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
            phone_country_code: true,
            phone_verified_at: true,
          },
        },
      },
    }),
    prisma.customerJourneyEvent.findMany({
      where: { user_id: input.userId },
      orderBy: { created_at: "asc" },
    }),
    emailsForUserIds([input.userId]),
  ]);

  const email = emailMap.get(input.userId) ?? "";

  return {
    user: {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim() || "—",
      email,
      phone: formatPhone(user.phone, user.phone_country_code),
    },
    interests: interests.map((r) => mapInterestRow(r, email)),
    events: events.map((e) => ({
      id: e.id,
      event_type: e.event_type,
      product_type: e.product_type,
      product_ref: e.product_ref,
      funnel_stage: e.funnel_stage,
      properties: e.properties,
      created_at: e.created_at.toISOString(),
    })),
  };
}
