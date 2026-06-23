'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Hero3D } from '@/components/site/Hero3D';
import { VideoHero } from '@/components/site/VideoHero';
import { Reveal } from '@/components/site/Reveal';
import { FleetPreview } from '@/components/site/FleetPreview';
import { FaqAccordion } from '@/components/site/FaqAccordion';
import { Eyebrow, Section, GhostCta } from '@/components/site/primitives';
import { AnimatedCounter } from '@/components/site/fx/AnimatedCounter';
import { Marquee } from '@/components/site/fx/Marquee';
import { TiltSpotlightCard } from '@/components/site/fx/TiltSpotlightCard';
import { MagneticButton } from '@/components/site/fx/MagneticButton';
import { Aurora } from '@/components/site/fx/Aurora';
import { ShimmerText } from '@/components/site/fx/ShimmerText';

const MARQUEE_ITEMS = [
  'Uber Approved',
  'DoorDash Ready',
  'Lyft Eligible',
  'Amazon Flex',
  'Instacart',
  'Grubhub',
  'No Credit Check',
  '24h Approval',
];

const STATS = [
  { value: '2,500+', label: 'Drivers helped' },
  { value: '$150', label: 'Starting weekly' },
  { value: '24h', label: 'Approval time' },
  { value: '100%', label: 'Inspected fleet' },
];

const VALUES = [
  {
    title: 'Published weekly prices',
    body: 'Every car shows its real weekly rate up front. No quotes, no haggling, no surprises at pickup.',
  },
  {
    title: 'Built for gig work',
    body: 'DoorDash, Uber, Lyft, delivery — our fleet is approved for rideshare and gig platforms out of the gate.',
  },
  {
    title: 'No credit checks',
    body: 'Approval is based on eligibility, not your credit score. Flexible terms, return the car when you are done.',
  },
];

const PROCESS = [
  { step: '01', title: 'Apply online', body: 'A short form with your basics. Under five minutes, no paperwork.' },
  { step: '02', title: 'Get approved', body: 'We verify eligibility and approve within 24 hours. No credit check.' },
  { step: '03', title: 'Pick up & drive', body: 'Choose your car, sign, and start earning the same day.' },
];

const REQUIREMENTS = [
  'Valid driver license (1+ year)',
  'Proof of gig / income source',
  'Clean recent driving record',
  'Refundable security deposit',
];

const FAQ = [
  {
    q: 'How much does it cost per week?',
    a: 'Rates start at $150/week and vary by vehicle. Every car on the fleet page shows its exact weekly rate and security deposit.',
  },
  {
    q: 'Do you run a credit check?',
    a: 'No. Approval is based on your license, driving record, and gig/income eligibility — not your credit score.',
  },
  {
    q: 'Can I use the car for DoorDash or Uber?',
    a: 'Yes. The fleet is intended for rideshare and delivery work. Vehicles are maintained and inspected for gig use.',
  },
  {
    q: 'Is there a long-term contract?',
    a: 'No long-term commitment. Keep the car as long as you need it and return it whenever you are done.',
  },
  {
    q: 'How fast can I get on the road?',
    a: 'Most drivers are approved within 24 hours and can pick up the same day approval clears.',
  },
];

export default function HomePage() {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <div className="editorial min-h-screen">
      <a href="#main" className="skip-to-main">Skip to main content</a>
      <SiteNav />

      <main id="main">
        {/* 3D Hero */}
        <section ref={heroRef} className="relative min-h-[88vh] flex items-center overflow-hidden">
          {/* Optional Seedance ambient video (silent no-op until asset shipped) */}
          <VideoHero />
          {/* Animated red-on-black ambient mesh */}
          <Aurora />
          {/* 3D car layer (scroll-driven via the hero section ref) */}
          <Hero3D scrollTargetRef={heroRef} />
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{ background: 'linear-gradient(90deg, #0d0d0d 0%, rgba(13,13,13,0.65) 45%, rgba(13,13,13,0) 100%)' }}
          />
          <div className="ed-container relative z-10 pt-24 pb-16">
            <div className="max-w-2xl">
              <Reveal>
                <Eyebrow index="01" label="Weekly car leasing" />
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="ed-h1 mt-5 mb-6">
                  Get a car today.<br />
                  Pay <ShimmerText>weekly.</ShimmerText>
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="ed-muted text-lg max-w-xl mb-9 leading-relaxed">
                  Reliable vehicles for gig and delivery drivers from $150/week. Published prices,
                  real fleet, approval in 24 hours — no credit check.
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <MagneticButton href="/contact" className="ed-cta ed-cta-primary">
                    Apply now <ArrowRight className="w-4 h-4" />
                  </MagneticButton>
                  <GhostCta href="/fleet">Browse the fleet</GhostCta>
                </div>
              </Reveal>

              {/* Credibility strip — count-up on scroll-into-view */}
              <Reveal delay={0.2}>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-14 border ed-hairline">
                  {STATS.map((s) => (
                    <div key={s.label} className="bg-ink-card p-5">
                      <dd className="font-display text-2xl md:text-3xl font-semibold text-gold-light">
                        <AnimatedCounter value={s.value} />
                      </dd>
                      <dt className="ed-muted text-xs uppercase tracking-wide mt-1">{s.label}</dt>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Infinite gig-platform marquee */}
        <div className="border-y ed-hairline py-4" style={{ background: 'var(--ed-card)' }}>
          <Marquee items={MARQUEE_ITEMS} />
        </div>

        {/* 01 — Why */}
        <Section className="border-t ed-hairline">
          <Reveal><Eyebrow index="01" label="Why GigWheels" /></Reveal>
          <Reveal delay={0.05}>
            <h2 className="ed-h2 mt-5 mb-14 max-w-2xl">A real fleet you can actually browse — prices, specs, availability.</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-px border ed-hairline">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <TiltSpotlightCard className="ed-card h-full" intensity={5}>
                  <div className="h-full p-8">
                    <h3 className="font-display text-xl font-medium mb-3">{v.title}</h3>
                    <p className="ed-muted text-sm leading-relaxed">{v.body}</p>
                  </div>
                </TiltSpotlightCard>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* 02 — Process */}
        <Section className="border-t ed-hairline">
          <Reveal><Eyebrow index="02" label="Process" /></Reveal>
          <Reveal delay={0.05}>
            <h2 className="ed-h2 mt-5 mb-14 max-w-2xl">On the road in three steps.</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-10">
            {PROCESS.map((p, i) => (
              <Reveal key={p.step} delay={i * 0.08}>
                <div className="border-t-2 pt-6" style={{ borderColor: 'var(--ed-gold)' }}>
                  <span className="font-display text-4xl font-semibold text-gold-light">{p.step}</span>
                  <h3 className="font-display text-xl font-medium mt-3 mb-2">{p.title}</h3>
                  <p className="ed-muted text-sm leading-relaxed">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* 03 — Fleet preview */}
        <Section className="border-t ed-hairline">
          <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
            <div>
              <Reveal><Eyebrow index="03" label="The fleet" /></Reveal>
              <Reveal delay={0.05}>
                <h2 className="ed-h2 mt-5 max-w-xl">Real cars. Real weekly prices.</h2>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <Link href="/fleet" className="ed-navlink inline-flex items-center gap-2 text-gold-light hover:text-white">
                View full fleet <ArrowRight className="w-4 h-4" />
              </Link>
            </Reveal>
          </div>
          <FleetPreview />
        </Section>

        {/* 04 — Requirements */}
        <Section className="border-t ed-hairline">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <Reveal><Eyebrow index="04" label="Requirements" /></Reveal>
              <Reveal delay={0.05}>
                <h2 className="ed-h2 mt-5 mb-6 max-w-md">What you need to qualify.</h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="ed-muted text-sm leading-relaxed mb-6 max-w-md">
                  Approval is fast and based on eligibility, not credit. See the full list before you apply.
                </p>
                <GhostCta href="/requirements">Full requirements</GhostCta>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <ul className="border-t ed-hairline">
                {REQUIREMENTS.map((r) => (
                  <li key={r} className="border-b ed-hairline py-4 flex items-center gap-4">
                    <span className="text-gold-light font-display">—</span>
                    <span className="text-sm">{r}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </Section>

        {/* 05 — List Your Car (owner partner program) */}
        <Section className="border-t ed-hairline">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Reveal><Eyebrow index="05" label="Earn — List Your Car" /></Reveal>
              <Reveal delay={0.05}>
                <h2 className="ed-h2 mt-5 mb-6 max-w-md">Own an extra car? Let it earn for you.</h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="ed-muted text-sm leading-relaxed mb-6 max-w-md">
                  GigWheels manages leasing your spare car to vetted gig drivers, week after
                  week. You earn passive income and keep ownership — we handle screening,
                  payments, tracking, and the rest.
                </p>
                <GhostCta href="/list-your-car">How it works</GhostCta>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <ul className="border-t ed-hairline">
                {['You keep ownership', 'Weekly payouts', 'We vet every driver', 'Fully managed, hands-off'].map((r) => (
                  <li key={r} className="border-b ed-hairline py-4 flex items-center gap-4">
                    <span className="text-gold-light font-display">—</span>
                    <span className="text-sm">{r}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </Section>

        {/* 06 — FAQ */}
        <Section className="border-t ed-hairline">
          <div className="grid md:grid-cols-[0.4fr_0.6fr] gap-12">
            <div>
              <Reveal><Eyebrow index="06" label="FAQ" /></Reveal>
              <Reveal delay={0.05}>
                <h2 className="ed-h2 mt-5 max-w-xs">Questions, answered.</h2>
              </Reveal>
            </div>
            <Reveal delay={0.08}>
              <FaqAccordion items={FAQ} />
            </Reveal>
          </div>
        </Section>

        {/* Final CTA band */}
        <section className="relative border-t ed-hairline overflow-hidden" style={{ background: 'var(--ed-card)' }}>
          <Aurora />
          <div className="ed-container relative z-10 py-24 text-center">
            <Reveal>
              <h2 className="ed-h2 mb-5">Ready to start <ShimmerText>earning?</ShimmerText></h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className="ed-muted max-w-xl mx-auto mb-9">
                Apply today, get approved tomorrow, and drive the same day. No credit check, no long-term contract.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <MagneticButton href="/contact" className="ed-cta ed-cta-primary">
                  Apply now <ArrowRight className="w-4 h-4" />
                </MagneticButton>
                <GhostCta href="/fleet">See available cars</GhostCta>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
