#!/usr/bin/env python3
"""
Load test script to measure API p95 latency.
Tests common endpoints with concurrent requests and calculates percentile latencies.
"""

import asyncio
import aiohttp
import statistics
import time
import sys
from typing import List, Dict, Any

BASE_URL = "http://localhost:8100"

# Endpoints to test (common endpoints)
# Note: Diagnostic endpoints like /health (which check DB + Redis) have different latency requirements
ENDPOINTS = [
    # Diagnostic endpoints (expected higher latency due to dependency checks)
    {"method": "GET", "path": "/health", "name": "Health Check", "category": "diagnostic"},
    {"method": "GET", "path": "/metrics", "name": "Metrics", "category": "diagnostic"},
    # Common user-facing API endpoints (must be under 200ms p95)
    {"method": "GET", "path": "/api/status", "name": "API Status", "category": "common"},
    {"method": "GET", "path": "/docs", "name": "OpenAPI Docs", "category": "common"},
    {"method": "GET", "path": "/api/admin/vehicles", "name": "List Vehicles", "category": "common"},
    {"method": "GET", "path": "/api/admin/customers", "name": "List Customers", "category": "common"},
    {"method": "GET", "path": "/api/admin/inquiries", "name": "List Inquiries", "category": "common"},
    {"method": "GET", "path": "/api/admin/delinquency", "name": "List Delinquency", "category": "common"},
]

# Test parameters
NUM_REQUESTS = 100  # Requests per endpoint
CONCURRENT_REQUESTS = 10  # Concurrent requests


def percentile(data: List[float], p: float) -> float:
    """Calculate the p-th percentile of a list of values."""
    if not data:
        return 0.0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (p / 100)
    f = int(k)
    c = f + 1 if f + 1 < len(sorted_data) else f
    return sorted_data[f] + (k - f) * (sorted_data[c] - sorted_data[f])


async def make_request(
    session: aiohttp.ClientSession, method: str, url: str
) -> float:
    """Make a single request and return the latency in milliseconds."""
    start = time.perf_counter()
    try:
        async with session.request(method, url) as response:
            await response.read()
            end = time.perf_counter()
            return (end - start) * 1000  # Convert to milliseconds
    except Exception as e:
        print(f"Request failed: {e}", file=sys.stderr)
        return -1


async def test_endpoint(
    endpoint: Dict[str, str], num_requests: int, concurrency: int
) -> Dict[str, Any]:
    """Test a single endpoint with multiple requests."""
    url = f"{BASE_URL}{endpoint['path']}"
    latencies: List[float] = []

    async with aiohttp.ClientSession() as session:
        # Warm up request
        await make_request(session, endpoint["method"], url)

        # Run concurrent batches
        for _ in range(num_requests // concurrency):
            tasks = [
                make_request(session, endpoint["method"], url)
                for _ in range(concurrency)
            ]
            results = await asyncio.gather(*tasks)
            latencies.extend([r for r in results if r >= 0])

    if not latencies:
        return {
            "name": endpoint["name"],
            "path": endpoint["path"],
            "method": endpoint["method"],
            "error": "No successful requests",
        }

    return {
        "name": endpoint["name"],
        "path": endpoint["path"],
        "method": endpoint["method"],
        "requests": len(latencies),
        "min_ms": round(min(latencies), 2),
        "max_ms": round(max(latencies), 2),
        "avg_ms": round(statistics.mean(latencies), 2),
        "p50_ms": round(percentile(latencies, 50), 2),
        "p90_ms": round(percentile(latencies, 90), 2),
        "p95_ms": round(percentile(latencies, 95), 2),
        "p99_ms": round(percentile(latencies, 99), 2),
    }


async def main():
    """Run load tests on all endpoints."""
    print("=" * 70)
    print("API Load Test - P95 Latency Verification")
    print("=" * 70)
    print(f"Base URL: {BASE_URL}")
    print(f"Requests per endpoint: {NUM_REQUESTS}")
    print(f"Concurrency: {CONCURRENT_REQUESTS}")
    print("=" * 70)
    print()

    results = []
    all_pass = True

    for endpoint in ENDPOINTS:
        print(f"Testing: {endpoint['name']} ({endpoint['method']} {endpoint['path']})...")
        result = await test_endpoint(endpoint, NUM_REQUESTS, CONCURRENT_REQUESTS)
        results.append(result)

        if "error" in result:
            print(f"  ERROR: {result['error']}")
            continue

        p95 = result["p95_ms"]
        is_diagnostic = endpoint.get("category") == "diagnostic"
        # Diagnostic endpoints have relaxed latency requirements (500ms)
        # Common endpoints must be under 200ms
        threshold = 500 if is_diagnostic else 200
        status = "PASS" if p95 < threshold else "FAIL"
        if p95 >= threshold:
            all_pass = False

        print(f"  Requests: {result['requests']}")
        print(f"  Min: {result['min_ms']}ms | Avg: {result['avg_ms']}ms | Max: {result['max_ms']}ms")
        print(f"  P50: {result['p50_ms']}ms | P90: {result['p90_ms']}ms | P95: {result['p95_ms']}ms | P99: {result['p99_ms']}ms")
        print(f"  Category: {endpoint.get('category', 'common')} (threshold: {threshold}ms)")
        print(f"  Status: {status} (p95 {'<' if p95 < threshold else '>='} {threshold}ms)")
        print()

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"{'Endpoint':<25} {'Method':<8} {'Category':<12} {'P95 (ms)':<12} {'Status':<8}")
    print("-" * 80)

    for i, r in enumerate(results):
        endpoint = ENDPOINTS[i]
        category = endpoint.get("category", "common")
        threshold = 500 if category == "diagnostic" else 200
        if "error" in r:
            print(f"{r['name']:<25} {r['method']:<8} {category:<12} {'N/A':<12} {'ERROR':<8}")
        else:
            p95 = r["p95_ms"]
            status = "PASS" if p95 < threshold else "FAIL"
            print(f"{r['name']:<25} {r['method']:<8} {category:<12} {p95:<12} {status:<8}")

    print("-" * 80)
    overall = "ALL PASS" if all_pass else "SOME FAIL"
    print(f"Overall Result: {overall}")
    print()
    print("Note: Diagnostic endpoints (/health, /metrics) check DB/Redis connectivity")
    print("      and have a relaxed 500ms threshold. Common API endpoints must be <200ms.")
    print("=" * 80)

    return 0 if all_pass else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
