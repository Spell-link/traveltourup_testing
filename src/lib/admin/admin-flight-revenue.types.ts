import type { FlightRevenueBreakdown, ReconciliationLine } from "@/lib/payments/flight-revenue-breakdown";

export type AdminFlightBookingRevenueRow = {
  id: string;
  booking_ref_no: string;
  status: string;
  payment_status: string;
  airline_total: string;
  currency: string;
  duffel_order_id: string | null;
  airline_pnr: string | null;
  user_name: string | null;
  created_at: string;
  revenue: FlightRevenueBreakdown | null;
};

export type AdminFlightBookingRevenueListResult = {
  items: AdminFlightBookingRevenueRow[];
  total: number;
  page: number;
  limit: number;
  summary: AdminFlightRevenueSummary | null;
};

export type AdminFlightRevenueSummary = {
  customer_revenue: string;
  duffel_cost: string;
  commission: string;
  duffel_fees: string;
  net_commission: string;
  currency: string;
  booking_count: number;
  multi_currency_note?: string;
};

export type AdminFlightRevenueTimeSeriesPoint = {
  date: string;
  customer_revenue: number;
  duffel_cost: number;
  commission: number;
  duffel_fee: number;
};

export type AdminFlightBookingRevenueDetail = {
  revenue: FlightRevenueBreakdown | null;
  reconciliation: ReconciliationLine[];
  pit: {
    duffel_intent_id: string;
    services_subtotal_amount: string | null;
    duffel_reported_fees_amount: string | null;
    duffel_reported_net_amount: string | null;
  } | null;
};
