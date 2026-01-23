'use client';

/**
 * Weekly Vehicle Leasing Platform - Client Providers
 * Salvage-to-Lux Fleet Management
 *
 * Client-side providers wrapper for auth, toast notifications, theme, and other contexts.
 */

import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/components/ui/ThemeToggle';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        <ToastProvider position="top-right" maxToasts={5}>
          {children}
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
