import AuthGuard from "@/components/auth/AuthGuard";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardMetrics />
    </AuthGuard>
  );
}
