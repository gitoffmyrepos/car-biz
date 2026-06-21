'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiBaseUrl } from '@/lib/api';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  preferredContact: 'email' | 'phone' | 'either';
  vehicleType: string;
  timeframe: string;
  notes: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  vehicleType?: string;
  timeframe?: string;
  submit?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  inquiry_id?: number;
}

// Map frontend values to backend enum values
const vehicleTypeMap: Record<string, string> = {
  'Luxury Sedan': 'sedan',
  'Premium SUV': 'suv',
  'Sports & Performance': 'sports',
  'Compact & Economy': 'sedan',
  'Executive Luxury': 'luxury',
  'Pickup Truck': 'truck',
  'Not Sure - Need Guidance': 'any',
};

const timeframeMap: Record<string, string> = {
  'Immediately (This Week)': 'immediate',
  'Within 2 Weeks': 'this_week',
  'Within 1 Month': 'this_month',
  'Just Exploring Options': 'just_browsing',
};

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    preferredContact: 'either',
    vehicleType: '',
    timeframe: '',
    notes: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const vehicleTypes = [
    'Luxury Sedan',
    'Premium SUV',
    'Sports & Performance',
    'Compact & Economy',
    'Executive Luxury',
    'Pickup Truck',
    'Not Sure - Need Guidance'
  ];

  const timeframes = [
    'Immediately (This Week)',
    'Within 2 Weeks',
    'Within 1 Month',
    'Just Exploring Options'
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter your full name';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Vehicle type validation
    if (!formData.vehicleType) {
      newErrors.vehicleType = 'Please select a vehicle type';
    }

    // Timeframe validation
    if (!formData.timeframe) {
      newErrors.timeframe = 'Please select your timeframe';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors(prev => ({ ...prev, submit: undefined }));

    try {
      // Prepare API payload with enum values
      const apiPayload = {
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        preferred_contact: formData.preferredContact,
        vehicle_type: vehicleTypeMap[formData.vehicleType] || 'any',
        timeframe: timeframeMap[formData.timeframe] || 'just_browsing',
        notes: formData.notes.trim() || null,
      };

      const apiUrl = apiBaseUrl();
      const response = await fetch(`${apiUrl}/inquiries/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit inquiry');
      }

      if (data.success) {
        setIsSubmitted(true);
      } else {
        setErrors(prev => ({ ...prev, submit: data.message || 'Failed to submit inquiry. Please try again.' }));
      }
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Failed to submit inquiry. Please try again.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-glossy-black/90 backdrop-blur-md shadow-lg border-b border-glossy-border sticky top-0 z-50">
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
              <Link href="/contact" className="text-orange-500 font-medium">
                Contact
              </Link>
            </div>
            <button className="md:hidden text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            Get in <span className="text-orange-500">Touch</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Ready to start your weekly lease journey? Fill out the form below and our team will contact you within 24 hours.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-glossy-light rounded-2xl shadow-lg p-8 border border-glossy-border">
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Thank You!</h2>
                    <p className="text-gray-300 mb-8 max-w-md mx-auto">
                      Your inquiry has been submitted successfully. Our team will review your request and contact you within 24 hours.
                    </p>
                    <Link
                      href="/"
                      className="inline-block bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                    >
                      Return to Home
                    </Link>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white mb-2">Inquiry Form</h2>
                    <p className="text-gray-300 mb-8">All fields marked with * are required</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Full Name */}
                      <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border bg-glossy-black/50 text-white ${
                            errors.fullName ? 'border-red-500' : 'border-glossy-border'
                          } focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                          placeholder="John Smith"
                        />
                        {errors.fullName && (
                          <p className="mt-2 text-sm text-red-400">{errors.fullName}</p>
                        )}
                      </div>

                      {/* Email & Phone Row */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border bg-glossy-black/50 text-white ${
                              errors.email ? 'border-red-500' : 'border-glossy-border'
                            } focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                            placeholder="john@example.com"
                          />
                          {errors.email && (
                            <p className="mt-2 text-sm text-red-400">{errors.email}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border bg-glossy-black/50 text-white ${
                              errors.phone ? 'border-red-500' : 'border-glossy-border'
                            } focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                            placeholder="(555) 123-4567"
                          />
                          {errors.phone && (
                            <p className="mt-2 text-sm text-red-400">{errors.phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Preferred Contact Method */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          Preferred Contact Method
                        </label>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { value: 'email', label: 'Email' },
                            { value: 'phone', label: 'Phone' },
                            { value: 'either', label: 'Either' }
                          ].map((option) => (
                            <label key={option.value} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="preferredContact"
                                value={option.value}
                                checked={formData.preferredContact === option.value}
                                onChange={(e) => handleInputChange('preferredContact', e.target.value)}
                                className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                              />
                              <span className="ml-2 text-gray-300">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Vehicle Type */}
                      <div>
                        <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-300 mb-2">
                          Desired Vehicle Type *
                        </label>
                        <select
                          id="vehicleType"
                          name="vehicleType"
                          value={formData.vehicleType}
                          onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border bg-glossy-black/50 text-white ${
                            errors.vehicleType ? 'border-red-500' : 'border-glossy-border'
                          } focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                        >
                          <option value="">Select a vehicle type</option>
                          {vehicleTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        {errors.vehicleType && (
                          <p className="mt-2 text-sm text-red-400">{errors.vehicleType}</p>
                        )}
                      </div>

                      {/* Timeframe */}
                      <div>
                        <label htmlFor="timeframe" className="block text-sm font-medium text-gray-300 mb-2">
                          When do you need the vehicle? *
                        </label>
                        <select
                          id="timeframe"
                          name="timeframe"
                          value={formData.timeframe}
                          onChange={(e) => handleInputChange('timeframe', e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border bg-glossy-black/50 text-white ${
                            errors.timeframe ? 'border-red-500' : 'border-glossy-border'
                          } focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors`}
                        >
                          <option value="">Select your timeframe</option>
                          {timeframes.map((time) => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                        {errors.timeframe && (
                          <p className="mt-2 text-sm text-red-400">{errors.timeframe}</p>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
                          Additional Notes
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          rows={4}
                          value={formData.notes}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-glossy-border bg-glossy-black/50 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors resize-none"
                          placeholder="Tell us about any specific requirements, questions, or preferences you have..."
                        />
                      </div>

                      {/* Submit Error Message */}
                      {errors.submit && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                          <p className="text-sm text-red-400 flex items-center">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.submit}
                          </p>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                          isSubmitting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Submitting...
                          </span>
                        ) : (
                          'Submit Inquiry'
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              {/* Quick Contact */}
              <div className="bg-glossy-light rounded-2xl shadow-lg p-6 border border-glossy-border">
                <h3 className="text-xl font-bold text-white mb-6">Quick Contact</h3>

                <div className="space-y-5">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Phone</p>
                      <p className="text-white font-medium">(555) 123-4567</p>
                      <p className="text-sm text-gray-400">Mon-Sat: 9AM - 7PM</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Email</p>
                      <p className="text-white font-medium">info@fxweekly.com</p>
                      <p className="text-sm text-gray-400">24-hour response time</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Office</p>
                      <p className="text-white font-medium">123 Main Street</p>
                      <p className="text-sm text-gray-400">City, State 12345</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why Choose Us */}
              <div className="bg-gradient-glossy rounded-2xl shadow-lg p-6 text-white border border-glossy-border">
                <h3 className="text-xl font-bold mb-6">Why Choose Us</h3>
                <ul className="space-y-4">
                  {[
                    'Flexible Weekly Payments',
                    'No Long-Term Commitments',
                    'Quality Maintained Vehicles',
                    '24/7 Customer Support',
                    'Quick Approval Process'
                  ].map((item, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Response Time */}
              <div className="bg-orange-500/10 rounded-2xl p-6 border border-orange-500/20">
                <div className="flex items-center space-x-3 mb-3">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-bold text-white">Fast Response</h3>
                </div>
                <p className="text-gray-300 text-sm">
                  We typically respond to all inquiries within 24 hours. For urgent requests, please call us directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section Placeholder */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-glossy-black/50 rounded-2xl h-64 flex items-center justify-center border border-glossy-border">
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="font-medium text-gray-300">Map Integration Coming Soon</p>
              <p className="text-sm">Visit us at 123 Main Street, City, State 12345</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prefer to Learn More First?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Explore our fleet, review our requirements, or read through our FAQ to get all your questions answered.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/fleet"
              className="bg-glossy-light text-white px-8 py-3 rounded-lg font-semibold hover:bg-glossy-light/80 transition-colors border border-glossy-border"
            >
              Browse Our Fleet
            </Link>
            <Link
              href="/faq"
              className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              View FAQ
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-glossy-black text-white py-16 border-t border-glossy-border">
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
                <li><Link href="/privacy" className="hover:text-orange-500 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-orange-500 transition-colors">Terms of Service</Link></li>
                <li><Link href="/contact" className="hover:text-orange-500 transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>123 Main Street</li>
                <li>City, State 12345</li>
                <li className="pt-2">info@fxweekly.com</li>
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
