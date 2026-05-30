import { analyticsApi, OfflineError } from '../services/analyticsApi';

const USER_ID = 'test-user-123';

const SUMMARY_BODY = {
  total_reviewed: 100,
  total_kept: 60,
  total_deleted: 40,
  total_storage_saved_bytes: 5_368_709_120,
  total_sessions: 10,
};

const EMPTY_HISTORY_BODY: Array<{
  date: string;
  reviewed: number;
  kept: number;
  deleted: number;
  storage_saved_bytes: number;
}> = [];

function mockFetch(
  summaryResponse: Partial<Response & { json: () => Promise<unknown> }>,
  historyResponse: Partial<Response & { json: () => Promise<unknown> }> = {
    ok: true,
    json: () => Promise.resolve(EMPTY_HISTORY_BODY),
  },
) {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce(summaryResponse)
    .mockResolvedValueOnce(historyResponse);
}

describe('analyticsApi — getAnalyticsSummary behaviour (via getDashboardAnalytics)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('success response', () => {
    it('maps total_reviewed to summary.reviewed', async () => {
      mockFetch({ ok: true, json: () => Promise.resolve(SUMMARY_BODY) });
      const result = await analyticsApi.getDashboardAnalytics(USER_ID);
      expect(result.summary.reviewed).toBe(100);
    });

    it('maps total_kept and total_deleted', async () => {
      mockFetch({ ok: true, json: () => Promise.resolve(SUMMARY_BODY) });
      const result = await analyticsApi.getDashboardAnalytics(USER_ID);
      expect(result.summary.kept).toBe(60);
      expect(result.summary.deleted).toBe(40);
    });

    it('maps total_storage_saved_bytes to summary.storageSavedBytes', async () => {
      mockFetch({ ok: true, json: () => Promise.resolve(SUMMARY_BODY) });
      const result = await analyticsApi.getDashboardAnalytics(USER_ID);
      expect(result.summary.storageSavedBytes).toBe(5_368_709_120);
    });

    it('unwraps body.data when the server wraps the payload', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ data: SUMMARY_BODY }),
      });
      const result = await analyticsApi.getDashboardAnalytics(USER_ID);
      expect(result.summary.reviewed).toBe(100);
    });

    it('returns an empty dailyActivity array when history is empty', async () => {
      mockFetch({ ok: true, json: () => Promise.resolve(SUMMARY_BODY) });
      const result = await analyticsApi.getDashboardAnalytics(USER_ID);
      expect(result.dailyActivity).toHaveLength(0);
    });
  });

  describe('network error', () => {
    it('throws OfflineError when fetch rejects', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new TypeError('Network request failed'),
      );
      await expect(analyticsApi.getDashboardAnalytics(USER_ID)).rejects.toBeInstanceOf(
        OfflineError,
      );
    });

    it('OfflineError carries the expected message', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new TypeError('Network request failed'),
      );
      await expect(analyticsApi.getDashboardAnalytics(USER_ID)).rejects.toThrow(
        'No internet connection',
      );
    });

    it('OfflineError.name is set correctly', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError('fail'));
      try {
        await analyticsApi.getDashboardAnalytics(USER_ID);
      } catch (err) {
        expect((err as OfflineError).name).toBe('OfflineError');
      }
    });
  });

  describe('malformed / error response', () => {
    it('throws with status code when summary returns 500', async () => {
      mockFetch({ ok: false, status: 500 }, { ok: false, status: 500 });
      await expect(analyticsApi.getDashboardAnalytics(USER_ID)).rejects.toThrow(
        'Analytics summary request failed: 500',
      );
    });

    it('throws with status code when summary returns 404', async () => {
      mockFetch({ ok: false, status: 404 }, { ok: false, status: 404 });
      await expect(analyticsApi.getDashboardAnalytics(USER_ID)).rejects.toThrow(
        'Analytics summary request failed: 404',
      );
    });

    it('propagates a SyntaxError when response body is not valid JSON', async () => {
      mockFetch(
        {
          ok: true,
          json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
        },
        {
          ok: true,
          json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
        },
      );
      await expect(analyticsApi.getDashboardAnalytics(USER_ID)).rejects.toThrow(
        SyntaxError,
      );
    });
  });
});
