export type DashboardScenario = 'normal' | 'empty' | 'error';

export type DailyActivityPoint = {
  label: string;
  kept: number;
  deleted: number;
};

export type StoragePoint = {
  label: string;
  storageSavedBytes: number;
};

export type SessionHistoryItem = {
  id: string;
  startedAt: number;
  endedAt: number;
  photosReviewed: number;
  kept: number;
  deleted: number;
  storageSavedBytes: number;
};

export type DashboardAnalytics = {
  summary: {
    photosReviewed: number;
    kept: number;
    deleted: number;
    storageSavedBytes: number;
    sessions: number;
  };
  dailyActivity: DailyActivityPoint[];
  cumulativeStorage: StoragePoint[];
  sessionHistory: SessionHistoryItem[];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockDashboardAnalytics: DashboardAnalytics = {
  summary: {
    photosReviewed: 342,
    kept: 219,
    deleted: 123,
    storageSavedBytes: 846_531_584,
    sessions: 8,
  },
  dailyActivity: [
    { label: 'Mon', kept: 24, deleted: 10 },
    { label: 'Tue', kept: 28, deleted: 12 },
    { label: 'Wed', kept: 22, deleted: 9 },
    { label: 'Thu', kept: 31, deleted: 16 },
    { label: 'Fri', kept: 35, deleted: 14 },
    { label: 'Sat', kept: 48, deleted: 20 },
    { label: 'Sun', kept: 31, deleted: 17 },
  ],
  cumulativeStorage: [
    { label: 'Wk 1', storageSavedBytes: 82_554_880 },
    { label: 'Wk 2', storageSavedBytes: 163_577_856 },
    { label: 'Wk 3', storageSavedBytes: 284_164_096 },
    { label: 'Wk 4', storageSavedBytes: 402_653_184 },
    { label: 'Wk 5', storageSavedBytes: 565_182_464 },
    { label: 'Wk 6', storageSavedBytes: 713_031_680 },
    { label: 'Wk 7', storageSavedBytes: 846_531_584 },
  ],
  sessionHistory: [
    {
      id: 'session-108',
      startedAt: Date.now() - 1000 * 60 * 60 * 26,
      endedAt: Date.now() - 1000 * 60 * 60 * 25.5,
      photosReviewed: 46,
      kept: 29,
      deleted: 17,
      storageSavedBytes: 111_149_056,
    },
    {
      id: 'session-107',
      startedAt: Date.now() - 1000 * 60 * 60 * 52,
      endedAt: Date.now() - 1000 * 60 * 60 * 51.25,
      photosReviewed: 51,
      kept: 33,
      deleted: 18,
      storageSavedBytes: 149_946_368,
    },
    {
      id: 'session-106',
      startedAt: Date.now() - 1000 * 60 * 60 * 78,
      endedAt: Date.now() - 1000 * 60 * 60 * 77.5,
      photosReviewed: 39,
      kept: 24,
      deleted: 15,
      storageSavedBytes: 88_080_384,
    },
    {
      id: 'session-105',
      startedAt: Date.now() - 1000 * 60 * 60 * 104,
      endedAt: Date.now() - 1000 * 60 * 60 * 103.25,
      photosReviewed: 62,
      kept: 38,
      deleted: 24,
      storageSavedBytes: 196_083_712,
    },
  ],
};

const emptyDashboardAnalytics: DashboardAnalytics = {
  summary: {
    photosReviewed: 0,
    kept: 0,
    deleted: 0,
    storageSavedBytes: 0,
    sessions: 0,
  },
  dailyActivity: [],
  cumulativeStorage: [],
  sessionHistory: [],
};

export async function getDashboardAnalytics(
  scenario: DashboardScenario = 'normal'
): Promise<DashboardAnalytics> {
  await delay(650);

  if (scenario === 'error') {
    throw new Error('Failed to load dashboard analytics');
  }

  if (scenario === 'empty') {
    return emptyDashboardAnalytics;
  }

  return mockDashboardAnalytics;
}

export const analyticsApi = {
  getDashboardAnalytics,
};

export { mockDashboardAnalytics };