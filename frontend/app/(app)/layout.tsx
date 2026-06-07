import { AuthProvider } from "@/hooks/useAuth";
import MarqueeBanner from "@/components/MarqueeBanner";
import Nav from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <MarqueeBanner />
        <Nav />
      </div>
      <main style={{ minHeight: "calc(100svh - 90px)" }}>{children}</main>
    </AuthProvider>
  );
}
