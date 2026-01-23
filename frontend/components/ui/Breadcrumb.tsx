'use client';

/**
 * Weekly Vehicle Leasing Platform - Breadcrumb Component
 * Salvage-to-Lux Fleet Management
 *
 * Breadcrumb navigation for hierarchical page structure.
 */

import Link from 'next/link';
import { ReactNode } from 'react';
import { clsx } from 'clsx';

// Breadcrumb item
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

// Component props
export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  className?: string;
  showHome?: boolean;
  homeHref?: string;
  homeLabel?: string;
}

// Default separator
const DefaultSeparator = () => (
  <svg
    className="w-4 h-4 text-gray-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

// Home icon
const HomeIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

/**
 * Main Breadcrumb component
 */
export function Breadcrumb({
  items,
  separator,
  className,
  showHome = true,
  homeHref = '/',
  homeLabel = 'Home',
}: BreadcrumbProps) {
  // Build full items list including home
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: homeLabel, href: homeHref, icon: <HomeIcon /> }, ...items]
    : items;

  if (allItems.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={clsx('flex', className)}>
      <ol className="flex items-center flex-wrap gap-1" role="list">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center">
              {/* Separator (not for first item) */}
              {!isFirst && (
                <span className="mx-2 flex-shrink-0" aria-hidden="true">
                  {separator || <DefaultSeparator />}
                </span>
              )}

              {/* Breadcrumb link or text */}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-1 text-sm transition-colors',
                    'text-gray-500 hover:text-gold'
                  )}
                >
                  {item.icon}
                  <span className={isFirst && item.icon ? 'sr-only sm:not-sr-only' : ''}>
                    {item.label}
                  </span>
                </Link>
              ) : (
                <span
                  className={clsx(
                    'flex items-center gap-1 text-sm',
                    isLast ? 'text-charcoal font-medium' : 'text-gray-500'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon}
                  <span className={isFirst && item.icon ? 'sr-only sm:not-sr-only' : ''}>
                    {item.label}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * BreadcrumbContainer - Wrapper with consistent styling
 */
export function BreadcrumbContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'bg-white border-b border-gray-200 px-4 py-3 sm:px-6',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Helper function to generate breadcrumb items from a path
 */
export function generateBreadcrumbsFromPath(
  pathname: string,
  labelMap?: Record<string, string>
): BreadcrumbItem[] {
  // Remove leading/trailing slashes and split
  const segments = pathname.replace(/^\/|\/$/g, '').split('/');

  if (segments.length === 0 || (segments.length === 1 && segments[0] === '')) {
    return [];
  }

  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip dynamic route segments that are IDs (all numeric)
    if (/^\d+$/.test(segment)) {
      continue;
    }

    // Get label from map or format segment
    const label =
      labelMap?.[segment] ||
      segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    items.push({
      label,
      href: i === segments.length - 1 ? undefined : currentPath,
    });
  }

  return items;
}

/**
 * Hook to generate breadcrumbs from current path
 * (Would need to be used with usePathname from next/navigation)
 */
export function useBreadcrumbs(
  pathname: string,
  customLabels?: Record<string, string>
): BreadcrumbItem[] {
  return generateBreadcrumbsFromPath(pathname, {
    dashboard: 'Dashboard',
    admin: 'Admin',
    profile: 'Profile',
    vehicles: 'Vehicles',
    customers: 'Customers',
    invoices: 'Invoices',
    payments: 'Payments',
    settings: 'Settings',
    notifications: 'Notifications',
    ...customLabels,
  });
}

export default Breadcrumb;
