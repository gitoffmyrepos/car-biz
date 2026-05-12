'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Car, Gauge, Users, Zap } from 'lucide-react';
import Link from 'next/link';

const featuredVehicles = [
  {
    id: 1,
    name: 'Premium Sedan',
    category: 'Luxury',
    price: 180,
    features: ['Leather Interior', 'Advanced Safety', 'Premium Sound'],
    specs: { seats: 5, power: '300+ HP', type: 'Automatic' },
    gradient: 'from-blue-600 to-purple-600',
  },
  {
    id: 2,
    name: 'Executive SUV',
    category: 'Premium',
    price: 220,
    features: ['4WD', 'Spacious Interior', 'Tech Package'],
    specs: { seats: 7, power: '350+ HP', type: 'Automatic' },
    gradient: 'from-purple-600 to-pink-600',
  },
  {
    id: 3,
    name: 'Sport Coupe',
    category: 'Performance',
    price: 250,
    features: ['Sport Mode', 'Carbon Fiber', 'Track Ready'],
    specs: { seats: 4, power: '400+ HP', type: 'Automatic' },
    gradient: 'from-red-600 to-orange-600',
  },
];

export function FeaturedFleet() {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="grid md:grid-cols-3 gap-8"
    >
      {featuredVehicles.map((vehicle) => (
        <motion.div
          key={vehicle.id}
          variants={cardVariants}
          whileHover={{ y: -8 }}
          className="group relative"
        >
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-luxury-slate shadow-luxury hover:shadow-luxury-lg transition-all duration-300">
            {/* Vehicle Image Placeholder with Gradient */}
            <div className={`relative h-48 bg-gradient-to-br ${vehicle.gradient} overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                <span className="text-white text-sm font-semibold">{vehicle.category}</span>
              </div>

              {/* Car Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Car className="w-24 h-24 text-white/40 group-hover:scale-110 transition-transform duration-300" />
              </div>

              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-100 transition-opacity duration-700 group-hover:animate-shimmer" />
            </div>

            {/* Content */}
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2 text-luxury-charcoal dark:text-white">
                {vehicle.name}
              </h3>

              {/* Specs */}
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{vehicle.specs.seats}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Gauge className="w-4 h-4" />
                  <span>{vehicle.specs.power}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  <span>{vehicle.specs.type}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {vehicle.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 bg-gold-500 rounded-full mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Price & CTA */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <div className="text-2xl font-bold text-gold-600">
                    ${vehicle.price}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">per week</div>
                </div>
                <Link
                  href="/fleet"
                  className="px-4 py-2 bg-gradient-gold text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
