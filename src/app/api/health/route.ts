import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight liveness/readiness endpoint used by container healthchecks and
 * uptime monitors. Returns 200 with basic metadata; never leaks internals.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "itinera",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
