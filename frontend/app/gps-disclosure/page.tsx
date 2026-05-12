'use client';

import Link from 'next/link';

export default function GPSDisclosurePage() {
  const lastUpdated = 'January 15, 2026';

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-glossy-black/90 shadow-sm sticky top-0 z-50 border-b border-glossy-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold">
              <span className="text-white">FX</span>
              <span className="text-gradient-glow">Weekly</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/fleet" className="text-gray-400 hover:text-white transition-colors">
                Our Fleet
              </Link>
              <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="/requirements" className="text-gray-400 hover:text-white transition-colors">
                Requirements
              </Link>
              <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                FAQ
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                Contact
              </Link>
            </div>
            <button className="md:hidden text-white hover:bg-glossy-light">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-glossy text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            GPS & Telematics <span className="text-gradient-glow">Disclosure</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Important information about vehicle tracking technology installed in our leased vehicles.
          </p>
          <p className="text-gray-400 mt-4">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-glossy-dark rounded-2xl shadow-lg p-8 sm:p-12">
            {/* Important Notice Banner */}
            <div className="mb-12 p-6 bg-orange-50 border-2 border-orange-200 rounded-xl">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-orange-800 mb-2">Important Disclosure Notice</h2>
                  <p className="text-orange-700">
                    All vehicles leased from FX Weekly Lease are equipped with GPS tracking and telematics devices. By signing a lease agreement with us, you acknowledge and consent to vehicle monitoring as described in this disclosure.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 1: Overview */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                What is GPS/Telematics Tracking?
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>
                  GPS (Global Positioning System) and telematics technology allows us to monitor the location and certain operational data of our leased vehicles in real-time. This technology is standard in our industry and serves important purposes for both our business operations and your safety.
                </p>
                <div className="bg-glossy-black rounded-lg p-4 mt-4">
                  <h3 className="font-semibold text-white mb-2">Our Tracking System Monitors:</h3>
                  <ul className="list-disc pl-6 space-y-1 text-gray-300">
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
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                Purpose of Vehicle Tracking
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>We use GPS and telematics data for the following legitimate business purposes:</p>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <h3 className="font-semibold text-white">Asset Protection</h3>
                    </div>
                    <p className="text-sm">Locating and recovering vehicles in case of theft or unauthorized use</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3 className="font-semibold text-white">Fleet Management</h3>
                    </div>
                    <p className="text-sm">Managing vehicle availability, scheduling maintenance, and optimizing operations</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <h3 className="font-semibold text-white">Mileage Verification</h3>
                    </div>
                    <p className="text-sm">Ensuring compliance with lease mileage limits and calculating overage fees</p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                What We Do NOT Use Tracking Data For
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <p className="text-green-800 font-medium mb-2">We respect your privacy and commit to the following:</p>
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
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                Customer Consent Requirements
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>
                  By entering into a vehicle lease agreement with FX Weekly Lease, you provide consent for vehicle tracking as follows:
                </p>

                <div className="bg-glossy-black rounded-lg p-6 mt-4">
                  <h3 className="font-semibold text-white mb-4">Your Acknowledgment Includes:</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Understanding that the leased vehicle is equipped with GPS tracking technology</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Consent to location monitoring for the purposes described in this disclosure</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Agreement not to tamper with, disable, or interfere with tracking equipment</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Informing any authorized drivers about vehicle tracking</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                  <p className="text-yellow-800">
                    <strong>Important:</strong> Tampering with or disabling GPS tracking equipment is a violation of your lease agreement and may result in immediate lease termination and additional fees.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: Data Handling */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">5</span>
                Data Security and Retention
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>We take the security of your location data seriously:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Encryption:</strong> All GPS data is encrypted during transmission and storage</li>
                  <li><strong>Access Controls:</strong> Only authorized personnel can access location data</li>
                  <li><strong>Retention Period:</strong> Detailed location data is retained for 90 days; summary data may be kept longer</li>
                  <li><strong>Secure Deletion:</strong> Data is securely deleted after the retention period expires</li>
                </ul>
                <p className="mt-4">
                  For more information about how we handle your data, please see our <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>.
                </p>
              </div>
            </section>

            {/* Section 6: Your Rights */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">6</span>
                Your Rights Regarding GPS Data
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>As a customer, you have certain rights regarding your GPS data:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> You may request a copy of your location data from your lease period</li>
                  <li><strong>Questions:</strong> You may ask questions about how your data is being used</li>
                  <li><strong>Notification:</strong> You will be informed if we share your data with law enforcement (unless legally prohibited)</li>
                  <li><strong>Deletion:</strong> After your lease ends and retention period expires, your data will be deleted</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, contact us at <span className="font-medium">privacy@fxweekly.com</span>.
                </p>
              </div>
            </section>

            {/* Section 7: Legal Requirements */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">7</span>
                Legal Disclosure Requirements
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
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
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">8</span>
                Questions About This Disclosure
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>
                  If you have questions about our GPS tracking practices or this disclosure, please contact us:
                </p>
                <div className="bg-glossy-black rounded-lg p-6 mt-4">
                  <p className="font-semibold text-white">FX Weekly Lease - Compliance Team</p>
                  <p>123 Main Street</p>
                  <p>City, State 12345</p>
                  <p className="mt-4">
                    <strong>Email:</strong> compliance@fxweekly.com
                  </p>
                  <p>
                    <strong>Phone:</strong> (555) 123-4567
                  </p>
                  <p>
                    <strong>Hours:</strong> Mon-Fri, 9AM - 5PM
                  </p>
                </div>
              </div>
            </section>

            {/* Acknowledgment Footer */}
            <div className="border-t border-glossy-border pt-8 mt-8">
              <div className="bg-glossy-black rounded-lg p-6 text-center">
                <p className="text-gray-300 mb-4">
                  By leasing a vehicle from FX Weekly Lease, you acknowledge that you have read, understood, and consent to the GPS tracking practices described in this disclosure.
                </p>
                <p className="text-sm text-gray-400">
                  This disclosure is provided in compliance with applicable state and federal laws regarding vehicle tracking notification requirements.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Link
                  href="/privacy"
                  className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors text-center"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="bg-glossy-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-glossy-light transition-colors border border-glossy-border text-center"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-glossy-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="text-2xl font-bold inline-block mb-4">
                <span className="text-white">FX</span>
                <span className="text-orange-500">Weekly</span>
              </Link>
              <p className="text-gray-400 text-sm">
                Premium weekly vehicle leasing made simple and accessible.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/fleet" className="hover:text-orange-500 transition-colors">Our Fleet</Link></li>
                <li><Link href="/how-it-works" className="hover:text-orange-500 transition-colors">How It Works</Link></li>
                <li><Link href="/requirements" className="hover:text-orange-500 transition-colors">Requirements</Link></li>
                <li><Link href="/faq" className="hover:text-orange-500 transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-orange-500 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-orange-500 transition-colors">Terms of Service</Link></li>
                <li><Link href="/gps-disclosure" className="text-orange-500">GPS Disclosure</Link></li>
                <li><Link href="/contact" className="hover:text-orange-500 transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>123 Main Street</li>
                <li>City, State 12345</li>
                <li className="pt-2">compliance@fxweekly.com</li>
                <li>(555) 123-4567</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; 2026 FX Weekly Lease. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
