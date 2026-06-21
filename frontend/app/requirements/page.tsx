'use client';

import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Eyebrow, Section } from '@/components/site/primitives';
import { ShimmerText } from '@/components/site/fx/ShimmerText';

export default function RequirementsPage() {
  return (
    <div className="editorial min-h-screen">
      <a href="#main" className="skip-to-main">Skip to main content</a>
      <SiteNav />

      <main id="main">
        {/* Hero Section */}
        <section className="ed-section border-t ed-hairline pt-32">
          <div className="ed-container">
            <Eyebrow label="Requirements" />
            <h1 className="ed-h1 mt-5 mb-6">
              Eligibility <ShimmerText>Requirements</ShimmerText>
            </h1>
            <p className="ed-muted text-lg max-w-2xl">
              Review our straightforward requirements to ensure you&apos;re ready to join the GigWheels family.
            </p>
          </div>
        </section>

        {/* Quick Overview */}
        <section className="ed-section border-t ed-hairline">
          <div className="ed-container">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-center">
              <div>
                <div className="text-3xl font-bold text-white">21+</div>
                <div className="text-sm ed-muted">Minimum Age</div>
              </div>
              <div className="hidden md:block w-px h-12 ed-hairline border-l"></div>
              <div>
                <div className="text-3xl font-bold text-white">Valid License</div>
                <div className="text-sm ed-muted">Required</div>
              </div>
              <div className="hidden md:block w-px h-12 ed-hairline border-l"></div>
              <div>
                <div className="text-3xl font-bold text-white">Full Coverage</div>
                <div className="text-sm ed-muted">Insurance</div>
              </div>
              <div className="hidden md:block w-px h-12 ed-hairline border-l"></div>
              <div>
                <div className="text-3xl font-bold text-white">48hr</div>
                <div className="text-sm ed-muted">Verification</div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Requirements Section */}
        <Section className="border-t ed-hairline">
          <div className="max-w-4xl mx-auto">

            {/* Age & Eligibility */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-ink-card border ed-hairline flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Age &amp; Eligibility</h2>
              </div>
              <div className="ed-card p-6 md:p-8">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ed-muted">
                      <strong className="text-white">Minimum Age:</strong> Must be at least 21 years old
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ed-muted">
                      <strong className="text-white">Driving Experience:</strong> Minimum 2 years of licensed driving experience
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ed-muted">
                      <strong className="text-white">Clean Record:</strong> No major traffic violations or DUI convictions in the past 3 years
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ed-muted">
                      <strong className="text-white">Residency:</strong> Must have a valid local address for correspondence
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Identification Requirements */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-ink-card border ed-hairline flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Identification Requirements</h2>
              </div>
              <div className="ed-card p-6 md:p-8">
                <p className="ed-muted mb-6">
                  Please have the following documents ready during the application process:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-ink-card border ed-hairline p-4">
                    <h4 className="font-bold text-white mb-3 flex items-center">
                      <span className="w-8 h-8 border ed-hairline text-gold-light flex items-center justify-center text-sm font-bold mr-3">1</span>
                      Valid Driver&apos;s License
                    </h4>
                    <ul className="text-sm ed-muted space-y-2 ml-11">
                      <li>• Must be current and not expired</li>
                      <li>• Must match your current address</li>
                      <li>• No suspension or revocation history</li>
                    </ul>
                  </div>
                  <div className="bg-ink-card border ed-hairline p-4">
                    <h4 className="font-bold text-white mb-3 flex items-center">
                      <span className="w-8 h-8 border ed-hairline text-gold-light flex items-center justify-center text-sm font-bold mr-3">2</span>
                      Government-Issued ID
                    </h4>
                    <ul className="text-sm ed-muted space-y-2 ml-11">
                      <li>• State ID, Passport, or similar</li>
                      <li>• Used for identity verification</li>
                      <li>• Must include photo and DOB</li>
                    </ul>
                  </div>
                  <div className="bg-ink-card border ed-hairline p-4">
                    <h4 className="font-bold text-white mb-3 flex items-center">
                      <span className="w-8 h-8 border ed-hairline text-gold-light flex items-center justify-center text-sm font-bold mr-3">3</span>
                      Proof of Address
                    </h4>
                    <ul className="text-sm ed-muted space-y-2 ml-11">
                      <li>• Utility bill or bank statement</li>
                      <li>• Dated within the last 60 days</li>
                      <li>• Must match ID address</li>
                    </ul>
                  </div>
                  <div className="bg-ink-card border ed-hairline p-4">
                    <h4 className="font-bold text-white mb-3 flex items-center">
                      <span className="w-8 h-8 border ed-hairline text-gold-light flex items-center justify-center text-sm font-bold mr-3">4</span>
                      Contact Information
                    </h4>
                    <ul className="text-sm ed-muted space-y-2 ml-11">
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
                <div className="w-12 h-12 bg-ink-card border ed-hairline flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Insurance Requirements</h2>
              </div>
              <div className="ed-card p-6 md:p-8">
                <div className="bg-ink-card border ed-hairline p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-gold-light mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold text-gold-light">Important</span>
                  </div>
                  <p className="ed-muted text-sm">
                    Full coverage insurance is <strong className="text-white">mandatory</strong> for all leased vehicles. You must provide proof of valid insurance before vehicle pickup.
                  </p>
                </div>

                <h4 className="font-bold text-white mb-4">Required Coverage:</h4>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-ink-card border ed-hairline">
                    <div className="text-2xl font-bold text-white">$100K/$300K</div>
                    <div className="text-sm ed-muted">Bodily Injury Liability</div>
                  </div>
                  <div className="text-center p-4 bg-ink-card border ed-hairline">
                    <div className="text-2xl font-bold text-white">$50K</div>
                    <div className="text-sm ed-muted">Property Damage</div>
                  </div>
                  <div className="text-center p-4 bg-ink-card border ed-hairline">
                    <div className="text-2xl font-bold text-white">Full</div>
                    <div className="text-sm ed-muted">Comprehensive &amp; Collision</div>
                  </div>
                </div>

                <h4 className="font-bold text-white mb-4">Insurance Documentation:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ed-muted">
                      Valid insurance card showing current coverage dates
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ed-muted">
                      Insurance must list GigWheels as additional insured or lienholder
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ed-muted">
                      Policy must remain active for the duration of the lease
                    </span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ed-muted">
                      Notify us immediately of any policy changes or lapses
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Payment Requirements */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-ink-card border ed-hairline flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Payment Requirements</h2>
              </div>
              <div className="ed-card p-6 md:p-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-white mb-3">Initial Payment</h4>
                    <ul className="space-y-2 ed-muted">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-gold-light rounded-full mr-3 mt-2"></span>
                        First week&apos;s payment due at vehicle pickup
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-gold-light rounded-full mr-3 mt-2"></span>
                        Security deposit may be required (refundable)
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-gold-light rounded-full mr-3 mt-2"></span>
                        No credit check required
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-3">Accepted Payment Methods</h4>
                    <ul className="space-y-2 ed-muted">
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-gold-light mr-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Zelle
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-gold-light mr-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        CashApp
                      </li>
                      <li className="flex items-center">
                        <svg className="w-5 h-5 text-gold-light mr-3" fill="currentColor" viewBox="0 0 24 24">
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
            <div className="bg-ink-card border ed-hairline p-6">
              <h3 className="font-bold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 text-gold-light mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Additional Notes
              </h3>
              <ul className="space-y-3 ed-muted">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gold-light rounded-full mr-3 mt-2"></span>
                  All documents are verified within 48 hours of submission
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gold-light rounded-full mr-3 mt-2"></span>
                  Additional documentation may be requested on a case-by-case basis
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gold-light rounded-full mr-3 mt-2"></span>
                  Fraudulent documentation will result in immediate denial and reporting
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-gold-light rounded-full mr-3 mt-2"></span>
                  Questions? Contact us before applying for clarification
                </li>
              </ul>
            </div>

          </div>
        </Section>

        {/* CTA Section */}
        <Section className="border-t ed-hairline">
          <div className="text-center">
            <h2 className="ed-h2 mb-4">Ready to Apply?</h2>
            <p className="ed-muted text-lg mb-8 max-w-2xl mx-auto">
              If you meet these requirements, you&apos;re ready to join the GigWheels family. Start your application today!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="ed-cta ed-cta-primary">
                Start Your Application
              </Link>
              <Link href="/faq" className="ed-cta ed-cta-ghost">
                View FAQ
              </Link>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
