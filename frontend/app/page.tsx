'use client';

import Link from 'next/link';

export default function HomePage() {
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
              <Link href="/how-it-works" className="text-gray-600 hover:text-luxury-charcoal transition-colors">
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
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 bg-gradient-luxury overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="container-luxury relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="heading-display text-white mb-6">
              Drive Your Dream
              <span className="block text-gradient">Pay Weekly</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Premium vehicles with flexible weekly payments. No long-term commitment.
              Professional fleet management for discerning customers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="btn btn-primary text-lg px-8 py-4 w-full sm:w-auto">
                Get Started Today
              </Link>
              <Link href="/how-it-works" className="btn btn-outline border-white text-white hover:bg-white hover:text-luxury-charcoal text-lg px-8 py-4 w-full sm:w-auto">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="section bg-white">
        <div className="container-luxury">
          <div className="text-center mb-16">
            <h2 className="heading-section text-luxury-charcoal mb-4">
              Why Choose FX Weekly?
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Experience the freedom of premium vehicles without the burden of ownership
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Value Prop 1 */}
            <div className="card card-hover text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gold-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-luxury-charcoal">
                Flexible Payments
              </h3>
              <p className="text-muted">
                Pay weekly with no hidden fees. Starting from just $150/week with transparent pricing.
              </p>
            </div>

            {/* Value Prop 2 */}
            <div className="card card-hover text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gold-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-luxury-charcoal">
                Full Protection
              </h3>
              <p className="text-muted">
                Comprehensive maintenance included. We handle all servicing so you can focus on driving.
              </p>
            </div>

            {/* Value Prop 3 */}
            <div className="card card-hover text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gold-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-luxury-charcoal">
                Quick Approval
              </h3>
              <p className="text-muted">
                Simple application process. Get approved and drive away in as little as 48 hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Preview */}
      <section className="section bg-luxury-cream">
        <div className="container-luxury">
          <div className="text-center mb-16">
            <h2 className="heading-section text-luxury-charcoal mb-4">
              Simple Process, Premium Experience
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Get behind the wheel in three easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gold-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                1
              </div>
              <h3 className="text-lg font-bold mb-2 text-luxury-charcoal">Apply Online</h3>
              <p className="text-muted">Complete our simple application form with your basic information</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gold-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                2
              </div>
              <h3 className="text-lg font-bold mb-2 text-luxury-charcoal">Choose Your Vehicle</h3>
              <p className="text-muted">Browse our fleet and select the perfect vehicle for your needs</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gold-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                3
              </div>
              <h3 className="text-lg font-bold mb-2 text-luxury-charcoal">Drive Away</h3>
              <p className="text-muted">Complete verification and drive away in your new vehicle</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/how-it-works" className="btn btn-secondary">
              Learn More About Our Process
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-gradient-luxury text-white">
        <div className="container-luxury text-center">
          <h2 className="heading-section mb-4">
            Ready to Experience Premium Driving?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join hundreds of satisfied customers who have discovered the smarter way to drive.
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
