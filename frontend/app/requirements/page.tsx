'use client';

import Link from 'next/link';

export default function RequirementsPage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-glossy-black/90 backdrop-blur-md border-b border-glossy-border">
        <div className="container-luxury">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-display font-bold text-white">
                FX<span className="text-gradient-glow">Weekly</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="/fleet" className="text-gray-400 hover:text-white transition-colors">
                Fleet
              </Link>
              <Link href="/requirements" className="text-orange-500 font-medium transition-colors">
                Requirements
              </Link>
              <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                FAQ
              </Link>
              <Link href="/contact" className="btn btn-primary">
                Get Started
              </Link>
            </div>
            <button className="md:hidden p-2 rounded-lg hover:bg-glossy-light" aria-label="Open menu">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 bg-gradient-glossy overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
        <div className="container-luxury relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="heading-display text-white mb-6">
              Eligibility <span className="text-gradient-glow">Requirements</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
              Review our straightforward requirements to ensure you&apos;re ready to join the GigWheels family.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Overview */}
      <section className="py-8 border-b border-orange-200">
        <div className="container-luxury">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-center">
            <div>
              <div className="text-3xl font-bold text-white">21+</div>
              <div className="text-sm text-muted">Minimum Age</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-orange-300"></div>
            <div>
              <div className="text-3xl font-bold text-white">Valid License</div>
              <div className="text-sm text-muted">Required</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-orange-300"></div>
            <div>
              <div className="text-3xl font-bold text-white">Full Coverage</div>
              <div className="text-sm text-muted">Insurance</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-orange-300"></div>
            <div>
              <div className="text-3xl font-bold text-white">48hr</div>
              <div className="text-sm text-muted">Verification</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Requirements Section */}
      <section className="section">
        <div className="container-luxury">
          <div className="max-w-4xl mx-auto">

            {/* Age & Eligibility */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Age & Eligibility</h2>
              </div>
              <div className="card p-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      <strong>Minimum Age:</strong> Must be at least 21 years old
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      <strong>Driving Experience:</strong> Minimum 2 years of licensed driving experience
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      <strong>Clean Record:</strong> No major traffic violations or DUI convictions in the past 3 years
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      <strong>Residency:</strong> Must have a valid local address for correspondence
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Identification Requirements */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Identification Requirements</h2>
              </div>
              <div className="card p-6">
                <p className="text-gray-700 mb-6">
                  Please have the following documents ready during the application process:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-glossy-light rounded-lg p-4">
                    <h4 className="font-bold text-white mb-3 flex items-center">
                      <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                      Valid Driver&apos;s License
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-2 ml-11">
                      <li>• Must be current and not expired</li>
                      <li>• Must match your current address</li>
                      <li>• No suspension or revocation history</li>
                    </ul>
                  </div>
                  <div className="bg-glossy-light rounded-lg p-4">
                    <h4 className="font-bold text-white mb-3 flex items-center">
                      <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                      Government-Issued ID
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-2 ml-11">
                      <li>• State ID, Passport, or similar</li>
                      <li>• Used for identity verification</li>
                      <li>• Must include photo and DOB</li>
                    </ul>
                  </div>
                  <div className="bg-glossy-light rounded-lg p-4">
                    <h4 className="font-bold text-white mb-3 flex items-center">
                      <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                      Proof of Address
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-2 ml-11">
                      <li>• Utility bill or bank statement</li>
                      <li>• Dated within the last 60 days</li>
                      <li>• Must match ID address</li>
                    </ul>
                  </div>
                  <div className="bg-glossy-light rounded-lg p-4">
                    <h4 className="font-bold text-white mb-3 flex items-center">
                      <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                      Contact Information
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-2 ml-11">
                      <li>• Valid phone number</li>
                      <li>• Active email address</li>
                      <li>• Emergency contact info</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Insurance Requirements */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Insurance Requirements</h2>
              </div>
              <div className="card p-6 border-2 border-orange-200">
                <div className="bg-glossy-light rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold text-orange-300">Important</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Full coverage insurance is <strong>mandatory</strong> for all leased vehicles. You must provide proof of valid insurance before vehicle pickup.
                  </p>
                </div>

                <h4 className="font-bold text-white mb-4">Required Coverage:</h4>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-glossy-light rounded-lg">
                    <div className="text-2xl font-bold text-white">$100K/$300K</div>
                    <div className="text-sm text-muted">Bodily Injury Liability</div>
                  </div>
                  <div className="text-center p-4 bg-glossy-light rounded-lg">
                    <div className="text-2xl font-bold text-white">$50K</div>
                    <div className="text-sm text-muted">Property Damage</div>
                  </div>
                  <div className="text-center p-4 bg-glossy-light rounded-lg">
                    <div className="text-2xl font-bold text-white">Full</div>
                    <div className="text-sm text-muted">Comprehensive & Collision</div>
                  </div>
                </div>

                <h4 className="font-bold text-white mb-4">Insurance Documentation:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      Valid insurance card showing current coverage dates
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      Insurance must list GigWheels as additional insured or lienholder
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      Policy must remain active for the duration of the lease
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      Notify us immediately of any policy changes or lapses
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Payment Requirements */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Payment Requirements</h2>
              </div>
              <div className="card p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-white mb-3">Initial Payment</h4>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2"></span>
                        First week&apos;s payment due at vehicle pickup
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2"></span>
                        Security deposit may be required (refundable)
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2"></span>
                        No credit check required
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-3">Accepted Payment Methods</h4>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-orange-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Zelle
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-orange-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        CashApp
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-orange-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Cash (in-person)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="bg-glossy-light rounded-xl p-6">
              <h3 className="font-bold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Additional Notes
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></span>
                  All documents are verified within 48 hours of submission
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></span>
                  Additional documentation may be requested on a case-by-case basis
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></span>
                  Fraudulent documentation will result in immediate denial and reporting
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></span>
                  Questions? Contact us before applying for clarification
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-gradient-glossy text-white">
        <div className="container-luxury text-center">
          <h2 className="heading-section mb-4">Ready to Apply?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            If you meet these requirements, you&apos;re ready to join the GigWheels family. Start your application today!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact" className="btn btn-primary text-lg px-8 py-4 w-full sm:w-auto">
              Start Your Application
            </Link>
            <Link href="/faq" className="btn btn-outline border-white text-white hover:bg-white hover:text-glossy-black text-lg px-8 py-4 w-full sm:w-auto">
              View FAQ
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-glossy-black text-white py-12">
        <div className="container-luxury">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <Link href="/" className="text-2xl font-display font-bold">
                FX<span className="text-orange-500">Weekly</span>
              </Link>
              <p className="mt-4 text-gray-400">
                Weekly car rentals for gig drivers, with flexible weekly payments.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/fleet" className="text-gray-400 hover:text-white transition-colors">Our Fleet</Link></li>
                <li><Link href="/requirements" className="text-gray-400 hover:text-white transition-colors">Requirements</Link></li>
                <li><Link href="/faq" className="text-gray-400 hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/gps-disclosure" className="text-gray-400 hover:text-white transition-colors">GPS Disclosure</Link></li>
              </ul>
            </div>
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
            <p>&copy; {new Date().getFullYear()} GigWheels. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
