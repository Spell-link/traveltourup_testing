import {
  Body,
  Button,
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

export type WelcomeEmailProps = {
  firstName: string;
  lastName?: string;
  /** Absolute URL to the app (e.g. marketing home or dashboard). */
  appUrl?: string;
};

export default function WelcomeEmail({
  firstName,
  lastName,
  appUrl = "https://traveltourup.com",
}: WelcomeEmailProps) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || "Traveler";

  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to TravelTourUp — your next adventure starts here.</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-slate-100 font-sans">
          <Container className="mx-auto max-w-[600px] rounded-2xl bg-white px-8 py-10 shadow-sm">
            <Section className="text-center">
              <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                TravelTourUp
              </Text>
              <Heading className="m-0 text-2xl font-bold text-slate-900">Welcome aboard, {firstName}!</Heading>
              <Text className="mt-3 text-base leading-relaxed text-slate-600">
                Hi {name}, we&apos;re thrilled you joined TravelTourUp. Discover flights, stays, and curated trips
                tailored to how you like to travel.
              </Text>
            </Section>
            <Section className="mt-8 rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 px-6 py-6">
              <Text className="m-0 text-sm font-semibold text-slate-800">What you can do next</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600">
                • Search flexible fares and compare options in one place.
                <br />
                • Manage bookings and trip details from your profile.
                <br />
                • Get booking updates and trip reminders by email.
              </Text>
            </Section>
            <Section className="mt-8 text-center">
              <Button
                href={appUrl}
                className="rounded-full bg-sky-600 px-8 py-3 text-sm font-semibold text-white no-underline"
              >
                Explore destinations
              </Button>
            </Section>
            <Hr className="my-8 border-slate-200" />
            <Text className="text-center text-xs text-slate-500">
              Questions?{" "}
              <Link href="mailto:support@traveltourup.com" className="text-sky-600 underline">
                support@traveltourup.com
              </Link>
            </Text>
            <Text className="mb-0 text-center text-[11px] text-slate-400">
              © {new Date().getFullYear()} TravelTourUp. All rights reserved.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
