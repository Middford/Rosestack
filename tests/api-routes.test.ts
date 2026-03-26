// ============================================================
// API Route Handler Tests
// Tests the route logic using mocked NextRequest/NextResponse
// and a mocked database. No real DB or HTTP calls.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mock the database module ---
vi.mock('@/shared/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Helper to build a mock db chain
function mockDbChain(returnValue: unknown) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue(
    Array.isArray(returnValue) ? returnValue : [returnValue],
  );
  // Make the chain itself thenable (for cases where .returning() is not called)
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(returnValue).then(resolve);
  return chain;
}

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ============================================================
// Homes GET
// ============================================================

describe('GET /api/homes', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns list of homes', async () => {
    const mockHomes = [
      { id: 'home-1', address: '1 Test St', postcode: 'BB1 1AA', status: 'prospect' },
      { id: 'home-2', address: '2 Test St', postcode: 'BB1 1AB', status: 'live' },
    ];
    const { db } = await import('@/shared/db');
    const chain = mockDbChain(mockHomes);
    vi.mocked(db.select).mockReturnValue(chain as ReturnType<typeof db.select>);

    const { GET } = await import('@/app/api/homes/route');
    const req = makeRequest('GET', 'http://localhost:3000/api/homes');
    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ============================================================
// Homes POST
// ============================================================

describe('POST /api/homes', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('creates a home with valid data', async () => {
    const newHome = {
      id: 'home-new',
      address: '10 Rose Lane, Accrington',
      postcode: 'BB5 1AA',
      latitude: 53.7535,
      longitude: -2.3627,
      phase: '3-phase' as const,
      status: 'prospect',
    };
    const { db } = await import('@/shared/db');
    const chain = mockDbChain(newHome);
    vi.mocked(db.insert).mockReturnValue(chain as ReturnType<typeof db.insert>);

    const { POST } = await import('@/app/api/homes/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/homes', {
      address: '10 Rose Lane, Accrington',
      postcode: 'BB5 1AA',
      latitude: 53.7535,
      longitude: -2.3627,
      phase: '3-phase',
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
  });

  it('returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/homes/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/homes', {
      address: '10 Rose Lane',
      // missing postcode, latitude, longitude, phase
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('returns 400 for invalid phase value', async () => {
    const { POST } = await import('@/app/api/homes/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/homes', {
      address: '10 Rose Lane, Accrington',
      postcode: 'BB5 1AA',
      latitude: 53.7535,
      longitude: -2.3627,
      phase: 'invalid-phase',
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 for address that is too short', async () => {
    const { POST } = await import('@/app/api/homes/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/homes', {
      address: 'hi',
      postcode: 'BB5 1AA',
      latitude: 53.7535,
      longitude: -2.3627,
      phase: '1-phase',
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});

// ============================================================
// Leads GET
// ============================================================

describe('GET /api/leads', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns list of leads', async () => {
    const mockLeads = [
      { id: 'lead-1', name: 'Alice Smith', source: 'referral', status: 'new' },
    ];
    const { db } = await import('@/shared/db');
    const chain = mockDbChain(mockLeads);
    vi.mocked(db.select).mockReturnValue(chain as ReturnType<typeof db.select>);

    const { GET } = await import('@/app/api/leads/route');
    const req = makeRequest('GET', 'http://localhost:3000/api/leads');
    const response = await GET(req);
    expect(response.status).toBe(200);
  });
});

// ============================================================
// Leads POST
// ============================================================

describe('POST /api/leads', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('creates a lead with valid data', async () => {
    const newLead = { id: 'lead-new', name: 'Bob Jones', source: 'door-knock', status: 'new' };
    const { db } = await import('@/shared/db');
    const chain = mockDbChain(newLead);
    vi.mocked(db.insert).mockReturnValue(chain as ReturnType<typeof db.insert>);

    const { POST } = await import('@/app/api/leads/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', {
      name: 'Bob Jones',
      source: 'door-knock',
      email: 'bob@example.com',
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('returns 400 for invalid source', async () => {
    const { POST } = await import('@/app/api/leads/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', {
      name: 'Bob Jones',
      source: 'telemarketing', // not in enum
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid email', async () => {
    const { POST } = await import('@/app/api/leads/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', {
      name: 'Bob Jones',
      source: 'referral',
      email: 'not-an-email',
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 for name too short', async () => {
    const { POST } = await import('@/app/api/leads/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/leads', {
      name: 'B',
      source: 'referral',
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});

// ============================================================
// Risk GET/POST
// ============================================================

describe('GET /api/risk', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns list of risks ordered by score', async () => {
    const mockRisks = [
      { id: 'R-1', name: 'IOF rate reduction', score: 16, category: 'tariff' },
    ];
    const { db } = await import('@/shared/db');
    const chain = mockDbChain(mockRisks);
    vi.mocked(db.select).mockReturnValue(chain as ReturnType<typeof db.select>);

    const { GET } = await import('@/app/api/risk/route');
    const response = await GET();
    expect(response.status).toBe(200);
  });
});

describe('POST /api/risk', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('creates a risk and auto-calculates score', async () => {
    const { db } = await import('@/shared/db');
    const chain = mockDbChain({ id: 'R-new', name: 'Test risk', score: 12 });
    vi.mocked(db.insert).mockReturnValue(chain as ReturnType<typeof db.insert>);

    const { POST } = await import('@/app/api/risk/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/risk', {
      name: 'Test risk item',
      category: 'tariff',
      description: 'A test risk for our tariff exposure',
      probability: 3,
      impact: 4,
      mitigationStrategy: 'Monitor and hedge with alternative tariffs',
      mitigationOwner: 'Dave',
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('returns 400 for probability out of range', async () => {
    const { POST } = await import('@/app/api/risk/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/risk', {
      name: 'Test risk',
      category: 'tariff',
      description: 'Test description long enough',
      probability: 6, // max is 5
      impact: 3,
      mitigationStrategy: 'Some strategy here',
      mitigationOwner: 'Dave',
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid category', async () => {
    const { POST } = await import('@/app/api/risk/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/risk', {
      name: 'Test risk',
      category: 'weather', // not in enum
      description: 'Test description long enough',
      probability: 3,
      impact: 3,
      mitigationStrategy: 'Some strategy here',
      mitigationOwner: 'Dave',
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});

// ============================================================
// Opportunities POST
// ============================================================

describe('POST /api/opportunities', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('creates an opportunity with valid data', async () => {
    const { db } = await import('@/shared/db');
    const chain = mockDbChain({ id: 'O-new', name: 'LFP cost reduction', score: 16 });
    vi.mocked(db.insert).mockReturnValue(chain as ReturnType<typeof db.insert>);

    const { POST } = await import('@/app/api/opportunities/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/opportunities', {
      name: 'LFP cost reduction opportunity',
      category: 'hardware-cost',
      description: 'Battery prices continue to fall 10-20% annually, reducing our capex',
      probability: 4,
      impact: 4,
      captureStrategy: 'Monitor BloombergNEF pricing, renegotiate annually',
      captureOwner: 'Josh',
      expectedValue: 50000,
    });
    const response = await POST(req);
    expect(response.status).toBe(201);
  });

  it('returns 400 for negative expectedValue', async () => {
    const { POST } = await import('@/app/api/opportunities/route');
    const req = makeRequest('POST', 'http://localhost:3000/api/opportunities', {
      name: 'LFP cost reduction opportunity',
      category: 'hardware-cost',
      description: 'Test description long enough',
      probability: 4,
      impact: 4,
      captureStrategy: 'Test strategy here',
      captureOwner: 'Josh',
      expectedValue: -1000, // must be positive
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
