import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OpenRouterBalanceConfig } from './openrouter-balance.config';
import {
  BALANCE_CACHE_TTL_MS,
  OpenRouterBalanceService,
} from './openrouter-balance.service';

const BASE_CONFIG: OpenRouterBalanceConfig = {
  alertThreshold: 5,
  baseUrl: 'https://openrouter.ai/api/v1',
  criticalThreshold: 0,
  managementApiKey: 'management-key',
};

function creditsResponse(totalCredits: number, totalUsage: number) {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        data: { total_credits: totalCredits, total_usage: totalUsage },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  );
}

function errorResponse(status: number, body = '') {
  return Promise.resolve(new Response(body, { status }));
}

describe('OpenRouterBalanceService', () => {
  const fetchMock = vi.fn();
  let clock = new Date('2026-09-17T10:00:00.000Z').getTime();
  const now = () => clock;

  beforeEach(() => {
    clock = new Date('2026-09-17T10:00:00.000Z').getTime();
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => creditsResponse(100.5, 25.75));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads the balance and derives the remaining credits', async () => {
    const service = new OpenRouterBalanceService(BASE_CONFIG, now);

    await expect(service.getBalance()).resolves.toEqual({
      fetchedAt: '2026-09-17T10:00:00.000Z',
      remaining: 74.75,
      stale: false,
      totalCredits: 100.5,
      totalUsage: 25.75,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/credits');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer management-key',
    );
  });

  it('serves the cached value within the TTL and refetches once expired', async () => {
    const service = new OpenRouterBalanceService(BASE_CONFIG, now);

    await service.getBalance();
    clock += BALANCE_CACHE_TTL_MS - 1;
    await service.getBalance();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    clock += 1;
    await service.getBalance();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to the last known value and flags it stale', async () => {
    const service = new OpenRouterBalanceService(BASE_CONFIG, now);

    await service.getBalance();
    fetchMock.mockImplementation(() => Promise.reject(new Error('network down')));
    clock += BALANCE_CACHE_TTL_MS;

    await expect(service.getBalance()).resolves.toMatchObject({
      remaining: 74.75,
      stale: true,
    });
  });

  it('returns null when the very first read fails', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('network down')));
    const service = new OpenRouterBalanceService(BASE_CONFIG, now);

    await expect(service.getBalance()).resolves.toBeNull();
  });

  it('explains a 403 as a missing management key', async () => {
    fetchMock.mockImplementation(() => errorResponse(403));
    const service = new OpenRouterBalanceService(BASE_CONFIG, now);

    await expect(service.getBalance()).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      '[openrouter] balance read failed',
      expect.objectContaining({
        message: expect.stringContaining('management key'),
      }),
    );
  });

  it('reports the status and body of any other failure', async () => {
    fetchMock.mockImplementation(() => errorResponse(500, 'upstream exploded'));
    const service = new OpenRouterBalanceService(BASE_CONFIG, now);

    await expect(service.getBalance()).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      '[openrouter] balance read failed',
      expect.objectContaining({
        message: expect.stringContaining('500'),
      }),
    );
    expect(console.error).toHaveBeenCalledWith(
      '[openrouter] balance read failed',
      expect.objectContaining({
        message: expect.stringContaining('upstream exploded'),
      }),
    );
  });

  it('rejects a response without credit totals', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const service = new OpenRouterBalanceService(BASE_CONFIG, now);

    await expect(service.getBalance()).resolves.toBeNull();
  });

  it('stays disabled and never calls OpenRouter without a management key', async () => {
    const service = new OpenRouterBalanceService(
      { ...BASE_CONFIG, managementApiKey: '' },
      now,
    );

    expect(service.isEnabled).toBe(false);
    await expect(service.getBalance()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exposes the configured alert threshold', () => {
    expect(
      new OpenRouterBalanceService({ ...BASE_CONFIG, alertThreshold: 12 }, now)
        .alertThreshold,
    ).toBe(12);
  });

  describe('isUnderCriticalThreshold', () => {
    it('blocks a sale once the account is empty', async () => {
      fetchMock.mockImplementation(() => creditsResponse(100, 100));

      await expect(
        new OpenRouterBalanceService(BASE_CONFIG, now).isUnderCriticalThreshold(),
      ).resolves.toBe(true);
    });

    it('allows a sale while credits remain', async () => {
      await expect(
        new OpenRouterBalanceService(BASE_CONFIG, now).isUnderCriticalThreshold(),
      ).resolves.toBe(false);
    });

    it('honours a configured threshold above zero', async () => {
      fetchMock.mockImplementation(() => creditsResponse(100, 98));

      await expect(
        new OpenRouterBalanceService(
          { ...BASE_CONFIG, criticalThreshold: 2 },
          now,
        ).isUnderCriticalThreshold(),
      ).resolves.toBe(true);
    });

    it('fails open when supervision is off or the balance cannot be read', async () => {
      await expect(
        new OpenRouterBalanceService(
          { ...BASE_CONFIG, managementApiKey: '' },
          now,
        ).isUnderCriticalThreshold(),
      ).resolves.toBe(false);

      fetchMock.mockImplementation(() => Promise.reject(new Error('network down')));
      await expect(
        new OpenRouterBalanceService(BASE_CONFIG, now).isUnderCriticalThreshold(),
      ).resolves.toBe(false);
    });

    it('still blocks on a stale but known-empty balance', async () => {
      const service = new OpenRouterBalanceService(BASE_CONFIG, now);

      fetchMock.mockImplementation(() => creditsResponse(100, 100));
      await service.getBalance();

      fetchMock.mockImplementation(() => Promise.reject(new Error('network down')));
      clock += BALANCE_CACHE_TTL_MS;

      await expect(service.isUnderCriticalThreshold()).resolves.toBe(true);
    });
  });
});
