import type { ReactNode } from "react";
import {
  Body,
  Container,
  Column,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

export type BookingConfirmationEmailProps = {
  bookingReference: string;
  guestName: string;
  destination: string;
  /** Human-readable date range or itinerary summary. */
  dates: string;
  /** Formatted total (e.g. "USD 1,240.00"). */
  total: string;
  /** Optional deep link to manage the booking in the app. */
  manageUrl?: string;
  productLabel?: string;
  airlineRecordLocator?: string;
  passengersSummary?: string;
  statusNote?: string;
  /** True when the itinerary PDF is attached to this email. */
  itineraryAttached?: boolean;
};

const INK = "#111827";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const PANEL = "#F9FAFB";

const SITE_ORIGIN =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL?.trim()) ||
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL?.trim()) ||
  "https://traveltourup.com";

const LOGO_SRC = `${SITE_ORIGIN.replace(/\/$/, "")}/logo.webp`;

function ticketNumberLines(
  passengersSummary: string | undefined,
  guestName: string,
  pnr: string,
): string[] {
  const names = passengersSummary
    ? passengersSummary
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [guestName];
  return names.map((name) => `${name}: ${pnr}`);
}

function SectionHeading({ children }: { children: string }) {
  return (
    <Text
      className="m-0 mb-2 mt-6 text-[13px] font-bold leading-tight"
      style={{ color: INK }}
    >
      {children}
    </Text>
  );
}

function PanelBox({ children }: { children: ReactNode }) {
  return (
    <Section
      className="mb-1 rounded-[10px] border border-solid px-4 py-3"
      style={{ borderColor: BORDER, backgroundColor: "#ffffff" }}
    >
      {children}
    </Section>
  );
}

export default function BookingConfirmationEmail({
  bookingReference,
  guestName,
  destination,
  dates,
  total,
  manageUrl,
  airlineRecordLocator,
  passengersSummary,
  statusNote,
  itineraryAttached,
}: BookingConfirmationEmailProps) {
  const ticketLines = airlineRecordLocator
    ? ticketNumberLines(passengersSummary, guestName, airlineRecordLocator)
    : [];

  return (
    <Html lang="en">
      <Preview>
        Booking confirmed — {destination} ({bookingReference})
      </Preview>
      <Tailwind>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Head>
        <Body
          className="mx-auto my-auto font-sans"
          style={{ backgroundColor: "#f3f4f6", margin: 0, padding: "24px 12px" }}
        >
          <Container
            className="mx-auto max-w-[600px] rounded-2xl bg-white px-8 py-10"
            style={{
              margin: "0 auto",
              maxWidth: "600px",
              width: "100%",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
            }}
          >
            {/* Brand header — matches itinerary PDF */}
            <Section className="mb-0">
              <Row>
                <Column className="align-middle" style={{ verticalAlign: "middle" }}>
                  <Img
                    src={LOGO_SRC}
                    width="140"
                    height="32"
                    alt="TravelTourUp"
                    className="block"
                    style={{ display: "block", maxHeight: "32px", width: "auto" }}
                  />
                </Column>
                <Column className="align-middle text-right" style={{ verticalAlign: "middle" }}>
                  <Text className="m-0 text-[11px] leading-snug" style={{ color: MUTED }}>
                    Booking reference
                  </Text>
                  <Text
                    className="m-0 mt-0.5 text-[18px] font-bold leading-tight tracking-tight"
                    style={{ color: INK }}
                  >
                    {bookingReference}
                  </Text>
                </Column>
              </Row>
              <Hr className="my-4 border-0 border-t border-solid" style={{ borderColor: BORDER }} />
            </Section>

            {statusNote ? (
              <Section
                className="mb-2 rounded-lg border border-solid px-4 py-3"
                style={{ borderColor: "#fde68a", backgroundColor: "#fffbeb" }}
              >
                <Text className="m-0 text-[12px] leading-relaxed" style={{ color: "#92400e" }}>
                  {statusNote}
                </Text>
              </Section>
            ) : null}

            <SectionHeading>Flight details</SectionHeading>
            <PanelBox>
              <Text className="m-0 text-[15px] font-bold leading-snug" style={{ color: INK }}>
                {destination}
              </Text>
              <Text
                className="m-0 mt-2 whitespace-pre-line text-[13px] leading-relaxed"
                style={{ color: MUTED }}
              >
                {dates}
              </Text>
            </PanelBox>

            {passengersSummary ? (
              <>
                <SectionHeading>Passengers</SectionHeading>
                <PanelBox>
                  <Text
                    className="m-0 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: MUTED }}
                  >
                    Travelers
                  </Text>
                  <Text className="m-0 mt-1 text-[14px] font-bold leading-snug" style={{ color: INK }}>
                    {passengersSummary}
                  </Text>
                </PanelBox>
              </>
            ) : null}

            {ticketLines.length > 0 ? (
              <>
                <SectionHeading>Ticket numbers</SectionHeading>
                <PanelBox>
                  {ticketLines.map((line) => (
                    <Text
                      key={line}
                      className="m-0 py-1 text-[14px] leading-snug"
                      style={{ color: INK }}
                    >
                      {line}
                    </Text>
                  ))}
                </PanelBox>
              </>
            ) : null}

            <Section
              className="mt-6 rounded-lg border border-solid px-4 py-3"
              style={{ borderColor: BORDER, backgroundColor: PANEL }}
            >
              <Text className="m-0 text-[11px] leading-snug" style={{ color: MUTED }}>
                Total
              </Text>
              <Text className="m-0 mt-0.5 text-[18px] font-bold leading-tight" style={{ color: INK }}>
                {total}
              </Text>
            </Section>

            <Section className="mt-8">
              <Text className="m-0 text-center text-[11px] leading-relaxed" style={{ color: MUTED }}>
                This email is your booking confirmation
                {itineraryAttached ? " — your printable itinerary PDF is attached" : ""}. It is not a
                boarding pass.
                {airlineRecordLocator ? (
                  <>
                    {" "}
                    Check in with airline record locator (PNR){" "}
                    <span style={{ color: INK, fontWeight: 600 }}>{airlineRecordLocator}</span>.
                  </>
                ) : null}
              </Text>
              {itineraryAttached ? (
                <Text className="m-0 mt-2 text-center text-[11px] leading-relaxed" style={{ color: MUTED }}>
                  You can download the same itinerary PDF anytime from{" "}
                  {manageUrl ? (
                    <Link href={manageUrl} style={{ color: INK, textDecoration: "underline" }}>
                      My bookings
                    </Link>
                  ) : (
                    "My bookings"
                  )}
                  .
                </Text>
              ) : null}
              {manageUrl ? (
                <Text className="m-0 mt-3 text-center text-[11px] leading-relaxed" style={{ color: MUTED }}>
                  <Link href={manageUrl} style={{ color: INK, textDecoration: "underline" }}>
                    View booking online
                  </Link>
                  {" · "}
                  <Link href="mailto:info@traveltourup.com" style={{ color: INK, textDecoration: "underline" }}>
                    info@traveltourup.com
                  </Link>
                  {" · "}
                  <Link href={SITE_ORIGIN} style={{ color: INK, textDecoration: "underline" }}>
                    traveltourup.com
                  </Link>
                </Text>
              ) : (
                <Text className="m-0 mt-3 text-center text-[11px] leading-relaxed" style={{ color: MUTED }}>
                  <Link href="mailto:info@traveltourup.com" style={{ color: INK, textDecoration: "underline" }}>
                    info@traveltourup.com
                  </Link>
                  {" · "}
                  <Link href={SITE_ORIGIN} style={{ color: INK, textDecoration: "underline" }}>
                    traveltourup.com
                  </Link>
                </Text>
              )}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
