import { apiFetch } from "@/lib/api-client";

export interface DashboardMetrics {
  apiCosts: CostTrend;
  dailyRequests: DailyRequest[];
  trafficCategories: TrafficCategory[];
  latency: LatencyData;
  tokenUsage: TokenUsageDay[];
  modelHeatmap: ModelHeatmap[];
}

export interface CostTrend {
  label: string;
  overall: number;
  today: number;
  yesterday: number;
  changePercent: number;
  isPositive: boolean;
}

export interface DailyRequest {
  date: string;
  requests: number;
}

export interface TrafficCategory {
  category: string;
  requests: number;
  percentage: number;
}

export interface LatencyData {
  avgMs: number;
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

export interface ModelHeatmap {
  model: string;
  dailyScores: DailyModelScore[];
}

export interface DailyModelScore {
  day: string;
  score: number;
}

/** Fetch the full dashboard metrics from the .NET API */
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return apiFetch<DashboardMetrics>("/analytics/overview");
}
