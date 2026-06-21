import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Kubernetes liveness/readiness probes
 * Returns 200 OK when the application is healthy
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'gigwheels-frontend',
    timestamp: new Date().toISOString(),
  });
}
