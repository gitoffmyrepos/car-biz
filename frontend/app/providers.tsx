'use client';

/**
 * Weekly Vehicle Leasing Platform - Client Providers
 * Salvage-to-Lux Fleet Management
 *
 * Client-side providers wrapper for auth and other contexts.
 */

import { AuthProvider } from '@/lib/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
