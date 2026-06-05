import type { StaysCancellationStep } from "@/lib/api/stays-dto";
import { accommodationName } from "@/lib/bookings/booking-summary";
import { summarizeCancellationPolicy } from "@/lib/stays/stay-cancellation-policy";

export type StaysBookingGuestDisplay = {
  givenName: string;
  familyName: string;
  fullName: string;
  bornOn: string | null;
};

/** Checkout payment row fields used for itemized billing (supplier + markup = charge). */
export type StaysCheckoutPaymentSnapshot = {
  supplier_amount: string;
  supplier_currency: string;
  markup_amount: string;
  charge_amount: string;
  charge_currency: string;
};

export type StaysBookingBillingDisplay = {
  supplierAmount: string | null;
  supplierCurrency: string | null;
  serviceFeeAmount: string | null;
  totalPaidAmount: string | null;
  totalPaidCurrency: string | null;
  dueAtAccommodationAmount: string | null;
  dueAtAccommodationCurrency: string | null;
  taxAmount: string | null;
  /** @deprecated Use supplierAmount — kept for callers still reading roomAmount */
  roomAmount: string | null;
  roomCurrency: string | null;
  /** @deprecated Use dueAtAccommodationAmount */
  feesAmount: string | null;
  /** Duffel stay total (supplier quote), not necessarily card charge */
  totalAmount: string;
  totalCurrency: string;
  customerChargeAmount: string | null;
  customerChargeCurrency: string | null;
};

export type StaysBookingDisplay = {
  bookingReference: string | null;
  duffelBookingId: string | null;
  status: string | null;
  confirmedAt: string | null;
  accommodationName: string;
  stars: number | null;
  photoUrl: string | null;
  addressLine: string | null;
  city: string | null;
  countryCode: string | null;
  roomName: string | null;
  boardType: string | null;
  mealPlanLabel: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  checkInAfterTime: string | null;
  checkOutBeforeTime: string | null;
  nights: number | null;
  roomsCount: number | null;
  guestsCount: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  guests: StaysBookingGuestDisplay[];
  billing: StaysBookingBillingDisplay;
  cancellationTimeline: StaysCancellationStep[];
  cancellationPolicySummary: string;
  specialRequests: string | null;
  loyaltyProgrammeAccountNumber: string | null;
  hotelPhone: string | null;
  hotelEmail: string | null;
  limitedDetails: boolean;
};

function readObj(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function readStr(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function readNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function unwrapData(raw: unknown): Record<string, unknown> | null {
  const r = readObj(raw);
  if (!r) return null;
  return readObj(r.data) ?? r;
}

function parseLocation(acc: Record<string, unknown>) {
  const loc = readObj(acc.location);
  const addr = loc ? readObj(loc.address) : null;
  return {
    lineOne: addr ? readStr(addr.line_one) : null,
    city: addr ? readStr(addr.city_name) ?? readStr(addr.city) : null,
    countryCode: addr ? readStr(addr.country_code) : null,
  };
}

function parseCheckInfo(acc: Record<string, unknown>) {
  const info = readObj(acc.check_in_information);
  return {
    checkInAfter: info ? readStr(info.check_in_after_time) : null,
    checkOutBefore: info ? readStr(info.check_out_before_time) : null,
  };
}

function parsePhoto(acc: Record<string, unknown>): string | null {
  const photos = acc.photos;
  if (!Array.isArray(photos) || photos.length === 0) return null;
  const first = readObj(photos[0]);
  return first ? readStr(first.url) : null;
}

function parseCancellationTimeline(
  rate: Record<string, unknown>,
  totalCurrency: string | null,
): StaysCancellationStep[] {
  const raw = rate.cancellation_timeline;
  if (!Array.isArray(raw)) return [];
  const out: StaysCancellationStep[] = [];
  for (const it of raw) {
    const o = readObj(it);
    if (!o) continue;
    const before = readStr(o.before);
    const refund = readStr(o.refund_amount);
    if (!before || !refund) continue;
    out.push({
      before,
      refund_amount: refund,
      currency: readStr(o.currency) ?? totalCurrency,
    });
  }
  return out;
}

function boardTypeLabel(boardType: string | null): string | null {
  if (!boardType) return null;
  const map: Record<string, string> = {
    room_only: "Room only, no meals",
    breakfast: "Breakfast included",
    half_board: "Half board",
    full_board: "Full board",
    all_inclusive: "All inclusive",
  };
  return map[boardType] ?? boardType.replace(/_/g, " ");
}

function nightsBetween(checkIn: string | null, checkOut: string | null): number | null {
  if (!checkIn || !checkOut) return null;
  const a = new Date(`${checkIn}T12:00:00`);
  const b = new Date(`${checkOut}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

function parseGuestsFromGuestData(guestData: unknown): StaysBookingGuestDisplay[] {
  if (!guestData || typeof guestData !== "object") return [];
  const guests = (guestData as { guests?: unknown }).guests;
  if (!Array.isArray(guests)) return [];
  return guests
    .map((g) => {
      const o = readObj(g);
      if (!o) return null;
      const given = readStr(o.given_name) ?? "";
      const family = readStr(o.family_name) ?? "";
      const fullName = [given, family].filter(Boolean).join(" ").trim();
      if (!fullName) return null;
      return {
        givenName: given,
        familyName: family,
        fullName,
        bornOn: readStr(o.born_on),
      };
    })
    .filter((g): g is StaysBookingGuestDisplay => g != null);
}

function firstRateFromAccommodation(acc: Record<string, unknown>): Record<string, unknown> | null {
  const rooms = acc.rooms;
  if (!Array.isArray(rooms) || rooms.length === 0) return null;
  const room = readObj(rooms[0]);
  if (!room) return null;
  const rates = room.rates;
  if (!Array.isArray(rates) || rates.length === 0) return null;
  return readObj(rates[0]);
}

function parseGuestDataFields(guestData: unknown) {
  if (!guestData || typeof guestData !== "object") {
    return {
      email: null as string | null,
      phone: null as string | null,
      checkIn: null as string | null,
      checkOut: null as string | null,
      customerCharge: null as { amount: string; currency: string } | null,
      accommodationSpecialRequests: null as string | null,
      loyaltyProgrammeAccountNumber: null as string | null,
    };
  }
  const g = guestData as Record<string, unknown>;
  const stay = readObj(g.stay);
  const charge = readObj(g.customer_charge);
  return {
    email: readStr(g.email),
    phone: readStr(g.phone_number),
    checkIn: stay ? readStr(stay.check_in) : null,
    checkOut: stay ? readStr(stay.check_out) : null,
    customerCharge:
      charge && readStr(charge.amount) && readStr(charge.currency)
        ? { amount: readStr(charge.amount)!, currency: readStr(charge.currency)! }
        : null,
    accommodationSpecialRequests: readStr(g.accommodation_special_requests),
    loyaltyProgrammeAccountNumber: readStr(g.loyalty_programme_account_number),
  };
}

function buildStaysBillingDisplay(input: {
  checkoutPayment: StaysCheckoutPaymentSnapshot | null | undefined;
  rate: Record<string, unknown> | null;
  staysData: Record<string, unknown> | null;
  totalAmount: string;
  totalCurrency: string;
  customerCharge: { amount: string; currency: string } | null;
}): StaysBookingBillingDisplay {
  const dueAtAccommodationAmount = input.staysData
    ? readStr(input.staysData.due_at_accommodation_amount)
    : null;
  const dueAtAccommodationCurrency =
    (input.staysData ? readStr(input.staysData.due_at_accommodation_currency) : null) ??
    input.totalCurrency;

  const cp = input.checkoutPayment;
  const supplierAmount = cp?.supplier_amount ?? (input.rate ? readStr(input.rate.total_amount) : null) ?? input.totalAmount;
  const supplierCurrency =
    cp?.supplier_currency ?? (input.rate ? readStr(input.rate.total_currency) : null) ?? input.totalCurrency;
  const serviceFeeAmount = cp?.markup_amount ?? null;

  const totalPaidAmount = cp?.charge_amount ?? input.customerCharge?.amount ?? input.totalAmount;
  const totalPaidCurrency =
    cp?.charge_currency ?? input.customerCharge?.currency ?? input.totalCurrency;

  const roomAmount = supplierAmount;
  const roomCurrency = supplierCurrency;

  return {
    supplierAmount,
    supplierCurrency,
    serviceFeeAmount,
    totalPaidAmount,
    totalPaidCurrency,
    dueAtAccommodationAmount,
    dueAtAccommodationCurrency,
    taxAmount: null,
    roomAmount,
    roomCurrency,
    feesAmount: dueAtAccommodationAmount,
    totalAmount: input.totalAmount,
    totalCurrency: input.totalCurrency,
    customerChargeAmount: totalPaidAmount,
    customerChargeCurrency: totalPaidCurrency,
  };
}

export function checkoutPaymentToSnapshot(row: {
  supplier_amount: { toString(): string } | string;
  supplier_currency: string;
  markup_amount: { toString(): string } | string;
  charge_amount: { toString(): string } | string;
  charge_currency: string;
}): StaysCheckoutPaymentSnapshot {
  return {
    supplier_amount:
      typeof row.supplier_amount === "string" ? row.supplier_amount : row.supplier_amount.toString(),
    supplier_currency: row.supplier_currency,
    markup_amount:
      typeof row.markup_amount === "string" ? row.markup_amount : row.markup_amount.toString(),
    charge_amount:
      typeof row.charge_amount === "string" ? row.charge_amount : row.charge_amount.toString(),
    charge_currency: row.charge_currency,
  };
}

export function parseStaysBookingDisplay(input: {
  staysRaw: unknown;
  accommodationSnapshot: unknown;
  guestData: unknown;
  bookingReference: string | null;
  duffelBookingId: string | null;
  totalAmount: string;
  totalCurrency: string;
  createdAt: string | Date | null;
  status: string;
  checkoutPayment?: StaysCheckoutPaymentSnapshot | null;
}): StaysBookingDisplay {
  const data = unwrapData(input.staysRaw);
  const snap = readObj(input.accommodationSnapshot) ?? readObj(data?.accommodation);
  const acc = snap ?? {};
  const guestFields = parseGuestDataFields(input.guestData);
  const guests = parseGuestsFromGuestData(input.guestData);

  const loc = parseLocation(acc);
  const checkInfo = parseCheckInfo(acc);
  const rate = firstRateFromAccommodation(acc);
  const room = Array.isArray(acc.rooms) ? readObj(acc.rooms[0]) : null;

  const checkInDate =
    readStr(data?.check_in_date) ?? guestFields.checkIn ?? readStr(data?.check_in) ?? null;
  const checkOutDate =
    readStr(data?.check_out_date) ?? guestFields.checkOut ?? readStr(data?.check_out) ?? null;

  const totalAmount =
    readStr(data?.total_amount) ?? (rate ? readStr(rate.total_amount) : null) ?? input.totalAmount;
  const totalCurrency =
    readStr(data?.total_currency) ?? (rate ? readStr(rate.total_currency) : null) ?? input.totalCurrency;

  const timeline = rate ? parseCancellationTimeline(rate, totalCurrency) : [];

  const billing = buildStaysBillingDisplay({
    checkoutPayment: input.checkoutPayment,
    rate,
    staysData: data,
    totalAmount,
    totalCurrency,
    customerCharge: guestFields.customerCharge,
  });

  const name = accommodationName(acc) ?? accommodationName(input.accommodationSnapshot) ?? "Hotel stay";

  let confirmedAt: string | null = null;
  if (input.createdAt) {
    try {
      confirmedAt =
        input.createdAt instanceof Date
          ? input.createdAt.toISOString()
          : new Date(input.createdAt).toISOString();
    } catch {
      confirmedAt = null;
    }
  }

  return {
    bookingReference: input.bookingReference ?? readStr(data?.reference),
    duffelBookingId: input.duffelBookingId ?? readStr(data?.id),
    status: readStr(data?.status) ?? input.status,
    confirmedAt,
    accommodationName: name,
    stars: readNum(acc.rating) ?? readNum(acc.rating_stars),
    photoUrl: parsePhoto(acc),
    addressLine: loc.lineOne,
    city: loc.city,
    countryCode: loc.countryCode,
    roomName: room ? readStr(room.name) : null,
    boardType: rate ? readStr(rate.board_type) : null,
    mealPlanLabel: boardTypeLabel(rate ? readStr(rate.board_type) : null),
    checkInDate,
    checkOutDate,
    checkInAfterTime: checkInfo.checkInAfter,
    checkOutBeforeTime: checkInfo.checkOutBefore,
    nights: nightsBetween(checkInDate, checkOutDate),
    roomsCount: readNum(data?.rooms) ?? 1,
    guestsCount: guests.length > 0 ? guests.length : null,
    contactEmail: guestFields.email,
    contactPhone: guestFields.phone,
    guests,
    billing,
    cancellationTimeline: timeline,
    cancellationPolicySummary: summarizeCancellationPolicy(timeline, totalAmount, totalCurrency),
    specialRequests:
      guestFields.accommodationSpecialRequests ??
      readStr(data?.accommodation_special_requests) ??
      readStr(data?.stay_special_requests) ??
      null,
    loyaltyProgrammeAccountNumber:
      guestFields.loyaltyProgrammeAccountNumber ??
      readStr(data?.loyalty_programme_account_number) ??
      null,
    hotelPhone: readStr(acc.phone_number),
    hotelEmail: readStr(acc.email),
    limitedDetails: !input.staysRaw && !input.accommodationSnapshot,
  };
}

export function formatStayDateLong(ymd: string | null | undefined, locale = "en-US"): string {
  if (!ymd) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${ymd}T12:00:00`));
  } catch {
    return ymd;
  }
}
