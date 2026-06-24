'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Eyebrow } from '@/components/site/primitives';
import { ShimmerText } from '@/components/site/fx/ShimmerText';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  // Getting Started
  {
    category: 'Getting Started',
    question: 'How do I apply for a weekly lease?',
    answer: 'Getting started is easy! Simply fill out our online inquiry form on the Contact page. Our team will review your application and contact you within 24-48 hours to discuss your options and guide you through the next steps.'
  },
  {
    category: 'Getting Started',
    question: 'What are the basic requirements to lease a vehicle?',
    answer: 'To qualify for our weekly lease program, you must be at least 21 years old, have a valid driver\'s license with at least 2 years of driving experience, provide proof of full coverage insurance, and have a clean driving record (no major violations or DUI in the past 3 years).'
  },
  {
    category: 'Getting Started',
    question: 'Is there a credit check required?',
    answer: 'No, we do not require a credit check! Our approval process is based on your driving history, insurance coverage, and identity verification. This makes our service accessible to more drivers who may have difficulty with traditional financing.'
  },
  {
    category: 'Getting Started',
    question: 'How long does the approval process take?',
    answer: 'Our verification process typically takes 48 hours from when you submit all required documentation. Once approved, you can pick up your vehicle as soon as the same day or the next business day.'
  },

  // Payments
  {
    category: 'Payments',
    question: 'How much does it cost to lease a vehicle weekly?',
    answer: 'Our weekly lease rates start at $350/week, depending on the vehicle type and category. We also offer daily rentals at $55/day. This rate includes monthly maintenance service. Contact us to get specific pricing for your desired vehicle category.'
  },
  {
    category: 'Payments',
    question: 'Do you offer a discount for longer commitments?',
    answer: 'Yes. If you sign a 1-month contract you still pay weekly, but you get 5% off the weekly rate for the whole month. At the standard $350/week that brings your payment to $332.50/week, saving you about $70 over the month while you keep driving and earning. You stay flexible week to week if you prefer — the discount is simply a reward for committing to the month.'
  },
  {
    category: 'Payments',
    question: 'What payment methods do you accept?',
    answer: 'We accept payments via Zelle, CashApp, and cash (in-person). Payments are due weekly, and you can upload proof of payment through your customer dashboard for verification.'
  },
  {
    category: 'Payments',
    question: 'When are payments due?',
    answer: 'Payments are due on the same day each week based on when you picked up your vehicle. For example, if you pick up your vehicle on a Monday, your weekly payment will be due every Monday.'
  },
  {
    category: 'Payments',
    question: 'What happens if I miss a payment?',
    answer: 'If a payment is late, a late fee will be applied on Day 1 past the due date. You will receive escalation notices on Day 2. If payment is not received by Day 3, your lease may be terminated and the vehicle recovered. We strongly encourage you to contact us immediately if you anticipate payment difficulties.'
  },
  {
    category: 'Payments',
    question: 'Is there a security deposit required?',
    answer: 'A refundable security deposit may be required depending on the vehicle and your application. The deposit amount will be discussed during the approval process and is fully refundable at the end of your lease term, minus any damages or outstanding fees.'
  },

  // Insurance
  {
    category: 'Insurance',
    question: 'What type of insurance do I need?',
    answer: 'You must have full coverage insurance that includes: Bodily Injury Liability ($100K/$300K minimum), Property Damage ($50K minimum), and Comprehensive & Collision coverage. GigWheels must be listed as an additional insured or lienholder on your policy.'
  },
  {
    category: 'Insurance',
    question: 'Can you help me find insurance?',
    answer: 'While we don\'t provide insurance directly, we can recommend insurance providers who offer competitive rates for our customers. Contact our team for referrals to insurance agents familiar with our requirements.'
  },
  {
    category: 'Insurance',
    question: 'What happens if my insurance lapses?',
    answer: 'Maintaining valid insurance is mandatory throughout your lease. If your insurance lapses, you must notify us immediately and reinstate coverage within 24 hours. Driving without valid insurance may result in immediate lease termination.'
  },

  // Vehicles
  {
    category: 'Vehicles',
    question: 'What types of vehicles do you offer?',
    answer: 'We offer a diverse fleet including Luxury Sedans, Premium SUVs, Sports & Performance vehicles, Compact & Economy cars, Executive Luxury vehicles, and Pickup Trucks. Visit our Fleet page to see all available categories.'
  },
  {
    category: 'Vehicles',
    question: 'Are the vehicles new or used?',
    answer: 'Our vehicles are quality pre-owned vehicles that have undergone extensive inspection and reconditioning. Every vehicle is thoroughly inspected, professionally detailed, and maintained to ensure reliability and safety.'
  },
  {
    category: 'Vehicles',
    question: 'What is included with the vehicle?',
    answer: 'Each vehicle comes with monthly maintenance service included in your weekly rate, 24/7 support line access, and a quality guarantee. You\'re responsible for fuel and basic upkeep like keeping the vehicle clean.'
  },
  {
    category: 'Vehicles',
    question: 'Can I switch vehicles during my lease?',
    answer: 'Yes, vehicle switches may be possible depending on availability and your account standing. Contact our team to discuss switching to a different vehicle category. Additional fees may apply.'
  },

  // Policies
  {
    category: 'Policies',
    question: 'Do the vehicles have GPS tracking?',
    answer: 'Yes, all our vehicles are equipped with GPS tracking devices for fleet management and security purposes. This is disclosed in our GPS Disclosure policy and lease agreement. The tracking data is used for vehicle location in case of theft or recovery situations.'
  },
  {
    category: 'Policies',
    question: 'Can I use the vehicle for rideshare (Uber/Lyft)?',
    answer: 'Commercial use of our vehicles, including rideshare services, requires prior written approval and may be subject to additional terms and insurance requirements. Contact us to discuss commercial use options.'
  },
  {
    category: 'Policies',
    question: 'What is your mileage policy?',
    answer: 'Standard weekly leases include reasonable mileage for personal use. Excessive mileage beyond typical usage may result in additional fees. Contact us for details on mileage limits for your specific vehicle.'
  },
  {
    category: 'Policies',
    question: 'How do I report an accident or incident?',
    answer: 'In case of an accident, first ensure everyone\'s safety and call emergency services if needed. Then contact us immediately through our 24/7 support line. You can also submit an incident report with photos through your customer dashboard.'
  },
  {
    category: 'List Your Car',
    question: 'I own an extra car. Can GigWheels lease it out for me?',
    answer: 'Yes. Through our owner partner program, GigWheels manages leasing your spare car to vetted gig drivers on a weekly basis, so you earn passive weekly income while keeping ownership. We handle the driver screening, payments, GPS tracking, maintenance coordination, and recovery. To get started, tell us about your car on the Contact page.'
  },
  {
    category: 'List Your Car',
    question: 'How much do I earn, and what does GigWheels take?',
    answer: 'You earn a weekly payout from your car\'s lease. GigWheels keeps a percentage of the weekly rate as a management fee for handling everything end to end. The exact fee and your payout split are agreed before your car goes on the road. Contact us for a quote on your specific vehicle.'
  },
  {
    category: 'List Your Car',
    question: 'What does GigWheels handle when I list my car?',
    answer: 'Everything operational: screening and approving drivers, collecting and tracking weekly payments, GPS tracking for security, coordinating maintenance, and vehicle recovery if a driver defaults. You stay the owner and get paid weekly.'
  },
  {
    category: 'List Your Car',
    question: 'What kind of car can I list?',
    answer: 'Your car should be in good, safe, well-maintained condition and meet our insurance and documentation standards. Our team confirms the specifics during onboarding and lets you know if it qualifies. Reach out through the Contact page to check your vehicle.'
  },
];

// Get unique categories
const categories = Array.from(new Set(faqItems.map(item => item.category)));

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQs = activeCategory
    ? faqItems.filter(item => item.category === activeCategory)
    : faqItems;

  return (
    <div className="editorial min-h-screen">
      <a href="#main" className="skip-to-main">Skip to main content</a>
      <SiteNav />

      <main id="main">
        {/* Hero Section */}
        <section className="ed-section border-t ed-hairline pt-32">
          <div className="ed-container">
            <Eyebrow label="FAQ" />
            <h1 className="ed-h1 mt-5 mb-6">
              Frequently Asked <ShimmerText>Questions</ShimmerText>
            </h1>
            <p className="ed-muted text-lg max-w-2xl">
              Find answers to common questions about our weekly car-rental service.
            </p>
          </div>
        </section>

        {/* Category Filter */}
        <section className="border-t border-b ed-hairline sticky top-16 md:top-20 z-40" style={{ background: 'var(--ed-card)' }}>
          <div className="ed-container py-4">
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 text-sm font-medium transition-all border ed-hairline ${
                  activeCategory === null
                    ? 'bg-gold-light text-black border-transparent'
                    : 'bg-ink-card text-gold-light hover:text-white'
                }`}
              >
                All Questions
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 text-sm font-medium transition-all border ed-hairline ${
                    activeCategory === category
                      ? 'bg-gold-light text-black border-transparent'
                      : 'bg-ink-card text-gold-light hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Items */}
        <section className="ed-section">
          <div className="ed-container">
            <div className="max-w-3xl mx-auto">
              {activeCategory && (
                <h2 className="ed-h2 mb-6 text-center">
                  {activeCategory}
                </h2>
              )}
              <div className="space-y-4">
                {filteredFAQs.map((item) => {
                  const globalIndex = faqItems.indexOf(item);
                  const isOpen = openItems.has(globalIndex);

                  return (
                    <div
                      key={globalIndex}
                      className="ed-card overflow-hidden"
                    >
                      <button
                        onClick={() => toggleItem(globalIndex)}
                        className="w-full p-6 text-left flex items-center justify-between transition-colors"
                        aria-expanded={isOpen}
                      >
                        <div className="flex items-start space-x-4 flex-1">
                          {!activeCategory && (
                            <span className="px-2 py-1 bg-ink-card border ed-hairline text-gold-light text-xs font-medium flex-shrink-0">
                              {item.category}
                            </span>
                          )}
                          <span className="font-medium text-white pr-4">
                            {item.question}
                          </span>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gold-light transform transition-transform flex-shrink-0 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isOpen ? 'max-h-96' : 'max-h-0'
                        }`}
                      >
                        <div className="px-6 pb-6 ed-muted border-t ed-hairline pt-4">
                          {!activeCategory && <div className="mb-2"></div>}
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredFAQs.length === 0 && (
                <div className="text-center py-12">
                  <p className="ed-muted">No questions found in this category.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Still Have Questions */}
        <section className="ed-section border-t ed-hairline">
          <div className="ed-container">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-ink-card border ed-hairline flex items-center justify-center">
                <svg className="w-8 h-8 text-gold-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="ed-h2 mb-4">Still Have Questions?</h2>
              <p className="ed-muted text-lg mb-8">
                Can&apos;t find what you&apos;re looking for? Our team is here to help.
                Reach out to us directly and we&apos;ll get back to you as soon as possible.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/contact" className="ed-cta ed-cta-primary w-full sm:w-auto">
                  Contact Us
                </Link>
                <a href="tel:+13465871177" className="ed-cta ed-cta-ghost w-full sm:w-auto">
                  Call (346) 587-1177
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="ed-section border-t ed-hairline" style={{ background: 'var(--ed-card)' }}>
          <div className="ed-container text-center">
            <h2 className="ed-h2 mb-4">Ready to Get Started?</h2>
            <p className="ed-muted text-lg mb-8 max-w-2xl mx-auto">
              Now that you have answers to your questions, take the next step toward driving your dream vehicle.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="ed-cta ed-cta-primary w-full sm:w-auto">
                Start Your Application
              </Link>
              <Link href="/fleet" className="ed-cta ed-cta-ghost w-full sm:w-auto">
                Browse Our Fleet
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
