import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore, useUserRole } from '@/stores/authStore';

const DASHBOARD_LINK: Partial<Record<string, string>> = {
  ETUDIANT: '/etudiant',
  ENSEIGNANT: '/enseignant',
  CHEF_DEPT: '/admin',
  CHEF_EQUIPE: '/admin',
  RESP_FILIERE: '/admin',
  RESP_SPECIALITE: '/admin',
  TECHNICIEN: '/admin',
};

export default function PublicLayout() {
  const { isAuthenticated } = useAuthStore();
  const role = useUserRole();
  const dashLink = role ? (DASHBOARD_LINK[role] ?? '/admin') : '/connexion';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 border-b flex items-center justify-between px-6 bg-background shrink-0">
        <Link to="/" className="font-bold text-lg tracking-tight select-none">
          e-PFE
        </Link>
        {isAuthenticated ? (
          <Link to={dashLink}>
            <Button variant="outline" size="sm">Tableau de bord</Button>
          </Link>
        ) : (
          <Link to="/connexion">
            <Button variant="outline" size="sm">Connexion</Button>
          </Link>
        )}
      </header>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
