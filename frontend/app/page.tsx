'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Hero3D } from '@/components/site/Hero3D';
import { Reveal } from '@/components/site/Reveal';
import { FleetPreview } from '@/components/site/FleetPreview';
import { FaqAccordion } from '@/components/site/FaqAccordion';
import { GoldEyebrow, Section, PrimaryCta, GhostCta } from '@/components/site/primitives';

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
  return (
    <div className="editorial min-h-screen">
      <a href="#main" className="skip-to-main">Skip to main content</a>
      <SiteNav />

      <main id="main">
        {/* 3D Hero */}
        <section className="relative min-h-[88vh] flex items-center overflow-hidden">
          <Hero3D />
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{ background: 'linear-gradient(90deg, #0d0d0d 0%, rgba(13,13,13,0.65) 45%, rgba(13,13,13,0) 100%)' }}
          />
          <div className="ed-container relative z-10 pt-24 pb-16">
            <div className="max-w-2xl">
              <Reveal>
                <GoldEyebrow index="01" label="Weekly car leasing" />
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="ed-h1 mt-5 mb-6">
                  Get a car today.<br />
                  Pay <span className="ed-gold-word">weekly.</span>
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
                  <PrimaryCta href="/contact">
                    Apply now <ArrowRight className="w-4 h-4" />
                  </PrimaryCta>
                  <GhostCta href="/fleet">Browse the fleet</GhostCta>
                </div>
              </Reveal>

              {/* Credibility strip */}
              <Reveal delay={0.2}>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-14 border ed-hairline">
                  {STATS.map((s) => (
                    <div key={s.label} className="bg-ink-card p-5">
                      <dd className="font-display text-2xl md:text-3xl font-semibold text-gold-light">{s.value}</dd>
                      <dt className="ed-muted text-xs uppercase tracking-wide mt-1">{s.label}</dt>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 01 — Why */}
        <Section className="border-t ed-hairline">
          <Reveal><GoldEyebrow index="01" label="Why FX Weekly" /></Reveal>
          <Reveal delay={0.05}>
            <h2 className="ed-h2 mt-5 mb-14 max-w-2xl">Everything vznrentals lacks, plus a real fleet.</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-px border ed-hairline">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <div className="ed-card h-full p-8" style={{ border: 'none' }}>
                  <h3 className="font-display text-xl font-medium mb-3">{v.title}</h3>
                  <p className="ed-muted text-sm leading-relaxed">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* 02 — Process */}
        <Section className="border-t ed-hairline">
          <Reveal><GoldEyebrow index="02" label="Process" /></Reveal>
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
              <Reveal><GoldEyebrow index="03" label="The fleet" /></Reveal>
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
              <Reveal><GoldEyebrow index="04" label="Requirements" /></Reveal>
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

        {/* 05 — FAQ */}
        <Section className="border-t ed-hairline">
          <div className="grid md:grid-cols-[0.4fr_0.6fr] gap-12">
            <div>
              <Reveal><GoldEyebrow index="05" label="FAQ" /></Reveal>
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
        <section className="border-t ed-hairline" style={{ background: 'var(--ed-card)' }}>
          <div className="ed-container py-24 text-center">
            <Reveal>
              <h2 className="ed-h2 mb-5">Ready to start earning?</h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className="ed-muted max-w-xl mx-auto mb-9">
                Apply today, get approved tomorrow, and drive the same day. No credit check, no long-term contract.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <PrimaryCta href="/contact">Apply now <ArrowRight className="w-4 h-4" /></PrimaryCta>
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
