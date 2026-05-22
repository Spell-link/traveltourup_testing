import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    flightOrderChange: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    flightBooking: {
      update: vi.fn(),
    },
    booking: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/repositories/booking.repository", () => ({
  bookingRepository: { findById: vi.fn() },
}));

vi.mock("@/lib/db/repositories/booking-financial-event.repository", () => ({
  bookingFinancialEventRepository: { record: vi.fn() },
}));

vi.mock("@/lib/db/repositories/flight-payment-intent.repository", () => ({
  flightPaymentIntentRepository: {
    findByDuffelIntentId: vi.fn(),
    findFirstByBookingId: vi.fn(),
    create: vi.fn(),
    linkBooking: vi.fn(),
    updateStatusByDuffelId: vi.fn(),
  },
}));

vi.mock("@/lib/duffel/order-changes", () => ({
  createOrderChange: vi.fn(),
  confirmOrderChange: vi.fn(),
  createOrderChangeRequest: vi.fn(),
  getOrderChange: vi.fn(),
}));

vi.mock("@/lib/duffel/orders", () => ({
  getDuffelOrder: vi.fn(),
}));

vi.mock("@/lib/duffel/payment-intents", () => ({
  confirmDuffelPaymentIntent: vi.fn(),
  createDuffelPaymentIntent: vi.fn(),
  getDuffelPaymentIntent: vi.fn(),
}));

vi.mock("@/lib/duffel/refunds", () => ({
  createDuffelPaymentRefund: vi.fn(),
}));

vi.mock("@/lib/services/flights/flight-payment-capture.core", () => ({
  captureDuffelPaymentForInstantBooking: vi.fn(),
  FlightCaptureError: class FlightCaptureError extends Error {},
}));

vi.mock("@/lib/services/flights/flight-emails.service", () => ({
  sendFlightOrderChangeEmailSafe: vi.fn(),
}));

vi.mock("@/lib/services/flights/flight-order-change-auth", () => ({
  assertCanChangeFlightBooking: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { flightPaymentIntentRepository } from "@/lib/db/repositories/flight-payment-intent.repository";
import {
  confirmOrderChange,
  createOrderChange,
  getOrderChange,
} from "@/lib/duffel/order-changes";
import { createDuffelPaymentIntent } from "@/lib/duffel/payment-intents";
import { getDuffelOrder } from "@/lib/duffel/orders";
import { captureDuffelPaymentForInstantBooking } from "@/lib/services/flights/flight-payment-capture.core";
import {
  confirmOrderChangeForBooking,
  createOrderChangePaymentIntentForBooking,
} from "@/lib/services/flights/flight-order-change.service";

const bookingRow = {
  id: "bk_1",
  user_id: "u1",
  status: "confirmed",
  type: "flight",
  currency: "USD",
  booking_ref_no: "TTU-1",
  guest_data: { email: "a@b.com" },
  flightBooking: {
    id: "fb_1",
    duffel_order_id: "ord_1",
    order_raw: { data: { slices: [] } },
  },
};

const testAuthz = {
  userId: "u1",
  roleIds: [],
  primaryRoleId: null,
  permissions: new Set(["bookings:cancel_own"]),
};

describe("confirmOrderChangeForBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bookingRepository.findById).mockResolvedValue(bookingRow as never);
    vi.mocked(prisma.flightOrderChange.findFirst).mockResolvedValue({
      id: "loc_1",
      status: "quoted",
      quote_expires_at: new Date(Date.now() + 60_000),
      duffel_order_change_id: null,
      duffel_order_change_request_id: "ocrq_1",
      flight_payment_intent_record_id: null,
      raw: {},
    } as never);
    vi.mocked(createOrderChange).mockResolvedValue({
      data: {
        id: "ocr_1",
        change_total_amount: "0.00",
        change_total_currency: "USD",
        confirmed_at: null,
        refund_to: null,
      },
    });
    vi.mocked(getOrderChange).mockResolvedValue({
      data: {
        id: "ocr_1",
        change_total_amount: "0.00",
        change_total_currency: "USD",
        confirmed_at: "2026-05-19T12:00:00Z",
        refund_to: null,
      },
    });
    vi.mocked(confirmOrderChange).mockResolvedValue({});
    vi.mocked(getDuffelOrder).mockResolvedValue({ data: { id: "ord_1" } });
    vi.mocked(prisma.flightOrderChange.update).mockResolvedValue({} as never);
    vi.mocked(prisma.flightBooking.update).mockResolvedValue({} as never);
    vi.mocked(prisma.booking.update).mockResolvedValue({} as never);
  });

  it("confirms free changes without payment", async () => {
    const result = await confirmOrderChangeForBooking({
      authz: testAuthz,
      userId: "u1",
      bookingId: "bk_1",
      orderChangeId: "loc_1",
      body: { order_change_offer_id: "oco_1" },
    });
    expect(result.status).toBe("confirmed");
    expect(result.needs_payment).toBe(false);
    expect(confirmOrderChange).toHaveBeenCalledWith("ocr_1");
    expect(captureDuffelPaymentForInstantBooking).not.toHaveBeenCalled();
  });

  it("updates booking total from offer new_total_amount after confirm", async () => {
    vi.mocked(prisma.flightOrderChange.findFirst).mockResolvedValue({
      id: "loc_1",
      status: "quoted",
      quote_expires_at: new Date(Date.now() + 60_000),
      duffel_order_change_id: "ocr_1",
      duffel_order_change_request_id: "ocrq_1",
      flight_payment_intent_record_id: null,
      raw: {
        order_change_offers: [
          {
            id: "oco_1",
            new_total_amount: "472.17",
            new_total_currency: "USD",
          },
        ],
      },
    } as never);
    vi.mocked(getDuffelOrder).mockResolvedValue({
      data: { id: "ord_1", total_amount: "347.17", total_currency: "USD" },
    });

    await confirmOrderChangeForBooking({
      authz: testAuthz,
      userId: "u1",
      bookingId: "bk_1",
      orderChangeId: "loc_1",
      body: { order_change_offer_id: "oco_1" },
    });

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bk_1" },
        data: expect.objectContaining({
          total_amount: expect.anything(),
          currency: "USD",
        }),
      }),
    );
    const bookingUpdate = vi.mocked(prisma.booking.update).mock.calls.at(-1)?.[0];
    expect(String(bookingUpdate?.data?.total_amount)).toContain("472.17");
  });

  it("requires payment_intent_id when change_total > 0", async () => {
    vi.mocked(createOrderChange).mockResolvedValue({
      data: {
        id: "ocr_paid",
        change_total_amount: "50.00",
        change_total_currency: "USD",
        confirmed_at: null,
        refund_to: null,
      },
    });
    vi.mocked(getOrderChange).mockResolvedValue({
      data: {
        id: "ocr_paid",
        change_total_amount: "50.00",
        change_total_currency: "USD",
        confirmed_at: null,
        refund_to: null,
      },
    });

    await expect(
      confirmOrderChangeForBooking({
        authz: testAuthz,
        userId: "u1",
        bookingId: "bk_1",
        orderChangeId: "loc_1",
        body: { order_change_offer_id: "oco_1" },
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
  });

  it("captures payment and confirms with balance for paid changes", async () => {
    vi.mocked(prisma.flightOrderChange.findFirst).mockResolvedValue({
      id: "loc_1",
      status: "pending_payment",
      quote_expires_at: new Date(Date.now() + 60_000),
      duffel_order_change_id: "ocr_paid",
      duffel_order_change_request_id: "ocrq_1",
      flight_payment_intent_record_id: "pit_row_1",
      raw: {},
    } as never);
    vi.mocked(getOrderChange).mockResolvedValue({
      data: {
        id: "ocr_paid",
        change_total_amount: "50.00",
        change_total_currency: "USD",
        confirmed_at: null,
        refund_to: null,
      },
    });
    vi.mocked(flightPaymentIntentRepository.findByDuffelIntentId).mockResolvedValue({
      duffel_intent_id: "pit_1",
      booking_id: "bk_1",
      status: "requires_capture",
    } as never);
    vi.mocked(captureDuffelPaymentForInstantBooking).mockResolvedValue({
      status: "succeeded",
      confirmed_at: "2026-05-19T12:00:00Z",
      called_confirm: true,
      poll_attempts: 0,
    });
    vi.mocked(getOrderChange)
      .mockResolvedValueOnce({
        data: {
          id: "ocr_paid",
          change_total_amount: "50.00",
          change_total_currency: "USD",
          confirmed_at: null,
          refund_to: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: "ocr_paid",
          change_total_amount: "50.00",
          change_total_currency: "USD",
          confirmed_at: "2026-05-19T12:00:00Z",
          refund_to: null,
        },
      });

    const result = await confirmOrderChangeForBooking({
      authz: testAuthz,
      userId: "u1",
      bookingId: "bk_1",
      orderChangeId: "loc_1",
      body: { order_change_offer_id: "oco_1", payment_intent_id: "pit_1" },
    });

    expect(result.needs_payment).toBe(true);
    expect(captureDuffelPaymentForInstantBooking).toHaveBeenCalled();
    expect(confirmOrderChange).toHaveBeenCalledWith("ocr_paid", {
      type: "balance",
      amount: "50.00",
      currency: "USD",
    });
  });
});

describe("createOrderChangePaymentIntentForBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bookingRepository.findById).mockResolvedValue(bookingRow as never);
    vi.mocked(prisma.flightOrderChange.findFirst).mockResolvedValue({
      id: "loc_1",
      status: "quoted",
      quote_expires_at: new Date(Date.now() + 60_000),
      duffel_order_change_id: null,
      duffel_order_change_request_id: "ocrq_1",
      flight_payment_intent_record_id: null,
      raw: {},
    } as never);
    vi.mocked(createOrderChange).mockResolvedValue({
      data: {
        id: "ocr_paid",
        change_total_amount: "125.00",
        change_total_currency: "USD",
        confirmed_at: null,
        refund_to: null,
      },
    });
    vi.mocked(createDuffelPaymentIntent).mockResolvedValue({
      id: "pit_new",
      live_mode: false,
      client_token: "ctok",
      status: "requires_payment_method",
      amount: "125.00",
      currency: "USD",
    });
    vi.mocked(flightPaymentIntentRepository.create).mockResolvedValue({
      id: "pit_row_1",
    } as never);
    vi.mocked(flightPaymentIntentRepository.linkBooking).mockResolvedValue({} as never);
    vi.mocked(prisma.flightOrderChange.update).mockResolvedValue({} as never);
    vi.mocked(prisma.flightOrderChange.updateMany).mockResolvedValue({ count: 0 });
  });

  it("sets status pending_payment when creating payment intent", async () => {
    const result = await createOrderChangePaymentIntentForBooking({
      authz: testAuthz,
      userId: "u1",
      bookingId: "bk_1",
      orderChangeId: "loc_1",
      body: { order_change_offer_id: "oco_1" },
    });

    expect(result.needs_payment).toBe(true);
    expect(result.payment_intent?.client_token).toBe("ctok");
    expect(prisma.flightOrderChange.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "loc_1" },
        data: expect.objectContaining({ status: "pending_payment" }),
      }),
    );
  });
});
