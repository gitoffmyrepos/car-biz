'use client';

import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Eyebrow, Section } from '@/components/site/primitives';

export default function GPSDisclosurePage() {
  const lastUpdated = 'January 15, 2026';

  return (
    <div className="editorial min-h-screen">
      <SiteNav />

      <main id="main">
        {/* Hero Section */}
        <section className="ed-section border-t ed-hairline pt-32">
          <div className="ed-container">
            <Eyebrow label="GPS Disclosure" />
            <h1 className="ed-h1 mt-5 mb-6">GPS &amp; Telematics Disclosure</h1>
            <p className="ed-muted text-lg max-w-2xl">
              Important information about vehicle tracking technology installed in our leased vehicles.
            </p>
            <p className="ed-muted mt-4 text-sm">Last Updated: {lastUpdated}</p>
          </div>
        </section>

        {/* Main Content */}
        <Section className="border-t ed-hairline">
          <div className="max-w-4xl mx-auto">
            <div className="ed-card p-6 md:p-8">
              {/* Important Notice Banner */}
              <div className="mb-12 p-6 bg-ink-card border ed-hairline">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Important Disclosure Notice</h2>
                    <p className="ed-muted">
                      All vehicles leased from GigWheels are equipped with GPS tracking and telematics devices. By signing a lease agreement with us, you acknowledge and consent to vehicle monitoring as described in this disclosure.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1: Overview */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">1</span>
                  What is GPS/Telematics Tracking?
                </h2>
                <div className="ed-muted space-y-4 pl-11">
                  <p>
                    GPS (Global Positioning System) and telematics technology allows us to monitor the location and certain operational data of our leased vehicles in real-time. This technology is standard in our industry and serves important purposes for both our business operations and your safety.
                  </p>
                  <div className="bg-ink-card border ed-hairline p-4 mt-4">
                    <h3 className="font-semibold text-white mb-2">Our Tracking System Monitors:</h3>
                    <ul className="list-disc pl-6 space-y-1 ed-muted">
                      <li>Real-time vehicle location</li>
                      <li>Historical location data and trip history</li>
                      <li>Total mileage and distance traveled</li>
                      <li>Vehicle diagnostics and maintenance alerts</li>
                      <li>Engine status (on/off)</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 2: Purpose */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">2</span>
                  Purpose of Vehicle Tracking
                </h2>
                <div className="ed-muted space-y-4 pl-11">
                  <p>We use GPS and telematics data for the following legitimate business purposes:</p>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-ink-card border ed-hairline p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h3 className="font-semibold text-white">Asset Protection</h3>
                      </div>
                      <p className="text-sm">Locating and recovering vehicles in case of theft or unauthorized use</p>
                    </div>

                    <div className="bg-ink-card border ed-hairline p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="font-semibold text-white">Fleet Management</h3>
                      </div>
                      <p className="text-sm">Managing vehicle availability, scheduling maintenance, and optimizing operations</p>
                    </div>

                    <div className="bg-ink-card border ed-hairline p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <h3 className="font-semibold text-white">Mileage Verification</h3>
                      </div>
                      <p className="text-sm">Ensuring compliance with lease mileage limits and calculating overage fees</p>
                    </div>

                    <div className="bg-ink-card border ed-hairline p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <h3 className="font-semibold text-white">Emergency Assistance</h3>
                      </div>
                      <p className="text-sm">Providing location data in case of accidents or emergencies</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="font-semibold text-white mb-2">Additional Purposes:</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Lease Compliance:</strong> Verifying vehicles are used within agreed geographic boundaries</li>
                      <li><strong>Maintenance Scheduling:</strong> Proactive scheduling based on mileage and diagnostics</li>
                      <li><strong>Insurance Claims:</strong> Providing location and trip data to support insurance claims</li>
                      <li><strong>Legal Compliance:</strong> Responding to valid legal requests from law enforcement</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3: What We Don't Do */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">3</span>
                  What We Do NOT Use Tracking Data For
                </h2>
                <div className="ed-muted space-y-4 pl-11">
                  <div className="bg-ink-card border-l-2 border-gold-light p-4">
                    <p className="text-white font-medium mb-2">We respect your privacy and commit to the following:</p>
                  </div>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>No Marketing Sales:</strong> We never sell your location data to third parties for marketing or advertising purposes</li>
                    <li><strong>No Driving Behavior Scoring:</strong> We do not use tracking data to create driving behavior scores or profiles</li>
                    <li><strong>No Insurance Pricing:</strong> Your tracking data is not shared with insurance companies to affect your rates</li>
                    <li><strong>No Constant Monitoring:</strong> We do not actively monitor your movements in real-time unless there is a legitimate business need</li>
                    <li><strong>No Employee Access:</strong> Access to location data is restricted to authorized personnel only for specific purposes</li>
                  </ul>
                </div>
              </section>

              {/* Section 4: Customer Consent */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">4</span>
                  Customer Consent Requirements
                </h2>
                <div className="ed-muted space-y-4 pl-11">
                  <p>
                    By entering into a vehicle lease agreement with GigWheels, you provide consent for vehicle tracking as follows:
                  </p>

                  <div className="bg-ink-card border ed-hairline p-6 mt-4">
                    <h3 className="font-semibold text-white mb-4">Your Acknowledgment Includes:</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Understanding that the leased vehicle is equipped with GPS tracking technology</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Consent to location monitoring for the purposes described in this disclosure</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Agreement not to tamper with, disable, or interfere with tracking equipment</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-gold-light mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Informing any authorized drivers about vehicle tracking</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-ink-card border-l-2 border-gold-light p-4 mt-4">
                    <p className="text-white">
                      <strong>Important:</strong> Tampering with or disabling GPS tracking equipment is a violation of your lease agreement and may result in immediate lease termination and additional fees.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 5: Data Handling */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">5</span>
                  Data Security and Retention
                </h2>
                <div className="ed-muted space-y-4 pl-11">
                  <p>We take the security of your location data seriously:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Encryption:</strong> All GPS data is encrypted during transmission and storage</li>
                    <li><strong>Access Controls:</strong> Only authorized personnel can access location data</li>
                    <li><strong>Retention Period:</strong> Detailed location data is retained for 90 days; summary data may be kept longer</li>
                    <li><strong>Secure Deletion:</strong> Data is securely deleted after the retention period expires</li>
                  </ul>
                  <p className="mt-4">
                    For more information about how we handle your data, please see our <Link href="/privacy" className="text-gold-light hover:underline">Privacy Policy</Link>.
                  </p>
                </div>
              </section>

              {/* Section 6: Your Rights */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">6</span>
                  Your Rights Regarding GPS Data
                </h2>
                <div className="ed-muted space-y-4 pl-11">
                  <p>As a customer, you have certain rights regarding your GPS data:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Access:</strong> You may request a copy of your location data from your lease period</li>
                    <li><strong>Questions:</strong> You may ask questions about how your data is being used</li>
                    <li><strong>Notification:</strong> You will be informed if we share your data with law enforcement (unless legally prohibited)</li>
                    <li><strong>Deletion:</strong> After your lease ends and retention period expires, your data will be deleted</li>
                  </ul>
                  <p className="mt-4">
                    To exercise these rights, contact us at <span className="font-medium text-white">apply@gigwheels.strategybase.io</span>.
                  </p>
                </div>
              </section>

              {/* Section 7: Legal Requirements */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">7</span>
                  Legal Disclosure Requirements
                </h2>
                <div className="ed-muted space-y-4 pl-11">
                  <p>
                    We may be required to disclose GPS data in certain circumstances:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Valid court orders or subpoenas</li>
                    <li>Law enforcement requests with proper legal authority</li>
                    <li>Emergency situations involving imminent harm to persons</li>
                    <li>Investigations into vehicle theft or fraud</li>
                  </ul>
                  <p className="mt-4">
                    We will notify you of any such disclosure unless we are legally prohibited from doing so.
                  </p>
                </div>
              </section>

              {/* Section 8: Contact */}
              <section className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">8</span>
                  Questions About This Disclosure
                </h2>
                <div className="ed-muted space-y-4 pl-11">
                  <p>
                    If you have questions about our GPS tracking practices or this disclosure, please contact us:
                  </p>
                  <div className="bg-ink-card border ed-hairline p-6 mt-4">
                    <p className="font-semibold text-white">GigWheels - Compliance Team</p>
                    <p>Katy, TX</p>
                    <p>Greater Houston Area</p>
                    <p className="mt-4">
                      <strong>Email:</strong> apply@gigwheels.strategybase.io
                    </p>
                    <p>
                      <strong>Phone:</strong> (346) 587-1177
                    </p>
                    <p>
                      <strong>Hours:</strong> Mon-Fri, 9AM - 5PM
                    </p>
                  </div>
                </div>
              </section>

              {/* Acknowledgment Footer */}
              <div className="border-t ed-hairline pt-8 mt-8">
                <div className="bg-ink-card border ed-hairline p-6 text-center">
                  <p className="ed-muted mb-4">
                    By leasing a vehicle from GigWheels, you acknowledge that you have read, understood, and consent to the GPS tracking practices described in this disclosure.
                  </p>
                  <p className="text-sm ed-muted">
                    This disclosure is provided in compliance with applicable state and federal laws regarding vehicle tracking notification requirements.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <Link href="/privacy" className="ed-cta ed-cta-primary">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="ed-cta ed-cta-ghost">
                    Terms of Service
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
