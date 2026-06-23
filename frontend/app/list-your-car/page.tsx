'use client';

import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Eyebrow, Section } from '@/components/site/primitives';
import { ShimmerText } from '@/components/site/fx/ShimmerText';

const STEPS = [
  {
    n: '01',
    title: 'Tell us about your car',
    body: 'Share your car\'s year, make, model, and condition through our Contact form. It takes a couple of minutes.',
  },
  {
    n: '02',
    title: 'We confirm and price it',
    body: 'We check it meets our condition, mileage, and insurance standards, then agree on the weekly rate and your payout split before anything goes live.',
  },
  {
    n: '03',
    title: 'We put it to work',
    body: 'We match your car with a vetted gig driver, manage the lease, and pay you weekly — minus our management fee. You keep ownership.',
  },
];

const HANDLED = [
  'Driver screening and approval',
  'Weekly payment collection and tracking',
  'GPS tracking for security',
  'Maintenance coordination',
  'Vehicle recovery if a driver defaults',
  'Weekly payouts to you',
];

export default function ListYourCarPage() {
  return (
    <div className="editorial min-h-screen">
      <a href="#main" className="skip-to-main">Skip to main content</a>
      <SiteNav />

      <main id="main">
        {/* Hero */}
        <section className="ed-section border-t ed-hairline pt-32">
          <div className="ed-container">
            <Eyebrow label="Earn — List Your Car" />
            <h1 className="ed-h1 mt-5 mb-6">
              Turn an idle car into <ShimmerText>weekly income</ShimmerText>.
            </h1>
            <p className="ed-muted text-lg max-w-2xl">
              Own a car you&apos;re not using? GigWheels manages leasing it to vetted gig
              drivers, week after week. You earn passive income and keep ownership — we
              handle everything else.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="ed-cta ed-cta-primary">List your car</Link>
              <Link href="/faq" className="ed-cta ed-cta-ghost">Read the FAQ</Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <Section className="border-t ed-hairline">
          <div className="ed-container">
            <Eyebrow label="How it works" />
            <h2 className="ed-h2 mt-5 mb-14 max-w-2xl">Passive income in three steps.</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((s) => (
                <div key={s.n} className="ed-card p-6">
                  <p className="ed-eyebrow text-gold-light mb-3">{s.n}</p>
                  <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                  <p className="ed-muted text-sm">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* What we handle */}
        <Section className="border-t ed-hairline">
          <div className="ed-container grid lg:grid-cols-2 gap-12">
            <div>
              <Eyebrow label="Fully managed" />
              <h2 className="ed-h2 mt-5 mb-6 max-w-md">We do the work. You get paid.</h2>
              <p className="ed-muted">
                Listing your car with GigWheels is hands-off. We run the whole operation
                end to end and keep a percentage of the weekly rate as a management fee.
                The exact split is agreed up front, before your car earns a dollar.
              </p>
            </div>
            <ul className="space-y-4 self-center">
              {HANDLED.map((item) => (
                <li key={item} className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gold-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* CTA */}
        <Section className="border-t ed-hairline">
          <div className="ed-container text-center">
            <h2 className="ed-h2 mb-5">Have a car sitting idle? <ShimmerText>Put it to work.</ShimmerText></h2>
            <p className="ed-muted max-w-xl mx-auto mb-8">
              Tell us about your vehicle and we&apos;ll come back with a weekly earnings
              estimate and the next steps.
            </p>
            <Link href="/contact" className="ed-cta ed-cta-primary">List your car</Link>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
