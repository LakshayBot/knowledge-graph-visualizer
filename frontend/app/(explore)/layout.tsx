import { AuthProvider } from "@/hooks/useAuth";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
