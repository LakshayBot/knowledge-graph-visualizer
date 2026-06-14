import AuthGuard from "@/components/auth/AuthGuard";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <AnalyticsDashboard />
    </AuthGuard>
  );
}
