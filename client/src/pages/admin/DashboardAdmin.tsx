import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, BookOpen, CheckCircle2,
  Layers, AlertTriangle, ArrowRight, Calendar,
  BarChart3, Settings, UserCog, Database,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalStats, useThemesStats } from '@/hooks/useStats';
import { useActiveSession, useSessions } from '@/hooks/useSession';
import { useCurrentUser } from '@/stores/authStore';

function pct(v: number, t: number) {
  return t > 0 ? Math.round((v / t) * 100) : 0;
}

function daysLeft(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000));
}

function sessionProgress(debut: string, fin: string): number {
  const start = new Date(debut).getTime();
  const end = new Date(fin).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

function KpiCard({
  icon: Icon, label, value, sub, color, loading,
}: {
  icon: React.ElementType; label: string; value: number;
  sub?: string; color: string; loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          {loading
            ? <Skeleton className="h-8 w-16" />
            : <p className="text-3xl font-bold">{value.toLocaleString('fr-FR')}</p>}
          {sub && !loading && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressRow({ label, v, t, color }: { label: string; v: number; t: number; color: string }) {
  const p = pct(v, t);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-52 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
      </div>
      <span className="w-12 text-right text-xs font-semibold">{v}/{t}</span>
      <span className="w-9 text-right text-xs text-muted-foreground">{p}%</span>
    </div>
  );
}

function Shortcut({ to, icon: Icon, label, desc }: {
  to: string; icon: React.ElementType; label: string; desc: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 hover:border-primary/30 transition-all group"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}

export default function DashboardAdmin() {
  const user = useCurrentUser();
  const { data: stats, isLoading } = useGlobalStats();
  const { data: themesStats } = useThemesStats();
  const activeSession = useActiveSession();
  const { data: sessions = [] } = useSessions();

  const sessionDisplay = activeSession ?? sessions[sessions.length - 1];
  const themesAlerte = themesStats?.sansEncadrant ?? [];

  const kpis = [
    {
      icon: GraduationCap, label: 'Étudiants',
      color: 'bg-[#e8e8e8] text-[#1a1a1a] dark:bg-gray-900/40 dark:text-[#00b08a]',
      value: stats?.totalEtudiants ?? 0,
      sub: `${stats?.etudiantsSansTheme ?? 0} sans thème`,
    },
    {
      icon: Users, label: 'Enseignants',
      color: 'bg-[#e8e8e8] text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
      value: stats?.totalEnseignants ?? 0,
      sub: `${stats?.enseignantsSansAffectation ?? 0} sans affectation`,
    },
    {
      icon: BookOpen, label: 'Thèmes',
      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400',
      value: stats?.totalThemes ?? 0,
      sub: `${stats?.themesValides ?? 0} validés`,
    },
    {
      icon: Layers, label: 'Affectés',
      color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400',
      value: stats?.themesAffectes ?? 0,
      sub: `${stats?.themesSoutenus ?? 0} soutenus`,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Bonjour, {user?.prenom} {user?.nom}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vue d'ensemble de la session en cours
        </p>
      </div>

      {/* Session active */}
      {sessionDisplay && (
        <Card className={activeSession ? 'border-primary/30 bg-primary/5' : ''}>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start gap-4 justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">
                      Session {sessionDisplay.type === 'CHOIX' ? 'de choix' : "d'affectation"} — {sessionDisplay.annee_universitaire}
                    </p>
                    {activeSession
                      ? <Badge className="text-[10px] py-0">Active</Badge>
                      : <Badge variant="secondary" className="text-[10px] py-0">Clôturée</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(sessionDisplay.date_debut).toLocaleDateString('fr-FR')} →{' '}
                    {new Date(sessionDisplay.date_fin).toLocaleDateString('fr-FR')}
                    {activeSession && (
                      <span className="ml-2 font-medium text-primary">
                        · {daysLeft(sessionDisplay.date_fin)} jour(s) restant(s)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Link to="/admin/sessions">
                <Button variant="outline" size="sm">Gérer les sessions</Button>
              </Link>
            </div>

            {activeSession && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Progression temporelle</span>
                  <span className="text-xs font-semibold">
                    {sessionProgress(sessionDisplay.date_debut, sessionDisplay.date_fin)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${sessionProgress(sessionDisplay.date_debut, sessionDisplay.date_fin)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => <KpiCard key={k.label} {...k} loading={isLoading} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Progression */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Progression globale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading
              ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 w-full" />)
              : stats && (
                <>
                  <ProgressRow label="Validation des thèmes" v={stats.themesValides} t={stats.totalThemes} color="bg-[#f7f7f7]0" />
                  <ProgressRow label="Affectation des thèmes" v={stats.themesAffectes} t={stats.totalThemes} color="bg-[#009474]" />
                  <ProgressRow label="Étudiants avec thème" v={stats.etudiantsAvecTheme} t={stats.totalEtudiants} color="bg-[#0e7a4a]" />
                  <ProgressRow label="Soutenances effectuées" v={stats.themesSoutenus} t={stats.themesAffectes} color="bg-purple-500" />
                </>
              )}
          </CardContent>
          <div className="px-6 pb-4">
            <Link to="/admin/statistiques">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground -ml-2">
                Voir les statistiques complètes <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Alertes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <Skeleton className="h-24 w-full" />}
            {!isLoading && stats && (
              <>
                {stats.etudiantsSansTheme > 0 && (
                  <Link to="/admin/affectations" className="flex items-center justify-between rounded-lg border border-[#e8e8e8] bg-[#f7f7f7] dark:bg-amber-900/10 dark:border-gray-700/30 p-3 hover:bg-[#e8e8e8]/70 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-[#00b08a]">
                        {stats.etudiantsSansTheme} étudiants sans thème
                      </p>
                      <p className="text-xs text-amber-600 dark:text-[#00b08a]">Affectation requise</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-500 shrink-0" />
                  </Link>
                )}
                {stats.enseignantsSansAffectation > 0 && (
                  <Link to="/admin/affectations" className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800/30 p-3 hover:bg-orange-100/70 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                        {stats.enseignantsSansAffectation} enseignants sans encadrement
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">À affecter</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-orange-500 shrink-0" />
                  </Link>
                )}
                {themesAlerte.length > 0 && (
                  <Link to="/admin/themes" className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/30 p-3 hover:bg-red-100/70 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        {themesAlerte.length} thèmes sans encadrant
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">Attention requise</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-red-500 shrink-0" />
                  </Link>
                )}
                {stats.etudiantsSansTheme === 0 && stats.enseignantsSansAffectation === 0 && themesAlerte.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                    <p className="text-sm font-medium text-emerald-600">Tout est en ordre</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Aucune alerte en cours</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raccourcis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Accès rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Shortcut to="/admin/utilisateurs" icon={UserCog} label="Utilisateurs" desc="Ajouter, modifier, importer" />
            <Shortcut to="/admin/themes" icon={BookOpen} label="Thèmes" desc="Valider et superviser" />
            <Shortcut to="/admin/affectations" icon={Layers} label="Affectations" desc="Assigner étudiants et encadrants" />
            <Shortcut to="/admin/soutenances" icon={CheckCircle2} label="Soutenances" desc="Planifier, jurys, export PDF" />
            <Shortcut to="/admin/statistiques" icon={BarChart3} label="Statistiques" desc="Graphiques et exports" />
            <Shortcut to="/admin/chatbot" icon={Database} label="Base de connaissances" desc="Documents RAG du chatbot" />
            <Shortcut to="/admin/sessions" icon={Calendar} label="Sessions" desc="Créer et gérer les sessions" />
            <Shortcut to="/admin/specialites" icon={Settings} label="Spécialités" desc="Configurer les filières" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
