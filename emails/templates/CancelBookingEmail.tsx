import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

export type CancelBookingEmailProps = {
  bookingReference: string;
  guestName: string;
  /** Optional short note (e.g. security). */
  summary?: string;
  manageUrl?: string;
  airlineRecordLocator?: string;
  refundAmountDisplay?: string;
  refundTo?: string;
};

function refundHeadline(refundTo: string | undefined): string {
  if (refundTo === "airline_credits") return "Airline travel credit";
  return "Refund to your original payment method";
}

export default function CancelBookingEmail({
  bookingReference,
  guestName,
  summary,
  manageUrl,
  airlineRecordLocator,
  refundAmountDisplay,
  refundTo,
}: CancelBookingEmailProps) {
  const isCredits = refundTo === "airline_credits";
  const hasRefundLine = Boolean(refundAmountDisplay?.trim());

  return (
    <Html lang="en">
      <Head />
      <Preview>Cancellation confirmed — {bookingReference}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-slate-100 font-sans">
          <Container className="mx-auto max-w-[600px] rounded-2xl bg-white px-8 py-10 shadow-sm">
            <Section>
              <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                TravelTourUp
              </Text>
              <Heading className="m-0 text-2xl font-bold text-slate-900">Cancellation confirmed</Heading>
              <Text className="mt-3 text-base leading-relaxed text-slate-600">
                Hi {guestName}, your flight booking has been cancelled with the airline, and your TravelTourUp record
                is updated.
              </Text>
            </Section>

            <Section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
              <Text className="m-0 text-xs font-semibold uppercase text-slate-500">Your references</Text>
              <Text className="mt-1 text-lg font-bold text-slate-900">{bookingReference}</Text>
              {airlineRecordLocator ? (
                <Text className="mt-2 text-sm text-slate-600">
                  Airline record locator (PNR):{" "}
                  <span className="font-semibold text-slate-900">{airlineRecordLocator}</span>
                </Text>
              ) : null}
            </Section>

            <Section className="mt-6 rounded-xl border border-sky-100 bg-sky-50/80 p-6">
              <Text className="m-0 text-xs font-semibold uppercase text-sky-800">{refundHeadline(refundTo)}</Text>
              {hasRefundLine ? (
                <Text className="mt-2 text-xl font-bold text-slate-900">{refundAmountDisplay}</Text>
              ) : (
                <Text className="mt-2 text-sm leading-relaxed text-slate-700">
                  Refund or credit details from the airline will appear in your account summary and payment timeline as
                  soon as they are available.
                </Text>
              )}
              <Text className="mt-4 text-sm font-semibold text-slate-900">What happens next</Text>
              <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-slate-700">
                {isCredits ? (
                  <>
                    <li>
                      The airline is issuing travel credit for the amount above. Use the airline&apos;s website or app
                      with your PNR to view or redeem credit according to their rules.
                    </li>
                    <li>
                      We do not charge your card again for this cancellation. If you still see a charge, allow a few
                      days for your bank to refresh; then contact support with your reference.
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      Where applicable, we release funds through your original payment method. Most banks post refunds
                      within <span className="font-medium text-slate-900">5–10 business days</span> after the airline
                      confirms the cancellation.
                    </li>
                    <li>
                      When the card refund is fully processed, you may receive a separate &quot;Refund processed&quot;
                      email with the payment reference.
                    </li>
                    <li>Open your booking in TravelTourUp anytime to see quotes, confirmation, and refund events.</li>
                  </>
                )}
              </ul>
            </Section>

            {summary ? (
              <Section className="mt-6">
                <Text className="m-0 text-sm text-slate-600">{summary}</Text>
              </Section>
            ) : null}

            {manageUrl ? (
              <Section className="mt-8 text-center">
                <Link
                  href={manageUrl}
                  className="inline-block rounded-full bg-sky-600 px-8 py-3 text-sm font-semibold text-white no-underline"
                >
                  View booking &amp; payment timeline
                </Link>
              </Section>
            ) : null}

            <Hr className="my-8 border-slate-200" />
            <Text className="text-center text-xs text-slate-500">
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
