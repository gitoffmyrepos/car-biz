'use client';

import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="container-luxury">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-display font-bold text-luxury-charcoal">
                FX<span className="text-gradient">Weekly</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/how-it-works" className="text-gold-600 font-medium">
                How It Works
              </Link>
              <Link href="/fleet" className="text-gray-600 hover:text-luxury-charcoal transition-colors">
                Fleet
              </Link>
              <Link href="/requirements" className="text-gray-600 hover:text-luxury-charcoal transition-colors">
                Requirements
              </Link>
              <Link href="/faq" className="text-gray-600 hover:text-luxury-charcoal transition-colors">
                FAQ
              </Link>
              <Link href="/contact" className="btn btn-primary">
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" aria-label="Open menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-luxury overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="container-luxury relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="heading-display text-white mb-6">
              How It <span className="text-gradient">Works</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
              Your journey to premium driving made simple. Follow our straightforward process and get behind the wheel in no time.
            </p>
          </div>
        </div>
      </section>

      {/* Step-by-Step Process */}
      <section className="section bg-white">
        <div className="container-luxury">
          <div className="text-center mb-16">
            <h2 className="heading-section text-luxury-charcoal mb-4">
              Simple 4-Step Process
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              From application to driving away, we&apos;ve streamlined every step
            </p>
          </div>

          {/* Timeline Steps */}
          <div className="relative max-w-4xl mx-auto">
            {/* Connection Line (Desktop) */}
            <div className="hidden lg:block absolute left-1/2 top-24 bottom-24 w-0.5 bg-gold-200 -translate-x-1/2" />

            {/* Step 1 */}
            <div className="flex flex-col lg:flex-row items-center gap-8 mb-16 lg:mb-20">
              <div className="w-full lg:w-1/2 lg:pr-12 lg:text-right order-2 lg:order-1">
                <h3 className="text-2xl font-bold text-luxury-charcoal mb-3">Submit Your Application</h3>
                <p className="text-muted leading-relaxed">
                  Fill out our simple online application with your basic information. We&apos;ll need your contact details,
                  valid ID, and proof of insurance. The process takes just a few minutes.
                </p>
              </div>
              <div className="flex-shrink-0 order-1 lg:order-2">
                <div className="w-20 h-20 bg-gold-500 rounded-full flex items-center justify-center shadow-lg z-10 relative">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
              </div>
              <div className="w-full lg:w-1/2 lg:pl-12 order-3 hidden lg:block">
                <div className="card bg-luxury-cream border border-gold-100">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-semibold text-luxury-charcoal">Required Documents</span>
                  </div>
                  <ul className="text-sm text-muted space-y-1">
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
                <div className="card bg-luxury-cream border border-gold-100">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-luxury-charcoal">Quick Turnaround</span>
                  </div>
                  <ul className="text-sm text-muted space-y-1">
                    <li>• Review within 24 hours</li>
                    <li>• Clear approval criteria</li>
                    <li>• Instant notification</li>
                  </ul>
                </div>
              </div>
              <div className="flex-shrink-0 order-1">
                <div className="w-20 h-20 bg-gold-500 rounded-full flex items-center justify-center shadow-lg z-10 relative">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
              </div>
              <div className="w-full lg:w-1/2 lg:pl-12 lg:text-left order-2">
                <h3 className="text-2xl font-bold text-luxury-charcoal mb-3">Get Verified & Approved</h3>
                <p className="text-muted leading-relaxed">
                  Our team reviews your application within 24-48 hours. We verify your documents and insurance coverage.
                  You&apos;ll receive a notification once you&apos;re approved to proceed.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col lg:flex-row items-center gap-8 mb-16 lg:mb-20">
              <div className="w-full lg:w-1/2 lg:pr-12 lg:text-right order-2 lg:order-1">
                <h3 className="text-2xl font-bold text-luxury-charcoal mb-3">Choose Your Vehicle</h3>
                <p className="text-muted leading-relaxed">
                  Browse our premium fleet and select the vehicle that suits your style and needs.
                  All vehicles are professionally maintained and ready for the road.
                </p>
              </div>
              <div className="flex-shrink-0 order-1 lg:order-2">
                <div className="w-20 h-20 bg-gold-500 rounded-full flex items-center justify-center shadow-lg z-10 relative">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
              </div>
              <div className="w-full lg:w-1/2 lg:pl-12 order-3 hidden lg:block">
                <div className="card bg-luxury-cream border border-gold-100">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-semibold text-luxury-charcoal">Quality Assured</span>
                  </div>
                  <ul className="text-sm text-muted space-y-1">
                    <li>• Full inspection before delivery</li>
                    <li>• Clean interior & exterior</li>
                    <li>• Full tank of gas</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="w-full lg:w-1/2 lg:pr-12 order-3 hidden lg:block">
                <div className="card bg-luxury-cream border border-gold-100">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-luxury-charcoal">Easy Payments</span>
                  </div>
                  <ul className="text-sm text-muted space-y-1">
                    <li>• Pay via Zelle or CashApp</li>
                    <li>• Upload payment proof</li>
                    <li>• 48-hour verification</li>
                  </ul>
                </div>
              </div>
              <div className="flex-shrink-0 order-1">
                <div className="w-20 h-20 bg-gold-500 rounded-full flex items-center justify-center shadow-lg z-10 relative">
                  <span className="text-3xl font-bold text-white">4</span>
                </div>
              </div>
              <div className="w-full lg:w-1/2 lg:pl-12 lg:text-left order-2">
                <h3 className="text-2xl font-bold text-luxury-charcoal mb-3">Drive Away & Pay Weekly</h3>
                <p className="text-muted leading-relaxed">
                  Make your first weekly payment, sign the agreement, and drive away in your new vehicle.
                  Continue making weekly payments to keep enjoying your premium ride.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Model Section */}
      <section className="section bg-luxury-cream">
        <div className="container-luxury">
          <div className="text-center mb-16">
            <h2 className="heading-section text-luxury-charcoal mb-4">
              Simple Weekly Payment Model
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Transparent pricing with no hidden fees or surprises
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Payment Example Card */}
            <div className="card border-2 border-gold-200">
              <div className="text-center mb-6">
                <span className="text-sm font-semibold text-gold-600 uppercase tracking-wider">Starting From</span>
                <div className="flex items-end justify-center gap-1 mt-2">
                  <span className="text-5xl font-bold text-luxury-charcoal">$150</span>
                  <span className="text-xl text-muted mb-2">/week</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted">Weekly payment cycle - pay every 7 days</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted">Monthly service included at no extra cost</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted">No long-term contracts or commitments</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted">Easy payment via Zelle or CashApp</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted">48-hour payment verification process</span>
                </li>
              </ul>

              <Link href="/contact" className="btn btn-primary w-full text-center">
                Start Your Application
              </Link>
            </div>

            {/* How Payment Works */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-luxury-charcoal">How Payment Works</h3>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gold-600">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-luxury-charcoal">Weekly Due Date</h4>
                    <p className="text-sm text-muted">Your payment is due every 7 days from your lease start date.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gold-600">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-luxury-charcoal">Make Payment Externally</h4>
                    <p className="text-sm text-muted">Send your payment via Zelle or CashApp to our designated account.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gold-600">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-luxury-charcoal">Upload Payment Proof</h4>
                    <p className="text-sm text-muted">Take a screenshot of your payment confirmation and upload it to your account.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-gold-600">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-luxury-charcoal">Verification (48 Hours)</h4>
                    <p className="text-sm text-muted">Our team verifies your payment within 48 hours and updates your account status.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 mt-6">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-gold-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-luxury-charcoal text-sm">Monthly Service</h4>
                    <p className="text-sm text-muted">At the end of each month, we&apos;ll service your vehicle at no additional cost to ensure optimal performance.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section bg-white">
        <div className="container-luxury">
          <div className="text-center mb-16">
            <h2 className="heading-section text-luxury-charcoal mb-4">
              Why Weekly Leasing Makes Sense
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Experience the benefits of premium driving without the traditional burdens
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <div className="card card-hover">
              <div className="w-14 h-14 mb-6 bg-gold-100 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-luxury-charcoal">No Large Down Payment</h3>
              <p className="text-muted">
                Start driving without the need for a substantial upfront investment. Our weekly payment model makes premium vehicles accessible.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="card card-hover">
              <div className="w-14 h-14 mb-6 bg-gold-100 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-luxury-charcoal">Maintenance Included</h3>
              <p className="text-muted">
                Every vehicle receives monthly service at no extra charge. We handle all maintenance so you can focus on driving.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="card card-hover">
              <div className="w-14 h-14 mb-6 bg-gold-100 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-luxury-charcoal">No Credit Check Hassle</h3>
              <p className="text-muted">
                We focus on your ability to pay weekly, not your credit history. Get approved faster with our simplified process.
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="card card-hover">
              <div className="w-14 h-14 mb-6 bg-gold-100 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-luxury-charcoal">Flexible Terms</h3>
              <p className="text-muted">
                No long-term contracts locking you in. Continue your lease as long as you want with our flexible week-to-week arrangement.
              </p>
            </div>

            {/* Benefit 5 */}
            <div className="card card-hover">
              <div className="w-14 h-14 mb-6 bg-gold-100 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-luxury-charcoal">Quick Approval</h3>
              <p className="text-muted">
                Our streamlined process means you could be driving in as little as 48 hours after submitting your application.
              </p>
            </div>

            {/* Benefit 6 */}
            <div className="card card-hover">
              <div className="w-14 h-14 mb-6 bg-gold-100 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-luxury-charcoal">Dedicated Support</h3>
              <p className="text-muted">
                Our team is here to assist you every step of the way. From application to ongoing support, we&apos;ve got you covered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-gradient-luxury text-white">
        <div className="container-luxury text-center">
          <h2 className="heading-section mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join our growing community of satisfied customers. Apply today and drive away tomorrow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact" className="btn btn-primary text-lg px-8 py-4 w-full sm:w-auto">
              Start Your Application
            </Link>
            <Link href="/fleet" className="btn btn-outline border-white text-white hover:bg-white hover:text-luxury-charcoal text-lg px-8 py-4 w-full sm:w-auto">
              Browse Our Fleet
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-luxury-charcoal text-white py-12">
        <div className="container-luxury">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="text-2xl font-display font-bold">
                FX<span className="text-gold-500">Weekly</span>
              </Link>
              <p className="mt-4 text-gray-400">
                Premium vehicle leasing with flexible weekly payments.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/fleet" className="text-gray-400 hover:text-white transition-colors">Our Fleet</Link></li>
                <li><Link href="/requirements" className="text-gray-400 hover:text-white transition-colors">Requirements</Link></li>
                <li><Link href="/faq" className="text-gray-400 hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/gps-disclosure" className="text-gray-400 hover:text-white transition-colors">GPS Disclosure</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>support@fxweekly.com</li>
                <li>(555) 123-4567</li>
              </ul>
              <Link href="/contact" className="btn btn-primary mt-4 w-full text-center">
                Contact Us
              </Link>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; {new Date().getFullYear()} FX Weekly Lease. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
