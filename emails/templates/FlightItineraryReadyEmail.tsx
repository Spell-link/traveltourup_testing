import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

export type FlightItineraryReadyEmailProps = {
  bookingReference: string;
  guestName: string;
  manageUrl: string;
};

export default function FlightItineraryReadyEmail({
  bookingReference,
  guestName,
  manageUrl,
}: FlightItineraryReadyEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your flight itinerary PDF — {bookingReference}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-slate-100 font-sans">
          <Container className="mx-auto max-w-[600px] rounded-2xl bg-white px-8 py-10 shadow-sm">
            <Section>
              <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                TravelTourUp
              </Text>
              <Heading className="m-0 text-2xl font-bold text-slate-900">Your itinerary is ready</Heading>
              <Text className="mt-3 text-base leading-relaxed text-slate-600">
                Hi {guestName}, your printable flight itinerary (PDF) is attached. It includes your record locator
                (PNR), travelers, and segment details for check-in and support.
              </Text>
            </Section>
            <Section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
              <Text className="m-0 text-xs font-semibold uppercase text-slate-500">Reference</Text>
              <Text className="mt-1 text-lg font-bold text-slate-900">{bookingReference}</Text>
            </Section>
            <Section className="mt-6 text-sm text-slate-600">
              <Text className="m-0 leading-relaxed">
                This PDF is a booking confirmation and itinerary — not a boarding pass. Check in on the
                airline&apos;s website or app with your PNR. You can download the document again anytime from your
                account.
              </Text>
            </Section>
            <Section className="mt-8 text-center">
              <Link
                href={manageUrl}
                className="inline-block rounded-full bg-sky-600 px-8 py-3 text-sm font-semibold text-white no-underline"
              >
                View booking
              </Link>
            </Section>
            <Text className="mt-8 text-center text-xs text-slate-500">
              Questions?{" "}
              <Link href="mailto:support@traveltourup.com" className="text-sky-600 underline">
                support@traveltourup.com
              </Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
