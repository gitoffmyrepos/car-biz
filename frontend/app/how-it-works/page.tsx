'use client';

import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Eyebrow, Section } from '@/components/site/primitives';
import { ShimmerText } from '@/components/site/fx/ShimmerText';

export default function HowItWorksPage() {
  return (
    <div className="editorial min-h-screen">
      <a href="#main" className="skip-to-main">Skip to main content</a>
      <SiteNav />

      <main id="main">
        {/* Hero Section */}
        <section className="ed-section border-t ed-hairline pt-32">
          <div className="ed-container">
            <Eyebrow label="Process" />
            <h1 className="ed-h1 mt-5 mb-6">
              How It <ShimmerText>Works</ShimmerText>
            </h1>
            <p className="ed-muted text-lg max-w-2xl">
              Get a car today and pay weekly. Our simple process gets you driving in as little as 48 hours.
            </p>
          </div>
        </section>

        {/* Step-by-Step Process */}
        <Section className="border-t ed-hairline">
          <div className="text-center mb-16">
            <h2 className="ed-h2 mb-4">
              Simple 4-Step Process
            </h2>
            <p className="ed-muted text-lg max-w-2xl mx-auto">
              From application to driving away, we&apos;ve streamlined every step
            </p>
          </div>

          {/* Timeline Steps */}
          <div className="relative max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col lg:flex-row items-center gap-8 mb-16 lg:mb-20">
              <div className="w-full lg:w-1/2 lg:pr-12 lg:text-right order-2 lg:order-1">
                <h3 className="text-2xl font-bold text-white mb-3">Submit Your Application</h3>
                <p className="ed-muted leading-relaxed">
                  Fill out our simple online application with your basic information. We&apos;ll need your contact details,
                  valid ID, and proof of insurance. The process takes just a few minutes.
                </p>
              </div>
              <div className="flex-shrink-0 order-1 lg:order-2 relative">
                <div className="border-t-2 pt-2 px-4" style={{ borderColor: 'var(--ed-gold)' }}>
                  <span className="font-display text-4xl font-semibold text-gold-light">01</span>
                </div>
                {/* Arrow pointing down to next step */}
                <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 top-full mt-8">
                  <svg className="w-6 h-12 text-gold-light/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
              <div className="w-full lg:w-1/2 lg:pl-12 order-3 hidden lg:block">
                <div className="ed-card p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-semibold text-white">Required Documents</span>
                  </div>
                  <ul className="text-sm ed-muted space-y-1">
                    <li>• Valid Driver&apos;s License</li>
                    <li>• Proof of Insurance</li>
                    <li>• Contact Information</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col lg:flex-row items-center gap-8 mb-16 lg:mb-20">
              <div className="w-full lg:w-1/2 lg:pr-12 order-3 hidden lg:block">
                <div className="ed-card p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-white">Quick Turnaround</span>
                  </div>
                  <ul className="text-sm ed-muted space-y-1">
                    <li>• Review within 24 hours</li>
                    <li>• Clear approval criteria</li>
                    <li>• Instant notification</li>
                  </ul>
                </div>
              </div>
              <div className="flex-shrink-0 order-1 relative">
                <div className="border-t-2 pt-2 px-4" style={{ borderColor: 'var(--ed-gold)' }}>
                  <span className="font-display text-4xl font-semibold text-gold-light">02</span>
                </div>
                {/* Arrow pointing down to next step */}
                <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 top-full mt-8">
                  <svg className="w-6 h-12 text-gold-light/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
              <div className="w-full lg:w-1/2 lg:pl-12 lg:text-left order-2">
                <h3 className="text-2xl font-bold text-white mb-3">Get Verified &amp; Approved</h3>
                <p className="ed-muted leading-relaxed">
                  Our team reviews your application within 24-48 hours. We verify your documents and insurance coverage.
                  You&apos;ll receive a notification once you&apos;re approved to proceed.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col lg:flex-row items-center gap-8 mb-16 lg:mb-20">
              <div className="w-full lg:w-1/2 lg:pr-12 lg:text-right order-2 lg:order-1">
                <h3 className="text-2xl font-bold text-white mb-3">Choose Your Vehicle</h3>
                <p className="ed-muted leading-relaxed">
                  Browse our premium fleet and select the vehicle that suits your style and needs.
                  All vehicles are professionally maintained and ready for the road.
                </p>
              </div>
              <div className="flex-shrink-0 order-1 lg:order-2 relative">
                <div className="border-t-2 pt-2 px-4" style={{ borderColor: 'var(--ed-gold)' }}>
                  <span className="font-display text-4xl font-semibold text-gold-light">03</span>
                </div>
                {/* Arrow pointing down to next step */}
                <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 top-full mt-8">
                  <svg className="w-6 h-12 text-gold-light/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
              <div className="w-full lg:w-1/2 lg:pl-12 order-3 hidden lg:block">
                <div className="ed-card p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-semibold text-white">Quality Assured</span>
                  </div>
                  <ul className="text-sm ed-muted space-y-1">
                    <li>• Full inspection before delivery</li>
                    <li>• Clean interior &amp; exterior</li>
                    <li>• Full tank of gas</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="w-full lg:w-1/2 lg:pr-12 order-3 hidden lg:block">
                <div className="ed-card p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-white">Easy Payments</span>
                  </div>
                  <ul className="text-sm ed-muted space-y-1">
                    <li>• Pay via Zelle or CashApp</li>
                    <li>• Upload payment proof</li>
                    <li>• 48-hour verification</li>
                  </ul>
                </div>
              </div>
              <div className="flex-shrink-0 order-1">
                <div className="border-t-2 pt-2 px-4" style={{ borderColor: 'var(--ed-gold)' }}>
                  <span className="font-display text-4xl font-semibold text-gold-light">04</span>
                </div>
              </div>
              <div className="w-full lg:w-1/2 lg:pl-12 lg:text-left order-2">
                <h3 className="text-2xl font-bold text-white mb-3">Drive Away &amp; Pay Weekly</h3>
                <p className="ed-muted leading-relaxed">
                  Make your first weekly payment, sign the agreement, and drive away in your new vehicle.
                  Continue making weekly payments to keep enjoying your premium ride.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Payment Model Section */}
        <Section className="border-t ed-hairline">
          <div className="text-center mb-16">
            <h2 className="ed-h2 mb-4">
              Simple Weekly Payment Model
            </h2>
            <p className="ed-muted text-lg max-w-2xl mx-auto">
              Transparent pricing with no hidden fees or surprises
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Payment Example Card */}
            <div className="ed-card p-6 md:p-8">
              <div className="text-center mb-6">
                <span className="text-sm font-semibold text-gold-light uppercase tracking-wider">Starting From</span>
                <div className="flex items-end justify-center gap-1 mt-2">
                  <span className="text-5xl font-bold text-white">$350</span>
                  <span className="text-xl ed-muted mb-2">/week</span>
                </div>
                <div className="text-sm ed-muted mt-2">or <span className="text-white font-semibold">$55/day</span> for daily rentals</div>
                <div className="text-sm ed-muted mt-1">Sign a <span className="text-white font-semibold">1-month contract</span> (still paid weekly) and get <span className="text-gold-light font-semibold">5% off</span> every week — <span className="text-white font-semibold">$332.50/week</span></div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ed-muted">Weekly payment cycle - pay every 7 days</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ed-muted">Monthly service included at no extra cost</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ed-muted">No required long-term contracts &mdash; stay week to week</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ed-muted">Commit to a 1-month contract and save 5% on every weekly payment</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ed-muted">Easy payment via Zelle or CashApp</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="ed-muted">48-hour payment verification process</span>
                </li>
              </ul>

              <Link href="/contact" className="ed-cta ed-cta-primary w-full text-center">
                Start Your Application
              </Link>
            </div>

            {/* How Payment Works */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">How Payment Works</h3>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 border ed-hairline flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gold-light">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Weekly Due Date</h4>
                    <p className="text-sm ed-muted">Your payment is due every 7 days from your lease start date.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 border ed-hairline flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gold-light">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Make Payment Externally</h4>
                    <p className="text-sm ed-muted">Send your payment via Zelle or CashApp to our designated account.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 border ed-hairline flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gold-light">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Upload Payment Proof</h4>
                    <p className="text-sm ed-muted">Take a screenshot of your payment confirmation and upload it to your account.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 border ed-hairline flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gold-light">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Verification (48 Hours)</h4>
                    <p className="text-sm ed-muted">Our team verifies your payment within 48 hours and updates your account status.</p>
                  </div>
                </div>
              </div>

              <div className="bg-ink-card border ed-hairline p-4 mt-6">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Monthly Service</h4>
                    <p className="text-sm ed-muted">At the end of each month, we&apos;ll service your vehicle at no additional cost to ensure optimal performance.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Benefits Section */}
        <Section className="border-t ed-hairline">
          <div className="text-center mb-16">
            <h2 className="ed-h2 mb-4">
              Why Weekly Leasing Makes Sense
            </h2>
            <p className="ed-muted text-lg max-w-2xl mx-auto">
              Experience the benefits of premium driving without the traditional burdens
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <div className="ed-card p-6 md:p-8">
              <div className="w-14 h-14 mb-6 bg-ink-card border ed-hairline flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">No Large Down Payment</h3>
              <p className="ed-muted">
                Start driving without the need for a substantial upfront investment. Our weekly payment model makes premium vehicles accessible.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="ed-card p-6 md:p-8">
              <div className="w-14 h-14 mb-6 bg-ink-card border ed-hairline flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Maintenance Included</h3>
              <p className="ed-muted">
                Every vehicle receives monthly service at no extra charge. We handle all maintenance so you can focus on driving.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="ed-card p-6 md:p-8">
              <div className="w-14 h-14 mb-6 bg-ink-card border ed-hairline flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">No Credit Check Hassle</h3>
              <p className="ed-muted">
                We focus on your ability to pay weekly, not your credit history. Get approved faster with our simplified process.
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="ed-card p-6 md:p-8">
              <div className="w-14 h-14 mb-6 bg-ink-card border ed-hairline flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Flexible Terms</h3>
              <p className="ed-muted">
                No long-term contracts locking you in. Continue your lease as long as you want with our flexible week-to-week arrangement.
              </p>
            </div>

            {/* Benefit 5 */}
            <div className="ed-card p-6 md:p-8">
              <div className="w-14 h-14 mb-6 bg-ink-card border ed-hairline flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Quick Approval</h3>
              <p className="ed-muted">
                Our streamlined process means you could be driving in as little as 48 hours after submitting your application.
              </p>
            </div>

            {/* Benefit 6 */}
            <div className="ed-card p-6 md:p-8">
              <div className="w-14 h-14 mb-6 bg-ink-card border ed-hairline flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Dedicated Support</h3>
              <p className="ed-muted">
                Our team is here to assist you every step of the way. From application to ongoing support, we&apos;ve got you covered.
              </p>
            </div>
          </div>
        </Section>

        {/* CTA Section */}
        <Section className="border-t ed-hairline">
          <div className="text-center">
            <h2 className="ed-h2 mb-4">
              Ready to Get Started?
            </h2>
            <p className="ed-muted text-lg mb-8 max-w-2xl mx-auto">
              Join our growing community of satisfied customers. Apply today and drive away tomorrow.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="ed-cta ed-cta-primary">
                Start Your Application
              </Link>
              <Link href="/fleet" className="ed-cta ed-cta-ghost">
                Browse Our Fleet
              </Link>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
