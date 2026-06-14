import { AuthProvider } from "@/hooks/useAuth";
import AppNav from "@/components/AppNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div
        style={{
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AppNav />
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </AuthProvider>
  );
}
