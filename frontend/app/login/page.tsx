'use client';

/**
 * GigWheels - Login Page
 * Weekly car rentals for gig drivers
 *
 * Login page with OIDC/Keycloak authentication and dev mode support.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isDevMode, devLogin, login, oidcConfig, user } = useAuth();
  const [devEmail, setDevEmail] = useState('');
  const [devRole, setDevRole] = useState('customer');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const justLoggedIn = useRef(false);

  // Redirect if already authenticated when visiting the login page
  useEffect(() => {
    // Don't redirect if we just completed a login (the button handler will redirect)
    if (justLoggedIn.current) {
      return;
    }

    if (!isLoading && isAuthenticated && user) {
      // User was already authenticated when they visited the login page
      // Redirect based on their role
      if (user.is_admin || user.is_ops) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    justLoggedIn.current = true;

    try {
      await devLogin(devRole, devEmail || `${devRole}@example.com`);
      // Redirect based on role - admin users need MFA verification
      if (devRole === 'admin') {
        router.push('/login/mfa');
      } else if (devRole === 'ops') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      justLoggedIn.current = false;
      setError('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeycloakLogin = () => {
    login();
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
              <p className="ed-eyebrow mb-3">Welcome Back</p>
              <h1 className="ed-h2 text-white">Sign in to your account</h1>
              <p className="ed-muted mt-2 text-sm">Weekly car leasing for gig drivers</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-ink-card border ed-hairline border-l-2 border-l-[var(--ed-gold)] text-gold-light text-sm">
                {error}
              </div>
            )}

            {/* Dev Mode Login Form */}
            {isDevMode && (
              <div className="space-y-6">
                <div className="p-4 bg-ink-card border ed-hairline">
                  <p className="text-white text-sm font-medium">Development Mode</p>
                  <p className="ed-muted text-xs mt-1">
                    Keycloak is not configured. Use dev login below.
                  </p>
                </div>

                <form onSubmit={handleDevLogin} className="space-y-4">
                  <div>
                    <label htmlFor="role" className="block ed-eyebrow mb-2">
                      Role
                    </label>
                    <select
                      id="role"
                      value={devRole}
                      onChange={(e) => setDevRole(e.target.value)}
                      className="w-full bg-ink-card border ed-hairline px-4 py-3 text-white focus:outline-none focus:border-[var(--ed-gold)] transition-colors"
                    >
                      <option value="customer">Customer</option>
                      <option value="ops">Operations</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="email" className="block ed-eyebrow mb-2">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      placeholder={`${devRole}@example.com`}
                      className="w-full bg-ink-card border ed-hairline px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--ed-gold)] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="ed-cta ed-cta-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign In (Dev Mode)'}
                  </button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t ed-hairline"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-ink-card ed-muted uppercase tracking-wider">Quick Login</span>
                  </div>
                </div>

                {/* Quick Dev Login Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={async () => {
                      setIsSubmitting(true);
                      justLoggedIn.current = true;
                      try {
                        await devLogin('customer', 'customer@example.com');
                        router.push('/dashboard');
                      } catch {
                        justLoggedIn.current = false;
                        setError('Login failed');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="ed-cta ed-cta-ghost w-full px-3 py-2 text-xs disabled:opacity-50"
                  >
                    Customer
                  </button>
                  <button
                    onClick={async () => {
                      setIsSubmitting(true);
                      justLoggedIn.current = true;
                      try {
                        await devLogin('ops', 'ops@example.com');
                        router.push('/admin');
                      } catch {
                        justLoggedIn.current = false;
                        setError('Login failed');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="ed-cta ed-cta-ghost w-full px-3 py-2 text-xs disabled:opacity-50"
                  >
                    Ops
                  </button>
                  <button
                    onClick={async () => {
                      setIsSubmitting(true);
                      justLoggedIn.current = true;
                      try {
                        await devLogin('admin', 'admin@example.com');
                        // Admin users need MFA verification
                        router.push('/login/mfa');
                      } catch {
                        justLoggedIn.current = false;
                        setError('Login failed');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="ed-cta ed-cta-ghost w-full px-3 py-2 text-xs disabled:opacity-50"
                  >
                    Admin
                  </button>
                </div>
              </div>
            )}

            {/* Keycloak Login Button (when configured) */}
            {!isDevMode && oidcConfig && (
              <div className="space-y-6">
                <button
                  onClick={handleKeycloakLogin}
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Sign in with Keycloak
                </button>

                <p className="text-center text-sm ed-muted">
                  You will be redirected to the secure login page.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm ed-muted">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-gold-light hover:underline font-medium">
                  Create an account
                </Link>
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-4 text-center text-xs ed-muted">
            <p>Your connection is secure and encrypted.</p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
