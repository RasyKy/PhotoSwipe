import { API_KEY, BASE_URL } from './api';

export type DailyActivityPoint = {
  label: string;
  kept: number;
  deleted: number;
  storageMB: number;
};

export type DashboardAnalytics = {
  summary: {
    reviewed: number;
    kept: number;
    deleted: number;
    storageSavedBytes: number;
  };
  dailyActivity: DailyActivityPoint[];
};

type SummaryResponse = {
  total_reviewed: number;
  total_kept: number;
  total_deleted: number;
  total_storage_saved_bytes: number;
  total_sessions: number;
};

type HistoryItem = {
  date: string;
  reviewed: number;
  kept: number;
  deleted: number;
  storage_saved_bytes: number;
};

export type SessionItem = {
  id: string;
  user_id: string;
  status: string;
  total_reviewed: number;
  total_kept: number;
  total_deleted: number;
  storage_saved_bytes: number;
  started_at: string;
  ended_at: string | null;
};

export class OfflineError extends Error {
  constructor() {
    super('No internet connection');
    this.name = 'OfflineError';
  }
}

const apiHeaders = () => ({ 'X-API-Key': API_KEY });

async function getAnalyticsSummary(userId: string): Promise<SummaryResponse> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/analytics/summary?user_id=${userId}`, {
      headers: apiHeaders(),
    });
  } catch {
    throw new OfflineError();
  }
  if (!response.ok) {
    throw new Error(`Analytics summary request failed: ${response.status}`);
  }
  const body = await response.json();
  return body.data ?? body;
}

async function getAnalyticsHistory(userId: string): Promise<DailyActivityPoint[]> {
  let response: Response;
  try {
    response = await fetch(
      `${BASE_URL}/analytics/history?user_id=${userId}&period=week`,
      { headers: apiHeaders() }
    );
  } catch {
    throw new OfflineError();
  }
  if (!response.ok) {
    throw new Error(`Analytics history request failed: ${response.status}`);
  }
  const body = await response.json();
  const items: HistoryItem[] = body.data ?? body;
  return items.map((item) => ({
    label: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
    kept: item.kept,
    deleted: item.deleted,
    storageMB: item.storage_saved_bytes / 1048576,
  }));
}

export async function getSessions(userId: string): Promise<SessionItem[]> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/sessions?user_id=${userId}`, {
      headers: apiHeaders(),
    });
  } catch {
    throw new OfflineError();
  }
  if (!response.ok) {
    throw new Error(`Sessions request failed: ${response.status}`);
  }
  const body = await response.json();
  return body.data ?? body;
}

async function getDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
  const [summary, dailyActivity] = await Promise.all([
    getAnalyticsSummary(userId),
    getAnalyticsHistory(userId),
  ]);
  return {
    summary: {
      reviewed: summary.total_reviewed,
      kept: summary.total_kept,
      deleted: summary.total_deleted,
      storageSavedBytes: summary.total_storage_saved_bytes,
    },
    dailyActivity,
  };
}

export const analyticsApi = { getDashboardAnalytics };
