import { AuthProvider } from "@/hooks/useAuth";
import AppNav from "@/components/AppNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppNav />
      <main style={{ minHeight: "calc(100svh - 56px)" }}>{children}</main>
    </AuthProvider>
  );
}
