'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Michael Anderson',
    role: 'Business Owner',
    content: 'GigWheels made it incredibly easy to get a premium vehicle without the long-term commitment. The weekly payment structure fits perfectly with my business cash flow.',
    rating: 5,
    image: '/api/placeholder/80/80',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    role: 'Freelance Consultant',
    content: 'The approval process was fast and straightforward. Within 48 hours, I was driving a luxury sedan. The flexibility and customer service are unmatched.',
    rating: 5,
    image: '/api/placeholder/80/80',
  },
  {
    id: 3,
    name: 'David Chen',
    role: 'Real Estate Agent',
    content: 'Professional fleet management and transparent pricing. No hidden fees, just quality vehicles and excellent service. Highly recommend for professionals.',
    rating: 5,
    image: '/api/placeholder/80/80',
  },
  {
    id: 4,
    name: 'Jennifer Martinez',
    role: 'Sales Executive',
    content: 'Having access to premium vehicles has elevated my professional image. The maintenance is handled completely by GigWheels - I just drive and focus on my work.',
    rating: 5,
    image: '/api/placeholder/80/80',
  },
];

export function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) nextIndex = testimonials.length - 1;
      if (nextIndex >= testimonials.length) nextIndex = 0;
      return nextIndex;
    });
  };

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      paginate(1);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  return (
    <div className="relative max-w-4xl mx-auto px-4">
      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(_e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            className="w-full"
          >
            <div className="bg-white dark:bg-luxury-slate rounded-2xl shadow-luxury p-8 md:p-12">
              <div className="flex items-center mb-6">
                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-gold-500 text-gold-500 mr-1" />
                ))}
              </div>

              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8 italic leading-relaxed">
                "{testimonials[currentIndex].content}"
              </p>

              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-gold rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {testimonials[currentIndex].name.charAt(0)}
                </div>
                <div className="ml-4">
                  <div className="font-bold text-luxury-charcoal dark:text-white">
                    {testimonials[currentIndex].name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonials[currentIndex].role}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-center mt-8 gap-4">
        <button
          onClick={() => paginate(-1)}
          className="p-3 rounded-full bg-white dark:bg-luxury-slate shadow-lg hover:shadow-xl transition-shadow text-luxury-charcoal dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-gold-500 w-8'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gold-300'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => paginate(1)}
          className="p-3 rounded-full bg-white dark:bg-luxury-slate shadow-lg hover:shadow-xl transition-shadow text-luxury-charcoal dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
