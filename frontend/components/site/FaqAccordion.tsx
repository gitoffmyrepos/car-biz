'use client';

/**
 * Minimal accessible FAQ accordion (native <details>-style behavior via state).
 */
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export interface FaqItem {
  q: string;
  a: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="border-t ed-hairline">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-b ed-hairline">
            <button
              className="w-full flex items-center justify-between gap-4 py-5 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span className="font-display text-lg md:text-xl font-medium">{item.q}</span>
              <span className="text-gold flex-shrink-0" aria-hidden="true">
                {isOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </span>
            </button>
            {isOpen && <p className="ed-muted pb-6 pr-8 leading-relaxed text-sm">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
