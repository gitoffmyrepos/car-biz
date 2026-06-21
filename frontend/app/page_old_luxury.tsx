'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  DollarSign,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  TrendingUp,
  Award,
  Clock,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { TestimonialsCarousel } from '@/components/ui/TestimonialsCarousel';
import { FeaturedFleet } from '@/components/ui/FeaturedFleet';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    },
    [mobileMenuOpen]
  );

  // Animation hooks
  const [statsRef, statsInView] = useInView({ threshold: 0.3, triggerOnce: true });
  const [featuresRef, featuresInView] = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <div className="min-h-screen bg-luxury-pearl dark:bg-luxury-midnight" onKeyDown={handleKeyDown} suppressHydrationWarning>
      {/* Skip to main content */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Premium Navigation with Glassmorphism */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-luxury-charcoal/80 backdrop-blur-xl border-b border-gray-200/20 dark:border-gray-800/20 shadow-lg"
        role="navigation"
        aria-label="Main navigation"
        suppressHydrationWarning
      >
        <div className="container-luxury">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo with Animation */}
            <Link href="/" className="flex items-center space-x-2 group">
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="text-2xl md:text-3xl font-display font-bold text-luxury-charcoal dark:text-white"
              >
                FX<span className="text-gradient">Weekly</span>
              </motion.span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/how-it-works"
                className="text-gray-700 dark:text-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors font-medium"
              >
                How It Works
              </Link>
              <Link
                href="/fleet"
                className="text-gray-700 dark:text-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors font-medium"
              >
                Fleet
              </Link>
              <Link
                href="/requirements"
                className="text-gray-700 dark:text-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors font-medium"
              >
                Requirements
              </Link>
              <Link
                href="/faq"
                className="text-gray-700 dark:text-gray-300 hover:text-gold-600 dark:hover:text-gold-400 transition-colors font-medium"
              >
                FAQ
              </Link>
              <ThemeToggle showDropdown />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/contact"
                  className="btn btn-primary shadow-gold hover:shadow-gold/50 transition-all"
                >
                  Get Started
                </Link>
              </motion.div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              <ThemeToggle />
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-luxury-charcoal dark:text-white transition-colors"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                onClick={toggleMobileMenu}
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              id="mobile-menu"
              className="md:hidden border-t border-gray-200/20 dark:border-gray-800/20 bg-white/90 dark:bg-luxury-charcoal/90 backdrop-blur-xl py-4"
            >
              <div className="flex flex-col space-y-2 px-4">
                {['How It Works', 'Fleet', 'Requirements', 'FAQ'].map((item) => (
                  <Link
                    key={item}
                    href={`/${item.toLowerCase().replace(/ /g, '-')}`}
                    className="text-gray-700 dark:text-gray-300 hover:text-gold-600 dark:hover:text-gold-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 px-3 py-2 rounded-lg transition-colors"
                    onClick={closeMobileMenu}
                  >
                    {item}
                  </Link>
                ))}
                <Link
                  href="/contact"
                  className="btn btn-primary mt-2 text-center"
                  onClick={closeMobileMenu}
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </motion.nav>

      {/* Hero Section - Ultra Premium */}
      <main id="main-content" role="main">
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 overflow-hidden" suppressHydrationWarning>
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-luxury" suppressHydrationWarning>
            {/* Animated Orbs */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute top-0 left-0 w-[500px] h-[500px] bg-gold-500/20 rounded-full blur-3xl"
              suppressHydrationWarning
            />
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 10, repeat: Infinity, delay: 1 }}
              className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl"
              suppressHydrationWarning
            />
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 12, repeat: Infinity, delay: 2 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-500/20 rounded-full blur-3xl"
              suppressHydrationWarning
            />
          </div>

          {/* Content */}
          <div className="container-luxury relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                {/* Premium Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white mb-8"
                >
                  <Award className="w-4 h-4 text-gold-400" />
                  <span className="text-sm font-medium">Premium Fleet Management</span>
                </motion.div>

                <h1 className="heading-display text-white mb-6">
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="block"
                  >
                    Drive Your Dream
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="block text-gradient mt-2"
                  >
                    Pay Weekly
                  </motion.span>
                </h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed"
                >
                  Premium vehicles with flexible weekly payments. No long-term commitment.
                  <span className="block mt-2">Professional fleet management for discerning customers.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      href="/contact"
                      className="group btn btn-primary text-lg px-8 py-4 w-full sm:w-auto shadow-gold hover:shadow-gold/70 transition-all inline-flex items-center gap-2"
                    >
                      Get Started Today
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      href="/fleet"
                      className="btn btn-outline border-2 border-white text-white hover:bg-white hover:text-luxury-charcoal text-lg px-8 py-4 w-full sm:w-auto transition-all"
                    >
                      Browse Fleet
                    </Link>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 border-2 border-white/30 rounded-full p-1"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto" />
            </motion.div>
          </motion.div>
        </section>

        {/* Stats Section */}
        <section ref={statsRef} className="section bg-white dark:bg-luxury-charcoal relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-pearl/50 to-transparent dark:from-luxury-midnight/50" />
          <div className="container-luxury relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'Happy Customers', value: 2500, suffix: '+', icon: Star },
                { label: 'Premium Vehicles', value: 150, suffix: '+', icon: TrendingUp },
                { label: 'Years Experience', value: 12, suffix: '+', icon: Award },
                { label: 'Avg. Approval Time', value: 24, suffix: 'h', icon: Clock },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={statsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: index * 0.1 }}
                  className="text-center group"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gold-100 dark:bg-gold-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <stat.icon className="w-6 h-6 text-gold-600 dark:text-gold-400" />
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Fleet Section */}
        <section className="section bg-luxury-cream dark:bg-luxury-midnight">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="heading-section text-luxury-charcoal dark:text-white mb-4">
                Featured Premium Fleet
              </h2>
              <p className="text-xl text-muted max-w-2xl mx-auto">
                Discover our handpicked selection of premium vehicles available for weekly lease
              </p>
            </motion.div>

            <FeaturedFleet />

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <Link
                href="/fleet"
                className="inline-flex items-center gap-2 text-gold-600 dark:text-gold-400 font-semibold hover:gap-4 transition-all group"
              >
                View Full Fleet
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Value Propositions with Enhanced Icons */}
        <section ref={featuresRef} className="section bg-white dark:bg-luxury-charcoal">
          <div className="container-luxury">
            <div className="text-center mb-16">
              <h2 className="heading-section text-luxury-charcoal dark:text-white mb-4">
                Why Choose GigWheels?
              </h2>
              <p className="text-xl text-muted max-w-2xl mx-auto">
                Experience the freedom of premium vehicles without the burden of ownership
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: DollarSign,
                  title: 'Flexible Payments',
                  description:
                    'Pay weekly with no hidden fees. Starting from just $150/week with transparent pricing.',
                  color: 'from-green-500 to-emerald-500',
                },
                {
                  icon: Shield,
                  title: 'Full Protection',
                  description:
                    'Comprehensive maintenance included. We handle all servicing so you can focus on driving.',
                  color: 'from-blue-500 to-cyan-500',
                },
                {
                  icon: Zap,
                  title: 'Quick Approval',
                  description:
                    'Simple application process. Get approved and drive away in as little as 48 hours.',
                  color: 'from-yellow-500 to-orange-500',
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: index * 0.2 }}
                  whileHover={{ y: -8 }}
                  className="relative group"
                >
                  <div className="card card-hover text-center relative overflow-hidden">
                    {/* Gradient Background on Hover */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                    />

                    <div className="relative z-10">
                      <div className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-luxury-charcoal dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="text-muted leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Preview */}
        <section className="section bg-luxury-cream dark:bg-luxury-midnight">
          <div className="container-luxury">
            <div className="text-center mb-16">
              <h2 className="heading-section text-luxury-charcoal dark:text-white mb-4">
                Simple Process, Premium Experience
              </h2>
              <p className="text-xl text-muted max-w-2xl mx-auto">
                Get behind the wheel in three easy steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: 1, title: 'Apply Online', description: 'Complete our simple application form with your basic information' },
                { step: 2, title: 'Choose Your Vehicle', description: 'Browse our fleet and select the perfect vehicle for your needs' },
                { step: 3, title: 'Drive Away', description: 'Complete verification and drive away in your new vehicle' },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="text-center relative"
                >
                  <div className="relative inline-block mb-6">
                    <div className="w-16 h-16 bg-gradient-gold rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-gold">
                      {item.step}
                    </div>
                    {index < 2 && (
                      <div className="hidden md:block absolute top-8 left-full w-32 h-0.5 bg-gradient-to-r from-gold-500 to-transparent" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-luxury-charcoal dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-muted">{item.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/how-it-works" className="btn btn-secondary">
                Learn More About Our Process
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="section bg-white dark:bg-luxury-charcoal">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="heading-section text-luxury-charcoal dark:text-white mb-4">
                What Our Customers Say
              </h2>
              <p className="text-xl text-muted max-w-2xl mx-auto">
                Join thousands of satisfied customers who trust GigWheels
              </p>
            </motion.div>

            <TestimonialsCarousel />
          </div>
        </section>

        {/* CTA Section - Enhanced */}
        <section className="section relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-luxury">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-500/20 rounded-full blur-3xl"
            />
          </div>

          <div className="container-luxury text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="heading-section text-white mb-4">
                Ready to Experience Premium Driving?
              </h2>
              <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
                Join hundreds of satisfied customers who have discovered the smarter way to drive.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/contact"
                    className="group btn btn-primary text-lg px-8 py-4 w-full sm:w-auto shadow-gold hover:shadow-gold/70 transition-all inline-flex items-center gap-2"
                  >
                    Start Your Application
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/fleet"
                    className="btn btn-outline border-2 border-white text-white hover:bg-white hover:text-luxury-charcoal text-lg px-8 py-4 w-full sm:w-auto transition-all"
                  >
                    Browse Our Fleet
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Premium Footer */}
      <footer className="bg-luxury-charcoal text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-midnight to-transparent" />
        <div className="container-luxury relative z-10">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="text-3xl font-display font-bold inline-block mb-4">
                FX<span className="text-gold-500">Weekly</span>
              </Link>
              <p className="text-gray-300 leading-relaxed">
                Weekly car rentals for gig drivers, with flexible weekly payments.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold mb-4 text-lg">Company</h4>
              <ul className="space-y-3">
                {['How It Works', 'Our Fleet', 'Requirements', 'FAQ'].map((item) => (
                  <li key={item}>
                    <Link
                      href={`/${item.toLowerCase().replace(/ /g, '-').replace('our-', '')}`}
                      className="text-gray-300 hover:text-gold-400 transition-colors inline-flex items-center gap-2 group"
                    >
                      <CheckCircle className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold mb-4 text-lg">Legal</h4>
              <ul className="space-y-3">
                {['Terms of Service', 'Privacy Policy', 'GPS Disclosure'].map((item) => (
                  <li key={item}>
                    <Link
                      href={`/${item.toLowerCase().replace(/ /g, '-').replace('of-service', '').replace('disclosure', '')}`}
                      className="text-gray-300 hover:text-gold-400 transition-colors inline-flex items-center gap-2 group"
                    >
                      <CheckCircle className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold mb-4 text-lg">Contact</h4>
              <ul className="space-y-3 text-gray-300">
                <li>
                  <a href="mailto:support@fxweekly.com" className="hover:text-gold-400 transition-colors">
                    support@fxweekly.com
                  </a>
                </li>
                <li>
                  <a href="tel:+15551234567" className="hover:text-gold-400 transition-colors">
                    (555) 123-4567
                  </a>
                </li>
              </ul>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-4">
                <Link href="/contact" className="btn btn-primary w-full text-center">
                  Contact Us
                </Link>
              </motion.div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2026 GigWheels. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
