'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const carImages = [
  '/images/ajoy-joseph-KnbwsTb72U8-unsplash.jpg',
  '/images/kashif-afridi-ld3jq4dsj8w-unsplash.jpg',
  '/images/krish-parmar-q1bBfWG1G1E-unsplash.jpg',
];

export function CarBackgroundCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % carImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {carImages.map((image, index) => (
        <div
          key={image}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={image}
            alt="Car background"
            fill
            priority={index === 0}
            className="object-cover"
            quality={75}
          />
        </div>
      ))}
      {/* Dark overlay for better text readability - shows cars faintly through it */}
      <div className="absolute inset-0 bg-glossy-black/85" />
    </div>
  );
}
