import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, Users, Bell, ArrowRight, Rocket, AlertCircle, Info, GraduationCap, MapPin } from 'lucide-react';
import { ThemeDetailDialog } from '@/components/themes/ThemeDetailDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useEnseignantStats, useDemandesEnseignant } from '@/hooks/useStats';
import { useMesSoutenancesJury } from '@/hooks/useSoutenances';
import { useCurrentUser } from '@/stores/authStore';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href?: string;
  loading: boolean;
}) {
  const navigate = useNavigate();
  return (
    <Card
      className={`transition-shadow hover:shadow-md ${href ? 'cursor-pointer' : ''}`}
      onClick={() => href && navigate(href)}
    >
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`rounded-xl p-3 ${color} bg-opacity-10`}>
          <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-8 w-12 mb-1" />
          ) : (
            <div className="text-2xl font-bold">{value}</div>
          )}
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardEnseignant() {
  const [detailThemeId, setDetailThemeId] = useState<string | null>(null);
  const user = useCurrentUser();
  const { data: stats, isLoading } = useEnseignantStats();
  const { data: demandes = [] } = useDemandesEnseignant();
  const { data: jurys = [] } = useMesSoutenancesJury();
  const navigate = useNavigate();

  const upcomingSoutenances = jurys.filter(
    (s) => new Date(s.date_soutenance) >= new Date(new Date().toDateString()),
  );

  const statCards = [
    {
      label: 'Thèmes proposés',
      value: stats?.totalThemes ?? 0,
      icon: BookOpen,
      color: 'bg-blue-500',
      href: '/enseignant/themes',
    },
    {
      label: 'Thèmes validés',
      value: stats?.themesValides ?? 0,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      href: '/enseignant/themes',
    },
    {
      label: 'Non affectés',
      value: stats?.themesNonAffectes ?? 0,
      icon: Clock,
      color: 'bg-amber-500',
      href: '/enseignant/themes',
    },
    {
      label: 'Thèmes affectés',
      value: stats?.themesAffectes ?? 0,
      icon: Rocket,
      color: 'bg-purple-500',
      href: '/enseignant/etudiants',
    },
    {
      label: 'Étudiants encadrés',
      value: stats?.etudiantsEncadres ?? 0,
      icon: Users,
      color: 'bg-indigo-500',
      href: '/enseignant/etudiants',
    },
    {
      label: 'Demandes en attente',
      value: stats?.demandesEnAttente ?? 0,
      icon: Bell,
      color: 'bg-rose-500',
      href: '/enseignant/demandes',
    },
  ];

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour, {user?.prenom} {user?.nom}
        </h1>
        <p className="text-muted-foreground mt-1">
          Voici un aperçu de votre activité sur e-PFC.
        </p>
      </div>

      {/* Alerte demandes en attente */}
      {!isLoading && (stats?.demandesEnAttente ?? 0) > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              {stats!.demandesEnAttente} demande{stats!.demandesEnAttente > 1 ? 's' : ''} d'étudiant{stats!.demandesEnAttente > 1 ? 's' : ''} en attente de votre réponse.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100 gap-1.5"
            onClick={() => navigate('/enseignant/demandes')}
          >
            Voir <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} loading={isLoading} />
        ))}
      </div>

      {/* Demandes récentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Demandes récentes</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => navigate('/enseignant/demandes')}
          >
            Tout voir <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {demandes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune demande en attente.
            </p>
          ) : (
            <div className="divide-y">
              {demandes.slice(0, 5).map((d) => (
                <div
                  key={d.id}
                  onClick={() => setDetailThemeId(d.theme.id)}
                  className="flex items-center justify-between py-3 gap-4 cursor-pointer hover:bg-accent/20 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {d.etudiant.prenom} {d.etudiant.nom}
                      {d.binome && (
                        <span className="text-muted-foreground font-normal ml-1">
                          + {d.binome.etud2.prenom} {d.binome.etud2.nom}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Choix n°{d.ordre} — {d.theme.titre}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.etudiant.specialite && (
                      <Badge variant="outline" className="text-xs hidden sm:flex">
                        {d.etudiant.specialite.nom}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                      En attente
                    </Badge>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mes soutenances (rôle jury) */}
      {upcomingSoutenances.length > 0 && (
        <Card className="border-indigo-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-indigo-700">
              <GraduationCap className="h-4 w-4" />
              Mes soutenances à venir (jury)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y">
            {upcomingSoutenances.map((s) => {
              const roleLabel = s.role_jury === 'PRESIDENT' ? 'Président' : 'Examinateur';
              const dateLabel = new Date(s.date_soutenance).toLocaleDateString('fr-FR', {
                weekday: 'short', day: 'numeric', month: 'short',
              });
              return (
                <div key={s.id} className="py-3 flex items-start gap-3">
                  <div className="min-w-[52px] text-center">
                    <p className="text-xs font-semibold text-indigo-700 capitalize">{dateLabel}</p>
                    <p className="text-xs text-muted-foreground">{s.heure}</p>
                  </div>
                  <Separator orientation="vertical" className="h-10 bg-indigo-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.theme.titre}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        Salle {s.salle}
                      </span>
                      <Badge className="text-[10px] h-4 px-1.5 bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                        {roleLabel}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <ThemeDetailDialog
        themeId={detailThemeId}
        onClose={() => setDetailThemeId(null)}
      />

      {/* Actions rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Proposer un thème', href: '/enseignant/themes', icon: BookOpen },
          { label: 'Mes étudiants encadrés', href: '/enseignant/etudiants', icon: Users },
          { label: 'Demandes en attente', href: '/enseignant/demandes', icon: Bell },
        ].map(({ label, href, icon: Icon }) => (
          <button
            key={label}
            onClick={() => navigate(href)}
            className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left hover:bg-muted/50 transition-colors"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}
