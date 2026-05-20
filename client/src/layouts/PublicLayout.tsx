import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/ui/AppLogo';
import { useAuthStore, useUserRole } from '@/stores/authStore';
import FloatingChat from '@/components/chat/FloatingChat';

const DASHBOARD_LINK: Partial<Record<string, string>> = {
  ETUDIANT:       '/etudiant',
  ENSEIGNANT:     '/enseignant',
  RESP_SPECIALITE:'/enseignant',
  CHEF_DEPT:      '/admin',
  CHEF_EQUIPE:    '/admin',
  TECHNICIEN:     '/admin',
};

export default function PublicLayout() {
  const { isAuthenticated } = useAuthStore();
  const role = useUserRole();
  const dashLink = role ? (DASHBOARD_LINK[role] ?? '/admin') : '/connexion';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 border-b flex items-center justify-between px-6 bg-background/95 backdrop-blur shrink-0 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2.5 select-none">
          <div className="size-9 rounded-xl overflow-hidden shrink-0">
            <AppLogo size={36} />
          </div>
          <span
            className="font-bold text-lg tracking-tight text-foreground"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            e-PFE
          </span>
        </Link>

        {isAuthenticated ? (
          <Link to={dashLink}>
            <Button size="sm" className="brand-gradient text-white border-0 hover:opacity-90">
              Tableau de bord
            </Button>
          </Link>
        ) : (
          <Link to="/connexion">
            <Button size="sm" className="brand-gradient text-white border-0 hover:opacity-90">
              Connexion
            </Button>
          </Link>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <FloatingChat />
    </div>
  );
}
