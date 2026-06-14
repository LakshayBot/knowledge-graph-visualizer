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

export interface CostData {
  label: string;
  current: number;
  previous: number;
  change: number;
  isPositive: boolean;
}

export interface LatencyMetric {
  label: string;
  value: number;
  unit: string;
  color: string;
  status: "good" | "warning" | "critical";
}

export interface TokenUsageDay {
  date: string;
  input: number;
  output: number;
  total: number;
}

export interface ModelPerformance {
  model: string;
  accuracy: number;
  latency: number;
  calls: number;
}

// ── Mock Data ────────────────────────────────────────

export const costData: CostData[] = [
  {
    label: "API Costs",
    current: 48250,
    previous: 42900,
    change: 12.5,
    isPositive: true,
  },
  {
    label: "Infrastructure",
    current: 21900,
    previous: 22370,
    change: -2.1,
    isPositive: false,
  },
];

export const monthlyRequests: MonthlyRequest[] = [
  { month: "Jan", requests: 12400 },
  { month: "Feb", requests: 18100 },
  { month: "Mar", requests: 15900 },
  { month: "Apr", requests: 22300 },
  { month: "May", requests: 19800 },
  { month: "Jun", requests: 26500 },
  { month: "Jul", requests: 24200 },
  { month: "Aug", requests: 28900 },
  { month: "Sep", requests: 27100 },
  { month: "Oct", requests: 30500 },
  { month: "Nov", requests: 28400 },
  { month: "Dec", requests: 32000 },
];

export const trafficLocations: TrafficLocation[] = [
  { country: "United States", flag: "🇺🇸", requests: 1250000, percentage: 34 },
  { country: "United Kingdom", flag: "🇬🇧", requests: 620000, percentage: 17 },
  { country: "Germany", flag: "🇩🇪", requests: 480000, percentage: 13 },
  { country: "India", flag: "🇮🇳", requests: 410000, percentage: 11 },
  { country: "Canada", flag: "🇨🇦", requests: 290000, percentage: 8 },
  { country: "Australia", flag: "🇦🇺", requests: 220000, percentage: 6 },
  { country: "Japan", flag: "🇯🇵", requests: 180000, percentage: 5 },
  { country: "Brazil", flag: "🇧🇷", requests: 120000, percentage: 3 },
];

export const latencyMetrics: LatencyMetric[] = [
  { label: "P50", value: 42, unit: "ms", color: "#22c55e", status: "good" },
  { label: "P75", value: 89, unit: "ms", color: "#22c55e", status: "good" },
  { label: "P90", value: 156, unit: "ms", color: "#eab308", status: "warning" },
  { label: "P99", value: 420, unit: "ms", color: "#ef4444", status: "critical" },
];

export const tokenUsage: TokenUsageDay[] = [
  { date: "Mon", input: 850000, output: 340000, total: 1190000 },
  { date: "Tue", input: 1020000, output: 410000, total: 1430000 },
  { date: "Wed", input: 980000, output: 380000, total: 1360000 },
  { date: "Thu", input: 1150000, output: 520000, total: 1670000 },
  { date: "Fri", input: 910000, output: 360000, total: 1270000 },
  { date: "Sat", input: 540000, output: 210000, total: 750000 },
  { date: "Sun", input: 480000, output: 190000, total: 670000 },
];

export const modelPerformance: ModelPerformance[] = [
  { model: "GPT-4o", accuracy: 94, latency: 320, calls: 45200 },
  { model: "Claude 4", accuracy: 92, latency: 280, calls: 38100 },
  { model: "Grok-3", accuracy: 89, latency: 195, calls: 29400 },
  { model: "Gemini", accuracy: 87, latency: 210, calls: 22300 },
  { model: "Mistral", accuracy: 83, latency: 165, calls: 18100 },
];
