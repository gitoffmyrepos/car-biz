'use client';

/**
 * Weekly Vehicle Leasing Platform - Login Page
 * Salvage-to-Lux Fleet Management
 *
 * Login page with OIDC/Keycloak authentication and dev mode support.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

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
      // Redirect based on role
      if (devRole === 'admin' || devRole === 'ops') {
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
          <Link
            href="/"
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-charcoal">
                <span className="text-gold">FX</span>Weekly
              </h1>
              <p className="text-gray-600 mt-2">Sign in to your account</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Dev Mode Login Form */}
            {isDevMode && (
              <div className="space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm font-medium">Development Mode</p>
                  <p className="text-amber-700 text-xs mt-1">
                    Keycloak is not configured. Use dev login below.
                  </p>
                </div>

                <form onSubmit={handleDevLogin} className="space-y-4">
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      id="role"
                      value={devRole}
                      onChange={(e) => setDevRole(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                    >
                      <option value="customer">Customer</option>
                      <option value="ops">Operations</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      placeholder={`${devRole}@example.com`}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign In (Dev Mode)'}
                  </button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Quick Login</span>
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
                    className="py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                    className="py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Ops
                  </button>
                  <button
                    onClick={async () => {
                      setIsSubmitting(true);
                      justLoggedIn.current = true;
                      try {
                        await devLogin('admin', 'admin@example.com');
                        router.push('/admin');
                      } catch {
                        justLoggedIn.current = false;
                        setError('Login failed');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                  className="w-full py-3 px-4 bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
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

                <p className="text-center text-sm text-gray-600">
                  You will be redirected to the secure login page.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link href="/contact" className="text-gold hover:text-gold/80 font-medium">
                  Contact us
                </Link>
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
