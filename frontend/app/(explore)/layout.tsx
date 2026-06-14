import { AuthProvider } from "@/hooks/useAuth";
import AppNav from "@/components/AppNav";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppNav />
      <main style={{ minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </AuthProvider>
  );
}
