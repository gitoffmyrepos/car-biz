/**
 * Weekly Vehicle Leasing Platform - Root Loading
 * Salvage-to-Lux Fleet Management
 *
 * Global loading state for Next.js App Router.
 * Displays during route transitions and initial page loads.
 */

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-luxury-pearl">
      <div className="text-center">
        <div className="relative">
          {/* Spinner */}
          <div className="w-16 h-16 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
          {/* Logo in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-gold-500">FX</span>
          </div>
        </div>
        <p className="mt-4 text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  );
}
