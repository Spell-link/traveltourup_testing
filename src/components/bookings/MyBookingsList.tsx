export { MyBookingsTable, type MyBookingsTableProps } from "@/components/bookings/my-bookings-table";

import { MyBookingsTable, type MyBookingsTableProps } from "@/components/bookings/my-bookings-table";

/** Alias for `MyBookingsTable` — preserves existing import paths. */
export function MyBookingsList(props: MyBookingsTableProps) {
  return <MyBookingsTable {...props} />;
}
