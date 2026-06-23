/**
 * Editorial footer for public-facing pages. Server component.
 */
import Link from 'next/link';
import { Logo } from './Logo';

const COMPANY = [
  { href: '/fleet', label: 'Fleet' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/requirements', label: 'Requirements' },
  { href: '/faq', label: 'FAQ' },
];

const LEGAL = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/gps-disclosure', label: 'GPS Disclosure' },
];

export function SiteFooter() {
  return (
    <footer className="border-t ed-hairline" style={{ background: 'var(--ed-card)' }}>
      <div className="ed-container py-16">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <Link href="/" aria-label="GigWheels home" className="inline-block mb-4">
              <Logo size={30} />
            </Link>
            <p className="ed-muted text-sm leading-relaxed">
              Affordable weekly car leasing for gig and delivery drivers. Published prices, real fleet, fast approval.
            </p>
          </div>

          <div>
            <h4 className="ed-eyebrow mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              {COMPANY.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="ed-muted hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="ed-eyebrow mb-4">Legal</h4>
            <ul className="space-y-3 text-sm">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="ed-muted hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="ed-eyebrow mb-4">Contact</h4>
            <ul className="space-y-3 text-sm ed-muted">
              <li>
                <a href="mailto:apply@gigwheels.strategybase.io" className="hover:text-white transition-colors break-all">
                  apply@gigwheels.strategybase.io
                </a>
              </li>
              <li>
                <a href="tel:+13465871177" className="hover:text-white transition-colors">
                  (346) 587-1177
                </a>
              </li>
              <li>Katy, TX</li>
            </ul>
            <Link href="/contact" className="ed-cta ed-cta-ghost mt-5 px-5 py-2 text-xs">
              Apply to Rent
            </Link>
          </div>
        </div>

        <div className="border-t ed-hairline pt-8 text-center text-xs ed-muted">
          <p>&copy; 2026 GigWheels. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
