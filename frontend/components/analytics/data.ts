const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";

export interface AnalyticsOverview {
  apiCosts: CostTrend;
  infrastructureCosts: CostTrend;
  monthlyRequests: MonthlyRequest[];
  trafficLocations: TrafficLocation[];
  latency: LatencyData;
  tokenUsage: TokenUsageDay[];
  modelPerformance: ModelPerformance[];
}

export interface CostTrend {
  label: string;
  current: number;
  previous: number;
  changePercent: number;
  isPositive: boolean;
}

export interface MonthlyRequest {
  month: string;
  requests: number;
}

export interface TrafficLocation {
  country: string;
  flag: string;
  requests: number;
  percentage: number;
}

export interface LatencyData {
  totalCost: number;
  uptimePercent: number;
  percentiles: LatencyPercentile[];
}

export interface LatencyPercentile {
  label: string;
  valueMs: number;
  color: string;
  status: string;
}

export interface TokenUsageDay {
  date: string;
  input: number;
  output: number;
  total: number;
}

export interface ModelPerformance {
  model: string;
  monthlyScores: MonthlyModelScore[];
}

export interface MonthlyModelScore {
  month: string;
  score: number;
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("accessToken") ?? "";
}

/** Fetch the full analytics overview from the .NET API */
export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const token = getToken();
  const res = await fetch(`${API}/analytics/overview`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Analytics API returned ${res.status}`);
  }

  return res.json();
}
