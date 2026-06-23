'use client';

import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Eyebrow } from '@/components/site/primitives';
import { ShimmerText } from '@/components/site/fx/ShimmerText';

export default function TermsPage() {
  const lastUpdated = 'January 15, 2026';

  return (
    <div className="editorial min-h-screen">
      <a href="#main" className="skip-to-main">Skip to main content</a>
      <SiteNav />

      <main id="main">
      {/* Hero Section */}
      <section className="ed-section border-t ed-hairline pt-32">
        <div className="ed-container">
          <Eyebrow label="Legal" />
          <h1 className="ed-h1 mt-5 mb-6">
            Terms of <ShimmerText>Service</ShimmerText>
          </h1>
          <p className="ed-muted text-lg max-w-2xl">
            Please read these terms carefully before using our weekly car-rental services.
          </p>
          <p className="ed-muted mt-4 text-sm">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Terms Content */}
      <section className="ed-section border-t ed-hairline">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="ed-card p-6 md:p-8 sm:p-12">
            {/* Table of Contents */}
            <div className="mb-12 p-6 bg-ink-card border ed-hairline">
              <h2 className="text-xl font-bold text-white mb-4">Table of Contents</h2>
              <ul className="space-y-2 text-gold-light">
                <li><a href="#acceptance" className="hover:underline">1. Acceptance of Terms</a></li>
                <li><a href="#eligibility" className="hover:underline">2. Eligibility Requirements</a></li>
                <li><a href="#leasing" className="hover:underline">3. Vehicle Leasing Agreement</a></li>
                <li><a href="#payments" className="hover:underline">4. Payment Terms</a></li>
                <li><a href="#insurance" className="hover:underline">5. Insurance Requirements</a></li>
                <li><a href="#vehicle-use" className="hover:underline">6. Vehicle Use and Care</a></li>
                <li><a href="#termination" className="hover:underline">7. Termination and Returns</a></li>
                <li><a href="#liability" className="hover:underline">8. Limitation of Liability</a></li>
                <li><a href="#disputes" className="hover:underline">9. Dispute Resolution</a></li>
                <li><a href="#changes" className="hover:underline">10. Changes to Terms</a></li>
                <li><a href="#contact" className="hover:underline">11. Contact Information</a></li>
              </ul>
            </div>

            {/* Section 1 */}
            <section id="acceptance" className="mb-10">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">1</span>
                Acceptance of Terms
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p>
                  By accessing or using GigWheels services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our services.
                </p>
                <p>
                  These terms constitute a legally binding agreement between you ("Lessee," "Customer," or "You") and GigWheels ("Company," "We," or "Us") governing your use of our weekly car-rental services.
                </p>
                <p>
                  Your continued use of our services following any modifications to these terms constitutes acceptance of those changes.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section id="eligibility" className="mb-10">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">2</span>
                Eligibility Requirements
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p>To be eligible for our weekly car-rental services, you must meet the following requirements:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Be at least 21 years of age</li>
                  <li>Hold a valid driver's license for a minimum of 2 years</li>
                  <li>Maintain a clean driving record with no major violations in the past 3 years</li>
                  <li>Provide valid government-issued identification</li>
                  <li>Provide proof of current residential address</li>
                  <li>Maintain valid auto insurance meeting our minimum coverage requirements</li>
                  <li>Pass our verification process within 48 hours of application</li>
                </ul>
                <p>
                  We reserve the right to deny service to any individual who does not meet these requirements or whose application raises concerns during our verification process.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section id="leasing" className="mb-10">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">3</span>
                Vehicle Leasing Agreement
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p>
                  Our weekly leasing model provides flexible, short-term vehicle access without long-term commitments. Key terms include:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Lease Duration:</strong> Minimum one week, renewable on a weekly basis</li>
                  <li><strong>Vehicle Assignment:</strong> Vehicles are assigned based on availability and customer preference</li>
                  <li><strong>Mileage:</strong> Weekly mileage allowances vary by vehicle category; excess mileage fees apply</li>
                  <li><strong>Vehicle Condition:</strong> Vehicles must be returned in the same condition as received, normal wear excepted</li>
                  <li><strong>Reservation:</strong> Advance reservations are recommended but subject to availability</li>
                </ul>
                <p>
                  A separate Vehicle Lease Agreement specific to your rental will be provided at the time of vehicle pickup, detailing the exact terms for your lease period.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section id="payments" className="mb-10">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">4</span>
                Payment Terms
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p>Payment for our services is structured as follows:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Initial Payment:</strong> First week's lease payment plus security deposit due at vehicle pickup</li>
                  <li><strong>Weekly Payments:</strong> Due every 7 days from the initial lease date</li>
                  <li><strong>Accepted Methods:</strong> Zelle, CashApp, and Cash payments accepted</li>
                  <li><strong>Late Payments:</strong> Payments received more than 24 hours past due may incur late fees</li>
                  <li><strong>Security Deposit:</strong> Refundable upon satisfactory vehicle return, less any applicable charges</li>
                </ul>
                <p>
                  All prices are quoted in US Dollars. We reserve the right to adjust pricing with 7 days' notice for ongoing leases.
                </p>
                <div className="bg-ink-card border-l-4 p-4 mt-4" style={{ borderColor: 'var(--ed-gold)' }}>
                  <p className="text-white">
                    <strong className="text-gold-light">Important:</strong> Failure to make timely payments may result in vehicle repossession and additional fees.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section id="insurance" className="mb-10">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">5</span>
                Insurance Requirements
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p>All lessees must maintain auto insurance meeting the following minimum requirements:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Bodily Injury Liability:</strong> $100,000 per person / $300,000 per accident</li>
                  <li><strong>Property Damage Liability:</strong> $50,000 minimum</li>
                  <li><strong>Comprehensive & Collision:</strong> Full coverage required</li>
                  <li><strong>Uninsured/Underinsured Motorist:</strong> Recommended but not required</li>
                </ul>
                <p>
                  You must provide proof of insurance listing GigWheels as an additional insured party before vehicle pickup. Insurance must remain active throughout the lease period.
                </p>
                <p>
                  In the event your insurance lapses or is cancelled, you must notify us immediately. Failure to maintain required insurance coverage is grounds for immediate lease termination.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="vehicle-use" className="mb-10">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">6</span>
                Vehicle Use and Care
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p>As a lessee, you agree to the following vehicle use policies:</p>
                <h3 className="font-semibold text-white mt-4">Permitted Use:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Personal transportation within the continental United States</li>
                  <li>Only licensed drivers listed on the lease agreement may operate the vehicle</li>
                  <li>Vehicle must be used in accordance with all traffic laws and regulations</li>
                </ul>
                <h3 className="font-semibold text-white mt-4">Prohibited Use:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Commercial purposes including ride-sharing services (Uber, Lyft, etc.)</li>
                  <li>Racing, stunts, or reckless driving</li>
                  <li>Transporting illegal substances or contraband</li>
                  <li>Towing or pushing other vehicles</li>
                  <li>Off-road driving or use on unpaved surfaces</li>
                  <li>Smoking in the vehicle</li>
                  <li>Transporting pets without prior approval</li>
                </ul>
                <h3 className="font-semibold text-white mt-4">Maintenance Responsibilities:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Regular fuel fill-ups with appropriate fuel grade</li>
                  <li>Checking and maintaining fluid levels</li>
                  <li>Reporting any mechanical issues or warning lights immediately</li>
                  <li>Keeping the vehicle clean and free from excessive dirt or debris</li>
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section id="termination" className="mb-10">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">7</span>
                Termination and Returns
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p><strong>Customer-Initiated Termination:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You may terminate your lease at any time with 48 hours' notice</li>
                  <li>No early termination fees apply for leases ended at the end of a weekly period</li>
                  <li>Pro-rated refunds are not available for partial weeks</li>
                </ul>
                <p className="mt-4"><strong>Company-Initiated Termination:</strong></p>
                <p>We reserve the right to terminate any lease immediately for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Breach of any term in this agreement</li>
                  <li>Non-payment or late payment</li>
                  <li>Insurance coverage lapse</li>
                  <li>Prohibited vehicle use</li>
                  <li>Vehicle damage or abuse</li>
                  <li>False information on application</li>
                </ul>
                <p className="mt-4"><strong>Vehicle Return:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Vehicles must be returned to the designated location by the agreed time</li>
                  <li>Late returns may incur additional daily charges</li>
                  <li>Vehicle must be returned with the same fuel level as pickup</li>
                  <li>All personal belongings must be removed; we are not responsible for lost items</li>
                </ul>
              </div>
            </section>

            {/* Section 8 */}
            <section id="liability" className="mb-10">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">8</span>
                Limitation of Liability
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p>
                  To the maximum extent permitted by law, GigWheels shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services or vehicles.
                </p>
                <p>
                  Our total liability for any claims arising from your lease shall not exceed the total amount paid by you for the current lease period.
                </p>
                <p>
                  You agree to indemnify and hold harmless GigWheels, its officers, directors, employees, and agents from any claims, damages, or expenses arising from:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your use of our vehicles</li>
                  <li>Your violation of these terms</li>
                  <li>Any accident, injury, or damage occurring during your lease period</li>
                  <li>Any third-party claims related to your vehicle use</li>
                </ul>
              </div>
            </section>

            {/* Section 9 */}
            <section id="disputes" className="mb-10">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">9</span>
                Dispute Resolution
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p>
                  Any disputes arising from these terms or your use of our services shall be resolved as follows:
                </p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li><strong>Informal Resolution:</strong> We encourage you to contact us first to attempt to resolve any dispute informally.</li>
                  <li><strong>Mediation:</strong> If informal resolution fails, disputes may be submitted to mediation.</li>
                  <li><strong>Arbitration:</strong> Unresolved disputes shall be submitted to binding arbitration in accordance with the rules of the American Arbitration Association.</li>
                  <li><strong>Governing Law:</strong> These terms shall be governed by and construed in accordance with the laws of the State in which services are provided.</li>
                </ol>
                <p>
                  You agree to waive any right to participate in class action lawsuits against GigWheels.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section id="changes" className="mb-10">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">10</span>
                Changes to Terms
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p>
                  We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to our website.
                </p>
                <p>
                  For material changes that affect active leases, we will provide at least 7 days' notice via email to the address on file.
                </p>
                <p>
                  It is your responsibility to review these terms periodically. Your continued use of our services after changes constitutes acceptance of the modified terms.
                </p>
              </div>
            </section>

            {/* Section 11 */}
            <section id="contact" className="mb-6">
              <h2 className="ed-h2 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gold-light text-black flex items-center justify-center text-sm font-bold mr-3">11</span>
                Contact Information
              </h2>
              <div className="ed-muted space-y-4 pl-11">
                <p>
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="bg-ink-card border ed-hairline p-6 mt-4">
                  <p className="font-semibold text-white">GigWheels</p>
                  <p>Katy, TX</p>
                  <p>Greater Houston Area</p>
                  <p className="mt-4">
                    <strong>Email:</strong> apply@gigwheels.strategybase.io
                  </p>
                  <p>
                    <strong>Phone:</strong> (346) 587-1177
                  </p>
                  <p>
                    <strong>Hours:</strong> Mon-Sat, 9AM - 7PM
                  </p>
                </div>
              </div>
            </section>

            {/* Acceptance Footer */}
            <div className="border-t ed-hairline pt-8 mt-8 text-center">
              <p className="ed-muted mb-6">
                By using GigWheels services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="ed-cta ed-cta-primary"
                >
                  Contact Us
                </Link>
                <Link
                  href="/privacy"
                  className="ed-cta ed-cta-ghost"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      <SiteFooter />
    </div>
  );
}
