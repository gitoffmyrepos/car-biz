'use client';

import { useState } from 'react';
import { apiUrl } from '@/lib/api';

type Role = 'driver' | 'owner';

const CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: 'ride_sharing', label: 'Ride-sharing', hint: 'Uber, Lyft, Bolt' },
  { value: 'food_delivery', label: 'Food delivery', hint: 'DoorDash, Uber Eats, Grubhub' },
  { value: 'package_delivery', label: 'Package / courier', hint: 'Amazon Flex, last-mile parcel' },
  { value: 'grocery_delivery', label: 'Grocery delivery', hint: 'Instacart, Shipt' },
];

export default function WaitlistPage() {
  const [role, setRole] = useState<Role>('driver');
  const [cats, setCats] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCat(v: string) {
    setCats((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      role,
      full_name: f.get('full_name'),
      email: f.get('email'),
      phone: f.get('phone') || null,
      city: f.get('city') || null,
      notes: f.get('notes') || null,
    };
    if (role === 'owner') {
      body.vehicle_make = f.get('vehicle_make') || null;
      body.vehicle_model = f.get('vehicle_model') || null;
      body.vehicle_year = f.get('vehicle_year') ? Number(f.get('vehicle_year')) : null;
      body.vehicle_count = f.get('vehicle_count') ? Number(f.get('vehicle_count')) : null;
      body.business_categories = cats;
      if (cats.length === 0) {
        setError('Pick at least one business category your car can be used for.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/waitlist/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail?.[0]?.msg || d?.detail || 'Something went wrong. Try again.');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-24">
        <div className="ed-card p-10 max-w-lg text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="ed-h2 mb-3">You&apos;re on the list!</h1>
          <p className="ed-muted">
            Thanks for joining the GigWheels {role} waitlist. We&apos;ll email and text you the
            moment we launch in your area. Keep an eye on your inbox — your welcome email is on its way.
          </p>
          <a href="/" className="ed-cta ed-cta-primary inline-flex mt-8 px-6 py-3">Back home</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-20 max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <span className="text-sm font-semibold text-gold-light uppercase tracking-wider">Launching soon</span>
        <h1 className="ed-h1 mt-3 mb-4">Join the GigWheels waitlist</h1>
        <p className="ed-muted text-lg">
          Cars are on the way. Get your spot now — drivers get first access; owners start earning
          passive income from day one.
        </p>
      </div>

      {/* role toggle */}
      <div className="flex gap-2 p-1 ed-card rounded-xl mb-8">
        {(['driver', 'owner'] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`flex-1 py-3 rounded-lg font-semibold capitalize transition ${
              role === r ? 'bg-gold-light text-black' : 'ed-muted'
            }`}
          >
            {r === 'driver' ? 'I want to drive' : 'I own car(s)'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="ed-card p-6 md:p-8 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <Field name="full_name" label="Full name" required />
          <Field name="email" label="Email" type="email" required />
          <Field name="phone" label="Phone" type="tel" placeholder="So we can text you at launch" />
          <Field name="city" label="City" />
        </div>

        {role === 'owner' && (
          <>
            <div className="border-t border-white/10 pt-5">
              <p className="font-semibold mb-1">Your vehicle</p>
              <p className="ed-muted text-sm mb-4">Tell us what you&apos;d list. You can add more later.</p>
              <div className="grid md:grid-cols-2 gap-4">
                <Field name="vehicle_make" label="Make" placeholder="Toyota" />
                <Field name="vehicle_model" label="Model" placeholder="Camry" />
                <Field name="vehicle_year" label="Year" type="number" placeholder="2020" />
                <Field name="vehicle_count" label="How many cars?" type="number" placeholder="1" />
              </div>
            </div>
            <div>
              <p className="font-semibold mb-1">What can your car be used for?</p>
              <p className="ed-muted text-sm mb-3">Pick all that apply — we&apos;ll only match drivers in these.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => toggleCat(c.value)}
                    className={`text-left p-4 rounded-lg border transition ${
                      cats.includes(c.value)
                        ? 'border-gold-light bg-gold-light/10'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-2">
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        cats.includes(c.value) ? 'bg-gold-light text-black border-gold-light' : 'border-white/30'
                      }`}>{cats.includes(c.value) ? '✓' : ''}</span>
                      {c.label}
                    </div>
                    <div className="ed-muted text-xs mt-1 ml-6">{c.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <Field name="notes" label="Anything else? (optional)" textarea />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="ed-cta ed-cta-primary w-full justify-center py-4 font-bold text-lg disabled:opacity-60"
        >
          {submitting ? 'Joining…' : role === 'owner' ? 'List my car — join waitlist' : 'Join the waitlist'}
        </button>
        <p className="ed-muted text-xs text-center">No spam. We only contact you about your spot and launch.</p>
      </form>
    </main>
  );
}

function Field({
  name, label, type = 'text', required, placeholder, textarea,
}: { name: string; label: string; type?: string; required?: boolean; placeholder?: string; textarea?: boolean }) {
  return (
    <label className={`block ${textarea ? 'md:col-span-2' : ''}`}>
      <span className="block text-sm ed-muted mb-1.5">{label}{required && ' *'}</span>
      {textarea ? (
        <textarea name={name} rows={3} placeholder={placeholder}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 focus:border-gold-light outline-none" />
      ) : (
        <input name={name} type={type} required={required} placeholder={placeholder}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 focus:border-gold-light outline-none" />
      )}
    </label>
  );
}
