'use client';

/**
 * Fixed, backdrop-blurred editorial nav for public-facing pages.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

const LINKS: { href: string; label: string }[] = [
  { href: '/fleet', label: 'Fleet' },
  { href: '/how-it-works', label: 'Process' },
  { href: '/requirements', label: 'Requirements' },
  { href: '/faq', label: 'FAQ' },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="ed-nav" aria-label="Main navigation">
      <div className="ed-container">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight text-white">
            FX<span className="ed-gold-word">Weekly</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="ed-navlink" data-active={isActive(l.href)}>
                {l.label}
              </Link>
            ))}
            <Link href="/contact" className="ed-cta ed-cta-ghost px-5 py-2 text-xs">
              Apply
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-white"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t ed-hairline py-4 flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="ed-navlink py-2"
                data-active={isActive(l.href)}
                onClick={close}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/contact" className="ed-cta ed-cta-ghost mt-2" onClick={close}>
              Apply
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
