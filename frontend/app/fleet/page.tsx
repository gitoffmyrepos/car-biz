'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

// Types for API response
interface FleetVehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  color: string | null;
  body_type: string | null;
  status: string;
  condition: string;
}

interface FleetCategory {
  category: string;
  display_name: string;
  count: number;
  available_count: number;
}

// Static vehicle categories as fallback when no real vehicles exist
const staticVehicleCategories = [
  {
    id: 'sedan',
    name: 'Luxury Sedans',
    description: 'Elegant and comfortable sedans perfect for daily commuting and business meetings.',
    features: ['Premium Interior', 'Advanced Safety', 'Fuel Efficient', 'Smooth Ride'],
    image: '/images/sedan-placeholder.jpg',
    availability: 'Available',
  },
  {
    id: 'suv',
    name: 'Premium SUVs',
    description: 'Spacious and versatile SUVs ideal for families and those who need extra cargo space.',
    features: ['7-Passenger Seating', 'All-Wheel Drive', 'Ample Cargo', 'Towing Capable'],
    image: '/images/suv-placeholder.jpg',
    availability: 'Available',
  },
  {
    id: 'sports',
    name: 'Sports & Performance',
    description: 'High-performance vehicles for those who demand power and style on the road.',
    features: ['Turbocharged Engine', 'Sport Suspension', 'Premium Sound', 'Head-Turning Design'],
    image: '/images/sports-placeholder.jpg',
    availability: 'Limited',
  },
  {
    id: 'compact',
    name: 'Compact & Economy',
    description: 'Efficient and affordable vehicles perfect for city driving and budget-conscious drivers.',
    features: ['Great MPG', 'Easy Parking', 'Low Maintenance', 'Modern Features'],
    image: '/images/compact-placeholder.jpg',
    availability: 'Available',
  },
  {
    id: 'luxury',
    name: 'Executive Luxury',
    description: 'Top-tier luxury vehicles with premium amenities for the discerning driver.',
    features: ['Leather Interior', 'Heated/Cooled Seats', 'Premium Audio', 'Driver Assistance'],
    image: '/images/luxury-placeholder.jpg',
    availability: 'Limited',
  },
  {
    id: 'truck',
    name: 'Pickup Trucks',
    description: 'Powerful trucks for work or play, featuring impressive towing and hauling capabilities.',
    features: ['Heavy Duty', 'Bed Liner', '4x4 Available', 'Work-Ready'],
    image: '/images/truck-placeholder.jpg',
    availability: 'Available',
  },
];

// Placeholder image component (using a gradient background)
function VehiclePlaceholder({ category }: { category: string }) {
  const gradients: Record<string, string> = {
    sedan: 'from-slate-800 to-slate-600',
    suv: 'from-stone-800 to-stone-600',
    sports: 'from-red-900 to-red-700',
    compact: 'from-blue-900 to-blue-700',
    luxury: 'from-amber-900 to-amber-700',
    truck: 'from-zinc-800 to-zinc-600',
  };

  const icons: Record<string, JSX.Element> = {
    sedan: (
      <svg className="w-24 h-24 text-white/30" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    ),
    suv: (
      <svg className="w-24 h-24 text-white/30" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.92 5.01C18.72 4.42 18.16 4 17.5 4H15V3H9v1H6.5c-.66 0-1.21.42-1.42 1.01L3 11v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 6h10.29l1.08 3.11H5.77L6.85 6zM19 17H5v-4.34l.23-.66h13.54l.23.66V17zM7.5 14c-.83 0-1.5.67-1.5 1.5S6.67 17 7.5 17 9 16.33 9 15.5 8.33 14 7.5 14zm9 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
      </svg>
    ),
    sports: (
      <svg className="w-24 h-24 text-white/30" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    ),
    compact: (
      <svg className="w-24 h-24 text-white/30" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    ),
    luxury: (
      <svg className="w-24 h-24 text-white/30" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    ),
    truck: (
      <svg className="w-24 h-24 text-white/30" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
    ),
  };

  return (
    <div className={`w-full h-48 bg-gradient-to-br ${gradients[category] || 'from-gray-800 to-gray-600'} rounded-t-xl flex items-center justify-center`}>
      {icons[category] || icons.sedan}
    </div>
  );
}

// Get status color classes
function getStatusColor(status: string): { bg: string; text: string } {
  const statusColors: Record<string, { bg: string; text: string }> = {
    available: { bg: 'bg-green-100', text: 'text-green-700' },
    leased: { bg: 'bg-blue-100', text: 'text-blue-700' },
    maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    unavailable: { bg: 'bg-red-100', text: 'text-red-700' },
    pending_inspection: { bg: 'bg-orange-100', text: 'text-orange-700' },
  };
  return statusColors[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
}

// Format status text for display
function formatStatus(status: string): string {
  if (status === 'available') return 'Available';
  if (status === 'leased') return 'Currently Leased';
  if (status === 'maintenance') return 'In Maintenance';
  if (status === 'unavailable') return 'Unavailable';
  if (status === 'pending_inspection') return 'Pending Inspection';
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function FleetPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [categories, setCategories] = useState<FleetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);

  useEffect(() => {
    const fetchFleetData = async () => {
      try {
        const [vehiclesRes, categoriesRes] = await Promise.all([
          fetch('http://localhost:8100/api/public/fleet'),
          fetch('http://localhost:8100/api/public/fleet/categories')
        ]);

        if (vehiclesRes.ok && categoriesRes.ok) {
          const vehiclesData = await vehiclesRes.json();
          const categoriesData = await categoriesRes.json();

          setVehicles(vehiclesData);
          setCategories(categoriesData);
          setHasRealData(vehiclesData.length > 0);
        }
      } catch (error) {
        console.error('Failed to fetch fleet data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFleetData();
  }, []);

  // Calculate total stats from real data or use defaults
  const totalVehicles = hasRealData ? vehicles.length : 50;
  const totalCategories = hasRealData ? categories.length : 6;
  const availableVehicles = hasRealData
    ? vehicles.filter(v => v.status === 'available').length
    : totalVehicles;

  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="container-luxury">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-display font-bold text-luxury-charcoal">
                FX<span className="text-gradient">Weekly</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/how-it-works" className="text-gray-600 hover:text-luxury-charcoal transition-colors">
                How It Works
              </Link>
              <Link href="/fleet" className="text-luxury-charcoal font-medium transition-colors">
                Fleet
              </Link>
              <Link href="/requirements" className="text-gray-600 hover:text-luxury-charcoal transition-colors">
                Requirements
              </Link>
              <Link href="/faq" className="text-gray-600 hover:text-luxury-charcoal transition-colors">
                FAQ
              </Link>
              <Link href="/contact" className="btn btn-primary">
                Get Started
              </Link>
            </div>
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" aria-label="Open menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 bg-gradient-luxury overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
        <div className="container-luxury relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="heading-display text-white mb-6">
              Our <span className="text-gradient">Fleet</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
              Explore our diverse collection of premium vehicles. From elegant sedans to powerful trucks,
              find the perfect vehicle for your lifestyle.
            </p>
          </div>
        </div>
      </section>

      {/* Fleet Info Banner */}
      <section className="bg-gold-50 py-8 border-b border-gold-200">
        <div className="container-luxury">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-center">
            <div>
              <div className="text-3xl font-bold text-luxury-charcoal">
                {loading ? '...' : hasRealData ? totalVehicles : '50+'}
              </div>
              <div className="text-sm text-muted">Total Vehicles</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-gold-300"></div>
            <div>
              <div className="text-3xl font-bold text-luxury-charcoal">
                {loading ? '...' : hasRealData ? availableVehicles : totalCategories}
              </div>
              <div className="text-sm text-muted">{hasRealData ? 'Available Now' : 'Vehicle Categories'}</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-gold-300"></div>
            <div>
              <div className="text-3xl font-bold text-luxury-charcoal">100%</div>
              <div className="text-sm text-muted">Inspected & Serviced</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-gold-300"></div>
            <div>
              <div className="text-3xl font-bold text-luxury-charcoal">48hr</div>
              <div className="text-sm text-muted">Quick Approval</div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Vehicles Section - Only shown when real data exists */}
      {hasRealData && vehicles.length > 0 && (
        <section className="section bg-white">
          <div className="container-luxury">
            <div className="text-center mb-12">
              <h2 className="heading-section text-luxury-charcoal mb-4">Our Fleet</h2>
              <p className="text-xl text-muted max-w-2xl mx-auto">
                Browse our current selection of premium vehicles available for weekly lease.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="card card-hover overflow-hidden group"
                >
                  {/* Vehicle Image Placeholder */}
                  <VehiclePlaceholder category={vehicle.body_type || 'sedan'} />

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-luxury-charcoal group-hover:text-gold-600 transition-colors">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(vehicle.status).bg
                      } ${getStatusColor(vehicle.status).text}`}>
                        {formatStatus(vehicle.status)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {vehicle.color && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                          {vehicle.color}
                        </span>
                      )}
                      {vehicle.body_type && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md capitalize">
                          {vehicle.body_type}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md capitalize">
                        {vehicle.condition.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Action Button */}
                    <Link
                      href="/contact"
                      className={`btn w-full text-center block ${
                        vehicle.status === 'available'
                          ? 'btn-primary'
                          : 'btn-outline opacity-75'
                      }`}
                    >
                      {vehicle.status === 'available'
                        ? 'Inquire About This Vehicle'
                        : 'Join Waitlist'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Vehicle Categories Grid - Fallback when no real data */}
      {!hasRealData && (
        <section className="section bg-white">
          <div className="container-luxury">
            <div className="text-center mb-12">
              <h2 className="heading-section text-luxury-charcoal mb-4">Vehicle Categories</h2>
              <p className="text-xl text-muted max-w-2xl mx-auto">
                Browse our selection of professionally maintained vehicles ready for weekly lease.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {staticVehicleCategories.map((category) => (
                <div
                  key={category.id}
                  className="card card-hover overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                >
                  {/* Vehicle Image Placeholder */}
                  <VehiclePlaceholder category={category.id} />

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-luxury-charcoal group-hover:text-gold-600 transition-colors">
                        {category.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        category.availability === 'Available'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {category.availability}
                      </span>
                    </div>

                    <p className="text-muted mb-4">
                      {category.description}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {category.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Action Button */}
                    <Link
                      href="/contact"
                      className="btn btn-outline w-full text-center block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Inquire About This Category
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quality Assurance Section */}
      <section className="section bg-luxury-cream">
        <div className="container-luxury">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="heading-section text-luxury-charcoal mb-6">
                Quality You Can Trust
              </h2>
              <p className="text-lg text-muted mb-8">
                Every vehicle in our fleet undergoes a rigorous inspection and reconditioning process
                before being made available for lease. We believe in providing exceptional value without
                compromising on quality or safety.
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-luxury-charcoal">Multi-Point Inspection</h4>
                    <p className="text-muted">Comprehensive inspection of all mechanical and safety systems</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-luxury-charcoal">Professional Detailing</h4>
                    <p className="text-muted">Interior and exterior detailing to showroom standards</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-luxury-charcoal">Monthly Maintenance</h4>
                    <p className="text-muted">Regular servicing included at no extra cost</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gold-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-luxury-charcoal">Full Documentation</h4>
                    <p className="text-muted">Complete service history and vehicle records available</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-600 rounded-2xl p-8 text-white">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gold-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4">Quality Guarantee</h3>
                <p className="text-gray-300 mb-6">
                  Not satisfied with your vehicle within the first week? We&apos;ll work with you to find a
                  better match from our fleet at no additional charge.
                </p>
                <div className="border-t border-white/20 pt-6 mt-6">
                  <p className="text-sm text-gray-400">
                    Terms and conditions apply. See our service agreement for details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-gradient-luxury text-white">
        <div className="container-luxury text-center">
          <h2 className="heading-section mb-4">Ready to Find Your Perfect Vehicle?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Contact us today to discuss your needs and get matched with the ideal vehicle from our fleet.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact" className="btn btn-primary text-lg px-8 py-4 w-full sm:w-auto">
              Start Your Application
            </Link>
            <Link href="/requirements" className="btn btn-outline border-white text-white hover:bg-white hover:text-luxury-charcoal text-lg px-8 py-4 w-full sm:w-auto">
              View Requirements
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-luxury-charcoal text-white py-12">
        <div className="container-luxury">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <Link href="/" className="text-2xl font-display font-bold">
                FX<span className="text-gold-500">Weekly</span>
              </Link>
              <p className="mt-4 text-gray-400">
                Premium vehicle leasing with flexible weekly payments.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/fleet" className="text-gray-400 hover:text-white transition-colors">Our Fleet</Link></li>
                <li><Link href="/requirements" className="text-gray-400 hover:text-white transition-colors">Requirements</Link></li>
                <li><Link href="/faq" className="text-gray-400 hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/gps-disclosure" className="text-gray-400 hover:text-white transition-colors">GPS Disclosure</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>support@fxweekly.com</li>
                <li>(555) 123-4567</li>
              </ul>
              <Link href="/contact" className="btn btn-primary mt-4 w-full text-center">
                Contact Us
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; {new Date().getFullYear()} FX Weekly Lease. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
