import { AuthProvider } from "@/hooks/useAuth";
import AppNav from "@/components/AppNav";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div
        style={{
          height: "100svh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <AppNav />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
