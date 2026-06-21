'use client';

/**
 * GigWheels - OIDC Callback Page
 * Weekly car rentals for gig drivers
 *
 * Handles the OIDC callback from Keycloak after authentication.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // The auth context will automatically handle the token from the URL hash
    // This page just shows a loading state while the redirect happens

    // Small delay to allow auth context to process the token
    const timeout = setTimeout(() => {
      // Redirect to dashboard - the auth context will update the user state
      router.push('/dashboard');
    }, 1500);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen bg-luxury-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-gold mx-auto mb-6"></div>
        <h1 className="text-2xl font-bold text-charcoal mb-2">Signing you in...</h1>
        <p className="text-gray-600">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}
