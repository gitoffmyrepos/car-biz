'use client';

import Link from 'next/link';

export default function PrivacyPage() {
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
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Privacy <span className="text-gradient-glow">Policy</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
          </p>
          <p className="text-gray-400 mt-4">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-glossy-dark rounded-2xl shadow-lg p-8 sm:p-12">
            {/* Quick Summary */}
            <div className="mb-12 p-6 bg-blue-50 rounded-xl border border-blue-200">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-4 flex items-center">
                <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Privacy at a Glance
              </h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  We collect only the information necessary to provide our leasing services
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  We never sell your personal information to third parties
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Vehicle GPS data is used solely for fleet management and security
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  You can request access to or deletion of your data at any time
                </li>
              </ul>
            </div>

            {/* Table of Contents */}
            <div className="mb-12 p-6 bg-glossy-black rounded-xl">
              <h2 className="text-xl font-bold text-white mb-4">Table of Contents</h2>
              <ul className="space-y-2 text-orange-500">
                <li><a href="#information-collected" className="hover:underline">1. Information We Collect</a></li>
                <li><a href="#how-we-use" className="hover:underline">2. How We Use Your Information</a></li>
                <li><a href="#information-sharing" className="hover:underline">3. Information Sharing and Disclosure</a></li>
                <li><a href="#data-security" className="hover:underline">4. Data Security</a></li>
                <li><a href="#data-retention" className="hover:underline">5. Data Retention</a></li>
                <li><a href="#your-rights" className="hover:underline">6. Your Privacy Rights</a></li>
                <li><a href="#cookies" className="hover:underline">7. Cookies and Tracking</a></li>
                <li><a href="#gps-tracking" className="hover:underline">8. GPS and Vehicle Tracking</a></li>
                <li><a href="#children" className="hover:underline">9. Children's Privacy</a></li>
                <li><a href="#changes" className="hover:underline">10. Changes to This Policy</a></li>
                <li><a href="#contact" className="hover:underline">11. Contact Us</a></li>
              </ul>
            </div>

            {/* Section 1 */}
            <section id="information-collected" className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                Information We Collect
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>We collect several types of information to provide and improve our services:</p>

                <h3 className="font-semibold text-white mt-4">Personal Information You Provide:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Contact Information:</strong> Name, email address, phone number, mailing address</li>
                  <li><strong>Identity Verification:</strong> Driver's license number, government ID, date of birth</li>
                  <li><strong>Financial Information:</strong> Payment method details, billing address</li>
                  <li><strong>Insurance Information:</strong> Policy number, coverage details, insurance provider</li>
                  <li><strong>Employment Information:</strong> Employer name, work address (if provided)</li>
                </ul>

                <h3 className="font-semibold text-white mt-4">Information Collected Automatically:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
                  <li><strong>Usage Data:</strong> Pages visited, time spent on site, referral source</li>
                  <li><strong>Vehicle Telematics:</strong> GPS location, mileage, driving data (see Section 8)</li>
                </ul>

                <h3 className="font-semibold text-white mt-4">Information from Third Parties:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>DMV records for license verification</li>
                  <li>Insurance verification from your provider</li>
                  <li>Background check results (with your consent)</li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section id="how-we-use" className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                How We Use Your Information
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>We use the information we collect for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Service Delivery:</strong> Processing applications, managing leases, and providing customer support</li>
                  <li><strong>Identity Verification:</strong> Confirming your identity and eligibility for our services</li>
                  <li><strong>Payment Processing:</strong> Processing weekly payments and managing billing</li>
                  <li><strong>Communication:</strong> Sending lease confirmations, payment reminders, and service updates</li>
                  <li><strong>Fleet Management:</strong> Tracking vehicle location, maintenance scheduling, and security</li>
                  <li><strong>Legal Compliance:</strong> Meeting regulatory requirements and responding to legal requests</li>
                  <li><strong>Service Improvement:</strong> Analyzing usage patterns to enhance our services</li>
                  <li><strong>Marketing:</strong> Sending promotional offers (with your consent; you can opt out anytime)</li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section id="information-sharing" className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                Information Sharing and Disclosure
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                  <p className="text-green-800 font-medium">
                    We never sell your personal information to third parties for marketing purposes.
                  </p>
                </div>
                <p>We may share your information only in the following circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Service Providers:</strong> Third parties who help us operate our business (payment processors, insurance verification services)</li>
                  <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                  <li><strong>Safety and Security:</strong> To protect our rights, safety, or property, or that of our customers</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
                </ul>
                <p className="mt-4">
                  All service providers are contractually obligated to protect your information and use it only for the purposes we specify.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section id="data-security" className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                Data Security
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>We implement robust security measures to protect your personal information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Encryption:</strong> All sensitive data is encrypted in transit and at rest using industry-standard protocols</li>
                  <li><strong>Access Controls:</strong> Limited access to personal information on a need-to-know basis</li>
                  <li><strong>Security Monitoring:</strong> Continuous monitoring for unauthorized access or breaches</li>
                  <li><strong>Employee Training:</strong> Regular security awareness training for all staff</li>
                  <li><strong>Secure Infrastructure:</strong> Data stored on secure, access-controlled servers</li>
                </ul>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                  <p className="text-yellow-800">
                    <strong>Important:</strong> While we take extensive precautions, no method of transmission over the Internet is 100% secure. Please contact us immediately if you believe your account has been compromised.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section id="data-retention" className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">5</span>
                Data Retention
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>We retain your personal information for as long as necessary to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide our services to you</li>
                  <li>Comply with legal obligations</li>
                  <li>Resolve disputes and enforce agreements</li>
                </ul>
                <p className="mt-4"><strong>Specific retention periods:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Active Customer Data:</strong> Retained throughout your relationship with us</li>
                  <li><strong>Lease Records:</strong> 7 years after lease termination (for tax/legal purposes)</li>
                  <li><strong>Vehicle Telemetry Data:</strong> 90 days of detailed data; aggregated data retained longer</li>
                  <li><strong>Marketing Preferences:</strong> Until you update or opt out</li>
                </ul>
              </div>
            </section>

            {/* Section 6 */}
            <section id="your-rights" className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">6</span>
                Your Privacy Rights
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal retention requirements)</li>
                  <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
                  <li><strong>Opt-Out:</strong> Opt out of marketing communications at any time</li>
                  <li><strong>Restrict Processing:</strong> Request that we limit how we use your data</li>
                </ul>
                <p className="mt-4">
                  To exercise any of these rights, please contact us at privacy@fxweekly.com. We will respond to your request within 30 days.
                </p>
                <div className="bg-[#F8F5F0] rounded-lg p-4 mt-4">
                  <p className="text-sm">
                    <strong>California Residents:</strong> You have additional rights under the California Consumer Privacy Act (CCPA). Contact us for more information about your CCPA rights.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section id="cookies" className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">7</span>
                Cookies and Tracking
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>We use cookies and similar tracking technologies to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Understand how you use our website</li>
                  <li>Improve our website functionality</li>
                  <li>Provide personalized content</li>
                </ul>
                <h3 className="font-semibold text-white mt-4">Types of Cookies We Use:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Essential Cookies:</strong> Required for basic website functionality</li>
                  <li><strong>Analytical Cookies:</strong> Help us understand website usage patterns</li>
                  <li><strong>Functional Cookies:</strong> Remember your preferences</li>
                </ul>
                <p className="mt-4">
                  You can control cookies through your browser settings. Note that disabling certain cookies may affect website functionality.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section id="gps-tracking" className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">8</span>
                GPS and Vehicle Tracking
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4">
                  <p className="text-orange-800 font-medium">
                    All leased vehicles are equipped with GPS tracking devices. By leasing a vehicle from us, you consent to this tracking.
                  </p>
                </div>
                <h3 className="font-semibold text-white">What We Track:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Real-time vehicle location</li>
                  <li>Mileage and trip data</li>
                  <li>Vehicle diagnostics and maintenance alerts</li>
                </ul>
                <h3 className="font-semibold text-white mt-4">How We Use This Data:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Fleet Management:</strong> Scheduling maintenance and managing vehicle availability</li>
                  <li><strong>Security:</strong> Locating vehicles in case of theft or unauthorized use</li>
                  <li><strong>Mileage Verification:</strong> Ensuring compliance with lease terms</li>
                  <li><strong>Emergency Response:</strong> Assisting in accidents or emergencies</li>
                </ul>
                <h3 className="font-semibold text-white mt-4">We Do NOT:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Share your location data with third parties for marketing</li>
                  <li>Monitor your driving behavior for insurance scoring</li>
                  <li>Use tracking data for any purpose other than fleet management and security</li>
                </ul>
                <p className="mt-4">
                  For more details, please see our <Link href="/gps-disclosure" className="text-orange-500 hover:underline">GPS/Telematics Disclosure</Link>.
                </p>
              </div>
            </section>

            {/* Section 9 */}
            <section id="children" className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">9</span>
                Children's Privacy
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>
                  Our services are not intended for individuals under the age of 21. We do not knowingly collect personal information from anyone under 21 years of age.
                </p>
                <p>
                  If we become aware that we have collected personal information from someone under 21, we will take steps to delete that information immediately.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section id="changes" className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">10</span>
                Changes to This Policy
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons.
                </p>
                <p>
                  When we make material changes, we will:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Update the "Last Updated" date at the top of this policy</li>
                  <li>Notify you via email (for active customers)</li>
                  <li>Post a notice on our website</li>
                </ul>
                <p className="mt-4">
                  We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
                </p>
              </div>
            </section>

            {/* Section 11 */}
            <section id="contact" className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">11</span>
                Contact Us
              </h2>
              <div className="text-gray-300 space-y-4 pl-11">
                <p>
                  If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-glossy-black rounded-lg p-6 mt-4">
                  <p className="font-semibold text-white">GigWheels - Privacy Team</p>
                  <p>123 Main Street</p>
                  <p>City, State 12345</p>
                  <p className="mt-4">
                    <strong>Email:</strong> privacy@fxweekly.com
                  </p>
                  <p>
                    <strong>Phone:</strong> (555) 123-4567
                  </p>
                  <p>
                    <strong>Hours:</strong> Mon-Fri, 9AM - 5PM
                  </p>
                </div>
                <p className="mt-4 text-sm">
                  For data access, correction, or deletion requests, please allow up to 30 days for processing.
                </p>
              </div>
            </section>

            {/* Footer Actions */}
            <div className="border-t border-glossy-border pt-8 mt-8 text-center">
              <p className="text-gray-300 mb-6">
                By using GigWheels services, you acknowledge that you have read and understood this Privacy Policy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                >
                  Contact Us
                </Link>
                <Link
                  href="/terms"
                  className="bg-glossy-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-glossy-light transition-colors border border-glossy-border"
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
                Weekly car rentals for gig drivers — simple and accessible.
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
                <li><Link href="/privacy" className="text-orange-500">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-orange-500 transition-colors">Terms of Service</Link></li>
                <li><Link href="/gps-disclosure" className="hover:text-orange-500 transition-colors">GPS Disclosure</Link></li>
                <li><Link href="/contact" className="hover:text-orange-500 transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>123 Main Street</li>
                <li>City, State 12345</li>
                <li className="pt-2">privacy@fxweekly.com</li>
                <li>(555) 123-4567</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; 2026 GigWheels. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
