import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  LayoutDashboard, BookOpen, Users, ClipboardList, Calendar,
  BarChart2, Search, LogOut, Settings, ChevronLeft,
  GraduationCap, Layers, Menu, Database,
} from 'lucide-react';
import FloatingChat from '@/components/chat/FloatingChat';
import { AppLogo } from '@/components/ui/AppLogo';
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
  section?: string;
}

const COLLAPSIBLE_SECTIONS = new Set(['Espace Enseignant', 'Administration']);

const NAV_ITEMS: NavItem[] = [
  // Étudiant
  { to: '/etudiant',          label: 'Tableau de bord',   icon: <LayoutDashboard className="size-4" />, roles: ['ETUDIANT'] },
  { to: '/etudiant/themes',   label: 'Choisir un thème',  icon: <BookOpen className="size-4" />,        roles: ['ETUDIANT'] },
  { to: '/etudiant/proposer', label: 'Proposer un thème', icon: <Layers className="size-4" />,          roles: ['ETUDIANT'] },
  { to: '/etudiant/binome',   label: 'Mon binôme',        icon: <Users className="size-4" />,           roles: ['ETUDIANT'] },
  { to: '/etudiant/annonces', label: 'Annonces',          icon: <ClipboardList className="size-4" />,   roles: ['ETUDIANT'] },

  // Espace enseignant
  { to: '/enseignant',            label: 'Tableau de bord',   icon: <LayoutDashboard className="size-4" />, roles: ['ENSEIGNANT', 'RESP_SPECIALITE', 'CHEF_EQUIPE', 'CHEF_DEPT'], section: 'Espace Enseignant' },
  { to: '/enseignant/themes',     label: 'Mes thèmes',        icon: <BookOpen className="size-4" />,        roles: ['ENSEIGNANT', 'RESP_SPECIALITE', 'CHEF_EQUIPE', 'CHEF_DEPT'], section: 'Espace Enseignant' },
  { to: '/enseignant/demandes',   label: 'Demandes reçues',   icon: <ClipboardList className="size-4" />,   roles: ['ENSEIGNANT', 'RESP_SPECIALITE', 'CHEF_EQUIPE', 'CHEF_DEPT'], section: 'Espace Enseignant' },
  { to: '/enseignant/etudiants',  label: 'Étudiants encadrés',icon: <GraduationCap className="size-4" />,   roles: ['ENSEIGNANT', 'RESP_SPECIALITE', 'CHEF_EQUIPE', 'CHEF_DEPT'], section: 'Espace Enseignant' },
  { to: '/responsable',           label: 'Ma spécialité',     icon: <BarChart2 className="size-4" />,       roles: ['RESP_SPECIALITE'],                                              section: 'Espace Enseignant' },

  // Administration
  { to: '/admin',               label: 'Tableau de bord',     icon: <LayoutDashboard className="size-4" />, roles: ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN'],         section: 'Administration' },
  { to: '/admin/utilisateurs',  label: 'Utilisateurs',        icon: <Users className="size-4" />,           roles: ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN'],         section: 'Administration' },
  { to: '/admin/themes',        label: 'Thèmes',              icon: <BookOpen className="size-4" />,        roles: ['CHEF_DEPT', 'CHEF_EQUIPE'],                       section: 'Administration' },
  { to: '/admin/affectations',  label: 'Affectations',        icon: <Layers className="size-4" />,          roles: ['CHEF_DEPT', 'CHEF_EQUIPE'],                       section: 'Administration' },
  { to: '/admin/soutenances',   label: 'Soutenances',         icon: <Calendar className="size-4" />,        roles: ['CHEF_DEPT', 'TECHNICIEN'],                        section: 'Administration' },
  { to: '/admin/sessions',      label: 'Sessions',            icon: <Settings className="size-4" />,        roles: ['CHEF_DEPT'],                                      section: 'Administration' },
  { to: '/admin/specialites',   label: 'Spécialités',         icon: <Settings className="size-4" />,        roles: ['CHEF_DEPT'],                                      section: 'Administration' },
  { to: '/admin/statistiques',  label: 'Statistiques',        icon: <BarChart2 className="size-4" />,       roles: ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN'],         section: 'Administration' },
  { to: '/admin/chatbot',       label: 'Base de connaissances',icon: <Database className="size-4" />,       roles: ['CHEF_DEPT', 'CHEF_EQUIPE'],                       section: 'Administration' },

  // Outils
  { to: '/recherche', label: 'Recherche', icon: <Search className="size-4" />, roles: ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN', 'RESP_SPECIALITE', 'ENSEIGNANT'], section: 'Outils' },
];

const ROLE_LABELS: Record<Role, string> = {
  CHEF_DEPT:      'Chef de Département',
  CHEF_EQUIPE:    "Chef d'Équipe",
  RESP_SPECIALITE:'Resp. Spécialité',
  TECHNICIEN:     'Technicien',
  ENSEIGNANT:     'Enseignant',
  ETUDIANT:       'Étudiant',
};

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closedSections, setClosedSections] = useState<Set<string>>(new Set());
  const location = useLocation();
  const user = useCurrentUser();
  const role = useUserRole();
  const logout = useLogout();
  useNotifications();

  const filteredNav = role ? NAV_ITEMS.filter((item) => item.roles.includes(role)) : [];

  const navSections = filteredNav.reduce<{ section: string; items: NavItem[] }[]>((acc, item) => {
    const sectionName = item.section ?? '';
    const existing = acc.find((s) => s.section === sectionName);
    if (existing) existing.items.push(item);
    else acc.push({ section: sectionName, items: [item] });
    return acc;
  }, []);

  const toggleSection = (section: string) => {
    setClosedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : '??';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'sidebar-bg fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-3 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="size-9 shrink-0">
                <AppLogo size={36} />
              </div>
              <span
                className="font-bold text-lg tracking-tight text-foreground"
                style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
              >
                e-PFE
              </span>
            </div>
          )}
          {collapsed && (
            <div className="size-9 mx-auto">
              <AppLogo size={36} />
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronLeft className="size-4 transition-transform" />
            </Button>
          )}
        </div>

        {/* Collapse toggle when collapsed */}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto mt-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setCollapsed(false)}
          >
            <ChevronLeft className="size-4 rotate-180" />
          </Button>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
          {navSections.map(({ section, items }) => {
            const isCollapsible = !collapsed && COLLAPSIBLE_SECTIONS.has(section);
            const isClosed = closedSections.has(section);
            return (
              <div key={section}>
                {section && !collapsed && (
                  <button
                    onClick={isCollapsible ? () => toggleSection(section) : undefined}
                    className={cn(
                      'w-full flex items-center justify-between px-3 mb-1 group',
                      isCollapsible && 'cursor-pointer',
                    )}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                      {section}
                    </span>
                    {isCollapsible && (
                      <ChevronLeft className={cn(
                        'size-3 text-muted-foreground/60 group-hover:text-muted-foreground transition-all',
                        isClosed ? '-rotate-90' : 'rotate-90',
                      )} />
                    )}
                  </button>
                )}

                {!isClosed && (
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = location.pathname === item.to;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                            active
                              ? 'bg-primary/10 text-primary shadow-sm'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                            collapsed && 'justify-center px-0',
                          )}
                        >
                          {item.icon}
                          {!collapsed && <span>{item.label}</span>}
                          {active && !collapsed && (
                            <span className="ml-auto size-1.5 rounded-full bg-primary/60" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User footer */}
        <div className={cn('p-3 flex items-center gap-3', collapsed && 'justify-center')}>
          <Link
            to="/profil"
            title="Mon profil"
            className={cn('flex items-center gap-3 flex-1 min-w-0 rounded-lg hover:bg-muted/60 transition-colors p-1 -m-1', collapsed && 'flex-none')}
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback
                className="text-xs font-semibold"
                style={{ background: 'linear-gradient(135deg, #1e72d8, #00c9a8)', color: 'white' }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {role ? ROLE_LABELS[role] : ''}
                </p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={logout}
              title="Se déconnecter"
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </aside>

      <FloatingChat />

      {/* Main content */}
      <div className={cn('flex flex-col flex-1 overflow-hidden transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        {/* Topbar */}
        <header className="h-16 flex items-center gap-4 px-6 border-b bg-background/95 backdrop-blur shrink-0 z-40 relative">
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
