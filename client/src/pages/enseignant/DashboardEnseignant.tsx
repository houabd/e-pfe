import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, Users, Bell, ArrowRight, Rocket, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEnseignantStats, useDemandesEnseignant } from '@/hooks/useStats';
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
  const user = useCurrentUser();
  const { data: stats, isLoading } = useEnseignantStats();
  const { data: demandes = [] } = useDemandesEnseignant();
  const navigate = useNavigate();

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
          Voici un aperçu de votre activité sur e-PFE.
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
                <div key={d.id} className="flex items-center justify-between py-3 gap-4">
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
