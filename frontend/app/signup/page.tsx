'use client';

/**
 * GigWheels - Signup Page
 * Weekly car rentals for gig drivers
 *
 * Customer registration page with Keycloak integration and dev mode support.
 * New users are assigned the 'customer' role by default.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isDevMode, devLogin, oidcConfig, user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const justRegistered = useRef(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (justRegistered.current) {
      return;
    }

    if (!isLoading && isAuthenticated && user) {
      // User is already authenticated, redirect based on role
      if (user.is_admin || user.is_ops) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDevSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    justRegistered.current = true;

    try {
      // In dev mode, create a new customer account
      await devLogin('customer', formData.email);
      // Redirect to customer dashboard
      router.push('/dashboard');
    } catch (err) {
      justRegistered.current = false;
      setError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeycloakSignup = () => {
    if (!oidcConfig) {
      setError('Authentication service not configured');
      return;
    }

    // Build OIDC registration URL (Keycloak registration endpoint)
    const params = new URLSearchParams({
      client_id: oidcConfig.client_id,
      redirect_uri: `${window.location.origin}/login/callback`,
      response_type: 'token',
      scope: 'openid profile email',
      state: crypto.randomUUID(),
    });

    // Keycloak registration URL uses 'kc_action=register' parameter
    window.location.href = `${oidcConfig.authorization_endpoint}?${params.toString()}&kc_action=register`;
  };

  if (isLoading) {
    return (
      <div className="editorial min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--ed-gold)]"></div>
      </div>
    );
  }

  return (
    <div className="editorial min-h-screen flex flex-col">
      <SiteNav />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-16">
        <div className="w-full max-w-md">
          <div className="bg-ink-card border ed-hairline p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <p className="ed-eyebrow mb-3">Get Started</p>
              <h1 className="ed-h2 text-white">Create your account</h1>
              <p className="ed-muted mt-2 text-sm">Weekly car leasing for gig drivers</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-ink-card border ed-hairline border-l-2 border-l-[var(--ed-gold)] text-gold-light text-sm">
                {error}
              </div>
            )}

            {/* Dev Mode Signup Form */}
            {isDevMode && (
              <div className="space-y-6">
                <div className="p-4 bg-ink-card border ed-hairline">
                  <p className="text-white text-sm font-medium">Development Mode</p>
                  <p className="ed-muted text-xs mt-1">
                    Keycloak is not configured. Use dev registration below.
                  </p>
                </div>

                <form onSubmit={handleDevSignup} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block ed-eyebrow mb-2">
                      Full Name <span className="text-gold-light">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      required
                      className="w-full bg-ink-card border ed-hairline px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--ed-gold)] transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block ed-eyebrow mb-2">
                      Email Address <span className="text-gold-light">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      required
                      className="w-full bg-ink-card border ed-hairline px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--ed-gold)] transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block ed-eyebrow mb-2">
                      Phone Number (optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(555) 123-4567"
                      className="w-full bg-ink-card border ed-hairline px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--ed-gold)] transition-colors"
                    />
                  </div>

                  <div className="text-xs ed-muted">
                    <p>
                      By creating an account, you agree to our{' '}
                      <Link href="/terms" className="text-gold-light hover:underline">Terms of Service</Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-gold-light hover:underline">Privacy Policy</Link>.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="ed-cta ed-cta-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating Account...' : 'Create Account (Dev Mode)'}
                  </button>
                </form>
              </div>
            )}

            {/* Keycloak Signup Button (when configured) */}
            {!isDevMode && oidcConfig && (
              <div className="space-y-6">
                <p className="ed-muted text-center text-sm">
                  Create an account to start leasing premium vehicles weekly.
                </p>

                <button
                  onClick={handleKeycloakSignup}
                  className="ed-cta ed-cta-primary w-full"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Create Account
                </button>

                <p className="text-center text-sm ed-muted">
                  You will be redirected to our secure registration page.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm ed-muted">
                Already have an account?{' '}
                <Link href="/login" className="text-gold-light hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mt-6 bg-ink-card border ed-hairline p-6">
            <h2 className="ed-eyebrow mb-4">Why Join GigWheels?</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="ed-muted text-sm">Access to premium reliable vehicles</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="ed-muted text-sm">Flexible weekly leasing terms</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="ed-muted text-sm">24/7 customer support</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="ed-muted text-sm">Transparent pricing - no hidden fees</span>
              </li>
            </ul>
          </div>

          {/* Security Notice */}
          <div className="mt-4 text-center text-xs ed-muted">
            <p>Your information is secure and encrypted.</p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
