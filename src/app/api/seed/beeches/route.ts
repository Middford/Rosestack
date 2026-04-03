// ============================================================
// POST /api/seed/beeches
// Deprecated — portfolio demo data removed. Projects are now
// created via the Add Project wizard at /projects/add.
// ============================================================

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { message: 'Seed endpoint deprecated. Use POST /api/projects to create projects.' },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json(
    { message: 'Seed endpoint deprecated. Use GET /api/projects to list projects.' },
    { status: 410 },
  );
}
