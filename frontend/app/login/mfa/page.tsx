'use client';

/**
 * Weekly Vehicle Leasing Platform - MFA Verification Page
 * Salvage-to-Lux Fleet Management
 *
 * MFA verification page for admin users.
 * In dev mode, accepts any 6-digit code.
 * In production, this would redirect to Keycloak for MFA.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function MFAVerificationPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isDevMode, verifyMfa, requiresMfa } = useAuth();
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // If user doesn't require MFA (not admin or already verified), redirect
  useEffect(() => {
    if (!isLoading && isAuthenticated && !requiresMfa) {
      // MFA already verified or not required
      if (user?.is_admin || user?.is_ops) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, requiresMfa, user, router]);

  // Handle individual digit input
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newCode = totpCode.split('');
    newCode[index] = value.slice(-1); // Take only last character
    const updatedCode = newCode.join('').padEnd(6, '').slice(0, 6);
    setTotpCode(updatedCode.replace(/\s/g, ''));

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !totpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setTotpCode(pastedData);
    // Focus the appropriate input after paste
    if (pastedData.length < 6) {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (totpCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsSubmitting(true);

    try {
      await verifyMfa(totpCode);
      // Redirect to admin dashboard after successful MFA
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-luxury-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-cream flex flex-col">
      {/* Header */}
      <header className="bg-charcoal text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-gold">FX</span>Weekly
          </Link>
          <span className="text-sm text-gray-300">
            {user?.email}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Icon */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-charcoal">MFA Verification Required</h1>
              <p className="text-gray-600 mt-2">
                Admin accounts require multi-factor authentication
              </p>
            </div>

            {/* Security Notice */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-blue-800 font-medium">Enhanced Security</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Enter the 6-digit code from your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                </div>
              </div>
            </div>

            {/* Dev Mode Notice */}
            {isDevMode && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-sm font-medium">Development Mode</p>
                <p className="text-amber-700 text-xs mt-1">
                  Any 6-digit code will be accepted in development mode.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* TOTP Code Input */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  Enter your authentication code
                </label>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={totpCode[index] || ''}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || totpCode.length !== 6}
                className="w-full py-3 px-4 bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-charcoal" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify Code'
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Having trouble?{' '}
                <a href="#" className="text-gold hover:text-gold/80 font-medium">
                  Contact support
                </a>
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-4 text-center text-xs text-gray-500">
            <p>Your connection is secure and encrypted.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
