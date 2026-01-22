/**
 * Weekly Vehicle Leasing Platform - 404 Not Found
 * Salvage-to-Lux Fleet Management
 *
 * Custom 404 page for Next.js App Router.
 * Displayed when a page is not found.
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-luxury-pearl px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <span className="text-8xl font-display font-bold text-gray-200">404</span>
        </div>

        {/* Error Icon */}
        <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-gold-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-luxury-charcoal mb-2">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Navigation Options */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-gold-500 text-white font-medium rounded-lg hover:bg-gold-600 transition-colors"
          >
            Go to Home
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Contact Support
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Looking for something specific?</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/fleet" className="text-gold-600 hover:text-gold-700 underline">
              Browse Fleet
            </Link>
            <Link href="/how-it-works" className="text-gold-600 hover:text-gold-700 underline">
              How It Works
            </Link>
            <Link href="/faq" className="text-gold-600 hover:text-gold-700 underline">
              FAQ
            </Link>
            <Link href="/dashboard" className="text-gold-600 hover:text-gold-700 underline">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
