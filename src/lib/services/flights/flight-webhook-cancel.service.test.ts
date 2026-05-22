import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockPrisma, mockSettle, mockSendEmail } = vi.hoisted(() => ({
  mockPrisma: {
    booking: { findUnique: vi.fn(), update: vi.fn() },
    flightOrderCancellation: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    flightPaymentRefundAttempt: { findUnique: vi.fn() },
  },
  mockSettle: vi.fn(),
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db/repositories/booking.repository", () => ({
  bookingRepository: { findById: vi.fn() },
}));
vi.mock("@/lib/services/flights/flight-refund.service", () => ({
  settleDuffelFlightRefundAfterCancellation: (...args: unknown[]) => mockSettle(...args),
}));
vi.mock("@/lib/services/flights/flight-emails.service", () => ({
  sendFlightCancellationEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { reconcileExternalOrderCancellation } from "@/lib/services/flights/flight-webhook-cancel.service";

describe("reconcileExternalOrderCancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.booking.findUnique.mockResolvedValue({
      status: "confirmed",
      payment_status: "paid",
      total_amount: { toString: () => "200.00" },
    });
    mockPrisma.booking.update.mockResolvedValue({});
    mockPrisma.flightOrderCancellation.findFirst.mockResolvedValue(null);
    mockPrisma.flightOrderCancellation.create.mockResolvedValue({ id: "oc_local_1" });
    mockPrisma.flightPaymentRefundAttempt.findUnique.mockResolvedValue(null);
    mockSettle.mockResolvedValue({ kind: "settled", payment_status: "refund_processing" });
    vi.mocked(bookingRepository.findById).mockResolvedValue({
      id: "bk_1",
      booking_ref_no: "TTU-1",
    } as never);
  });

  it("upserts cancellation and initiates card refund settlement once", async () => {
    await reconcileExternalOrderCancellation({
      flightBookingRowId: "fb_1",
      bookingId: "bk_1",
      duffelOrderId: "ord_1",
      order: {
        id: "ord_1",
        cancellation: {
          id: "ore_1",
          confirmed_at: "2026-05-19T12:00:00Z",
          refund_amount: "200.00",
          refund_currency: "USD",
          refund_to: "original_form_of_payment",
        },
      },
    });

    expect(mockPrisma.flightOrderCancellation.create).toHaveBeenCalledTimes(1);
    expect(mockSettle).toHaveBeenCalledTimes(1);
    expect(mockSettle).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "bk_1",
        flightOrderCancellationId: "oc_local_1",
        refundTo: "original_form_of_payment",
      }),
    );
  });

  it("skips settlement when attempt already pending", async () => {
    mockPrisma.flightOrderCancellation.findFirst.mockResolvedValue({
      id: "oc_existing",
      status: "confirmed",
    });
    mockPrisma.flightPaymentRefundAttempt.findUnique.mockResolvedValue({
      status: "pending",
      duffel_refund_id: "ref_1",
    });

    await reconcileExternalOrderCancellation({
      flightBookingRowId: "fb_1",
      bookingId: "bk_1",
      duffelOrderId: "ord_1",
      order: {
        id: "ord_1",
        cancellation: {
          id: "ore_1",
          confirmed_at: "2026-05-19T12:00:00Z",
          refund_to: "original_form_of_payment",
        },
      },
    });

    expect(mockSettle).not.toHaveBeenCalled();
  });
});
