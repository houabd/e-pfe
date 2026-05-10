import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  LayoutDashboard, BookOpen, Users, ClipboardList, Calendar,
  BarChart2, Search, LogOut, Settings, ChevronLeft,
  GraduationCap, Layers, Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useCurrentUser, useUserRole } from '@/stores/authStore';
import { useLogout } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import type { Role } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/etudiant', label: 'Tableau de bord', icon: <LayoutDashboard className="size-4" />, roles: ['ETUDIANT'] },
  { to: '/etudiant/themes', label: 'Choisir un thème', icon: <BookOpen className="size-4" />, roles: ['ETUDIANT'] },
  { to: '/etudiant/proposer', label: 'Proposer un thème', icon: <Layers className="size-4" />, roles: ['ETUDIANT'] },
  { to: '/etudiant/binome', label: 'Mon binôme', icon: <Users className="size-4" />, roles: ['ETUDIANT'] },
  { to: '/etudiant/annonces', label: 'Annonces', icon: <ClipboardList className="size-4" />, roles: ['ETUDIANT'] },

  { to: '/enseignant', label: 'Tableau de bord', icon: <LayoutDashboard className="size-4" />, roles: ['ENSEIGNANT'] },
  { to: '/enseignant/themes', label: 'Mes thèmes', icon: <BookOpen className="size-4" />, roles: ['ENSEIGNANT'] },
  { to: '/enseignant/demandes', label: 'Demandes reçues', icon: <ClipboardList className="size-4" />, roles: ['ENSEIGNANT'] },
  { to: '/enseignant/etudiants', label: 'Étudiants encadrés', icon: <GraduationCap className="size-4" />, roles: ['ENSEIGNANT'] },

  { to: '/admin', label: 'Tableau de bord', icon: <LayoutDashboard className="size-4" />, roles: ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN', 'RESP_FILIERE', 'RESP_SPECIALITE'] },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: <Users className="size-4" />, roles: ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN'] },
  { to: '/admin/themes', label: 'Thèmes', icon: <BookOpen className="size-4" />, roles: ['CHEF_DEPT', 'RESP_FILIERE'] },
  { to: '/admin/affectations', label: 'Affectations', icon: <Layers className="size-4" />, roles: ['CHEF_DEPT', 'RESP_FILIERE'] },
  { to: '/admin/soutenances', label: 'Soutenances', icon: <Calendar className="size-4" />, roles: ['CHEF_DEPT', 'TECHNICIEN'] },
  { to: '/admin/sessions', label: 'Sessions', icon: <Settings className="size-4" />, roles: ['CHEF_DEPT'] },
  { to: '/admin/specialites', label: 'Spécialités', icon: <Settings className="size-4" />, roles: ['CHEF_DEPT'] },
  { to: '/admin/statistiques', label: 'Statistiques', icon: <BarChart2 className="size-4" />, roles: ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN', 'RESP_FILIERE', 'RESP_SPECIALITE'] },

  { to: '/responsable', label: 'Statistiques', icon: <BarChart2 className="size-4" />, roles: ['RESP_SPECIALITE'] },

  { to: '/recherche', label: 'Recherche', icon: <Search className="size-4" />, roles: ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN', 'RESP_FILIERE', 'RESP_SPECIALITE', 'ENSEIGNANT'] },
];

const ROLE_LABELS: Record<Role, string> = {
  CHEF_DEPT: 'Chef de Département',
  CHEF_EQUIPE: "Chef d'Équipe",
  RESP_FILIERE: 'Resp. Filière',
  RESP_SPECIALITE: 'Resp. Spécialité',
  TECHNICIEN: 'Technicien',
  ENSEIGNANT: 'Enseignant',
  ETUDIANT: 'Étudiant',
};

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const user = useCurrentUser();
  const role = useUserRole();
  const logout = useLogout();
  useNotifications();

  const filteredNav = role
    ? NAV_ITEMS.filter((item) => item.roles.includes(role))
    : [];

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : '??';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!collapsed && (
            <span className="font-bold text-lg text-sidebar-foreground tracking-tight">e-PFE</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {filteredNav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* Utilisateur */}
        <div className={cn('p-4 flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {role ? ROLE_LABELS[role] : ''}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={logout}
              title="Se déconnecter"
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Contenu principal */}
      <div className={cn('flex flex-col flex-1 overflow-hidden transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        {/* Topbar */}
        <header className="h-16 flex items-center gap-4 px-6 border-b bg-background/95 backdrop-blur shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex-1" />

          <GlobalSearchBar />

          <NotificationBell />
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
