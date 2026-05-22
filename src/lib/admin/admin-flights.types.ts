import type { FlightRevenueBreakdown, ReconciliationLine } from "@/lib/payments/flight-revenue-breakdown";

export type AdminFlightBookingRow = {
  id: string;
  booking_ref_no: string;
  status: string;
  payment_status: string;
  total_amount: string;
  currency: string;
  duffel_order_id: string | null;
  airline_pnr: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminFlightBookingListResult = {
  items: AdminFlightBookingRow[];
  total: number;
  page: number;
  limit: number;
};

export type AdminFlightSagaDetail = {
  booking: AdminFlightBookingRow & {
    offer_id: string | null;
    live_mode: boolean | null;
    offer_expires_at: string | null;
  };
  payment_intents: Array<{
    id: string;
    duffel_intent_id: string;
    status: string;
    charge_amount: string;
    charge_currency: string;
    offer_amount: string;
    offer_currency: string;
    markup_amount: string;
    booking_id: string | null;
    order_failure_at: string | null;
    order_failure_code: string | null;
    order_failure_refund_id: string | null;
    order_failure_refund_status: string | null;
    created_at: string;
    updated_at: string;
  }>;
  cancellations: Array<{
    id: string;
    duffel_cancellation_id: string;
    duffel_order_id: string;
    status: string;
    refund_amount: string | null;
    refund_currency: string | null;
    refund_to: string | null;
    quote_expires_at: string | null;
    confirmed_at: string | null;
    created_at: string;
  }>;
  refund_attempts: Array<{
    id: string;
    duffel_refund_id: string | null;
    status: string;
    amount: string | null;
    currency: string | null;
    error_code: string | null;
    flight_payment_intent_record_id: string | null;
    flight_order_cancellation_id: string;
    created_at: string;
    updated_at: string;
  }>;
  financial_events: Array<{
    id: string;
    type: string;
    amount: string | null;
    currency: string | null;
    payload: unknown;
    created_at: string;
  }>;
  revenue: FlightRevenueBreakdown | null;
  reconciliation: ReconciliationLine[];
  pit_revenue: {
    duffel_intent_id: string;
    services_subtotal_amount: string | null;
    duffel_reported_fees_amount: string | null;
    duffel_reported_net_amount: string | null;
  } | null;
};

export type AdminWebhookRow = {
  id: string;
  event_id: string;
  type: string;
  received_at: string;
  processed_at: string | null;
  error: string | null;
  payload: unknown;
};
