import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type {
  SeatMapCabinDTO,
  SeatMapDTO,
  SeatMapElementDTO,
  SeatMapRowDTO,
  SeatMapSeatServiceDTO,
} from "@/lib/duffel/dto/seat-map.dto";

export type WindowSeatSide = "left" | "right";

export type SeatPositionKind = WindowSeatSide | "aisle" | "middle" | "unknown";

export type WindowSeatOption = {
  segmentId: string;
  segmentLabel: string;
  cabinClass: string | null;
  designator: string;
  side: WindowSeatSide;
  serviceId: string;
  amount: string;
  currency: string;
  disclosures: string[];
};

export type SelectedSeatSummary = {
  segmentId: string;
  segmentLabel: string;
  designator: string;
  side: SeatPositionKind;
  amount: string;
  currency: string;
  disclosures: string[];
};

function seatsInRow(row: SeatMapRowDTO): SeatMapElementDTO[] {
  const out: SeatMapElementDTO[] = [];
  for (const sec of row.sections) {
    for (const el of sec.elements) {
      if (el.type === "seat") out.push(el);
    }
  }
  return out;
}

/** Duffel preserves window letters at section edges — first/last seat in a row are windows. */
export function getSeatPositionInRow(row: SeatMapRowDTO, seat: SeatMapElementDTO): SeatPositionKind {
  const seats = seatsInRow(row);
  if (seats.length === 0) return "unknown";
  const idx = seats.indexOf(seat);
  if (idx < 0) return "unknown";
  if (idx === 0) return "left";
  if (idx === seats.length - 1) return "right";
  if (idx === 1 || idx === seats.length - 2) return "aisle";
  return "middle";
}

export function isWindowSeat(row: SeatMapRowDTO, seat: SeatMapElementDTO): WindowSeatSide | null {
  const pos = getSeatPositionInRow(row, seat);
  if (pos === "left" || pos === "right") return pos;
  return null;
}

export function segmentLabel(offer: FlightOfferDTO, segmentId: string | null): string {
  if (!segmentId) return "Flight";
  for (const sl of offer.slices) {
    const seg = sl.segments.find((x) => x.id === segmentId);
    if (seg) return `${seg.origin_iata} → ${seg.destination_iata}`;
  }
  return "Segment";
}

function serviceForPassenger(
  el: SeatMapElementDTO,
  passengerId: string,
): SeatMapSeatServiceDTO | null {
  return el.services.find((s) => s.passenger_id === passengerId) ?? null;
}

export function listAvailableWindowSeats(
  seatMaps: SeatMapDTO[],
  offer: FlightOfferDTO,
  passengerId: string,
): WindowSeatOption[] {
  const out: WindowSeatOption[] = [];
  for (const sm of seatMaps) {
    const segmentId = sm.segment_id ?? sm.id;
    const label = segmentLabel(offer, sm.segment_id);
    for (const cab of sm.cabins) {
      for (const row of cab.rows) {
        for (const sec of row.sections) {
          for (const el of sec.elements) {
            if (el.type !== "seat") continue;
            const side = isWindowSeat(row, el);
            if (!side) continue;
            const svc = serviceForPassenger(el, passengerId);
            if (!svc || !el.designator) continue;
            out.push({
              segmentId,
              segmentLabel: label,
              cabinClass: cab.cabin_class,
              designator: el.designator,
              side,
              serviceId: svc.id,
              amount: svc.total_amount,
              currency: svc.total_currency,
              disclosures: el.disclosures,
            });
          }
        }
      }
    }
  }
  return out.sort((a, b) => {
    const seg = a.segmentLabel.localeCompare(b.segmentLabel);
    if (seg !== 0) return seg;
    return a.designator.localeCompare(b.designator, undefined, { numeric: true });
  });
}

export function findSeatElementByServiceId(
  seatMaps: SeatMapDTO[] | null,
  serviceId: string,
): { element: SeatMapElementDTO; row: SeatMapRowDTO; segmentId: string } | null {
  if (!seatMaps?.length) return null;
  for (const sm of seatMaps) {
    const segmentId = sm.segment_id ?? sm.id;
    for (const cab of sm.cabins) {
      for (const row of cab.rows) {
        for (const sec of row.sections) {
          for (const el of sec.elements) {
            if (el.type !== "seat") continue;
            if (el.services.some((s) => s.id === serviceId)) {
              return { element: el, row, segmentId };
            }
          }
        }
      }
    }
  }
  return null;
}

export function buildSelectedSeatSummaries(
  seatMaps: SeatMapDTO[] | null,
  offer: FlightOfferDTO,
  seatSelections: Record<string, string>,
  passengerId: string,
): SelectedSeatSummary[] {
  const out: SelectedSeatSummary[] = [];
  for (const [key, serviceId] of Object.entries(seatSelections)) {
    if (!serviceId) continue;
    const [segmentId, paxId] = key.split("::");
    if (paxId !== passengerId) continue;
    const hit = findSeatElementByServiceId(seatMaps, serviceId);
    if (!hit) continue;
    const svc = hit.element.services.find((s) => s.id === serviceId);
    if (!svc) continue;
    out.push({
      segmentId: segmentId ?? hit.segmentId,
      segmentLabel: segmentLabel(offer, segmentId ?? hit.segmentId),
      designator: hit.element.designator ?? "—",
      side: getSeatPositionInRow(hit.row, hit.element),
      amount: svc.total_amount,
      currency: svc.total_currency,
      disclosures: hit.element.disclosures,
    });
  }
  return out;
}

export function countAvailableWindowSeats(
  seatMaps: SeatMapDTO[] | null,
  passengerId: string,
): number {
  if (!seatMaps?.length) return 0;
  let n = 0;
  for (const sm of seatMaps) {
    for (const cab of sm.cabins) {
      for (const row of cab.rows) {
        for (const sec of row.sections) {
          for (const el of sec.elements) {
            if (el.type !== "seat") continue;
            if (!isWindowSeat(row, el)) continue;
            if (serviceForPassenger(el, passengerId)) n += 1;
          }
        }
      }
    }
  }
  return n;
}

export function cabinHasSeatRows(cabin: SeatMapCabinDTO): boolean {
  return cabin.rows.some((row) => seatsInRow(row).length > 0);
}
