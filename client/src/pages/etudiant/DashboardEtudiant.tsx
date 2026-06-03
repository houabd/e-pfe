import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Users, ClipboardList, Megaphone,
  CheckCircle2, Clock, XCircle, ArrowRight, AlertCircle, Info,
} from 'lucide-react';
import { ThemeDetailDialog } from '@/components/themes/ThemeDetailDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/stores/authStore';
import { useActiveSession } from '@/hooks/useSession';
import { useMesChoix } from '@/hooks/useChoix';
import { useMyThemes } from '@/hooks/useThemes';
import { useMonAffectation } from '@/hooks/useAffectations';

function StatutBadge({ statut }: { statut: 'PENDING' | 'ACCEPTED' | 'REFUSED' }) {
  if (statut === 'ACCEPTED') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs">
        Accepté
      </Badge>
    );
  }
  if (statut === 'REFUSED') {
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100 text-xs">
        Refusé
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100 text-xs">
      En attente
    </Badge>
  );
}

export default function DashboardEtudiant() {
  const [detailThemeId, setDetailThemeId] = useState<string | null>(null);
  const user = useCurrentUser();
  const activeSession = useActiveSession();
  const { data: mesChoixData, isLoading: loadingChoix } = useMesChoix();
  const { data: monAffectation } = useMonAffectation();
  const choix = mesChoixData?.choix ?? [];
  const { data: mesThemesResponse, isLoading: loadingThemes } = useMyThemes();
  const mesThemes = mesThemesResponse?.data ?? [];
  const navigate = useNavigate();

  const acceptedChoix = choix.find((c) => c.statut === 'ACCEPTED');
  const pendingChoix = choix.filter((c) => c.statut === 'PENDING');
  const allRefused = mesChoixData?.peutRechoisir ?? false;
  const isAdminAffecte = !acceptedChoix && !!monAffectation;
  const isAffecte = !!acceptedChoix || !!monAffectation;

  const allActions = [
    { to: '/etudiant/themes', icon: BookOpen, title: 'Choisir un thème', description: 'Parcourez les thèmes validés', color: 'text-blue-500', hideWhenAffecte: true },
    { to: '/etudiant/proposer', icon: ClipboardList, title: 'Proposer un thème', description: 'Soumettez votre propre sujet', color: 'text-purple-500', hideWhenAffecte: true },
    { to: '/etudiant/binome', icon: Users, title: 'Mon binôme', description: 'Gérez votre partenariat', color: 'text-indigo-500', hideWhenAffecte: false },
    { to: '/etudiant/annonces', icon: Megaphone, title: 'Annonces', description: 'Thèmes ouverts au binôme', color: 'text-orange-500', hideWhenAffecte: true },
  ];
  const actions = isAffecte ? allActions.filter((a) => !a.hideWhenAffecte) : allActions;

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour, {user?.prenom} {user?.nom}
        </h1>
        <p className="text-muted-foreground mt-1">Voici votre espace étudiant.</p>
      </div>

      {/* Bannière session */}
      {activeSession ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-sm font-medium text-emerald-800">
            Session <strong>{activeSession.type}</strong> ouverte — {activeSession.annee_universitaire}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-amber-800">
            Aucune session de choix ouverte actuellement.
          </span>
        </div>
      )}

      {/* Statut de thème */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Mon statut de thème
        </h2>

        {loadingChoix ? (
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : isAdminAffecte && monAffectation ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-emerald-100 p-2.5 shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-emerald-800">Affecté par l'administration</span>
                  <Badge className="bg-emerald-200 text-emerald-800 border-0 text-xs">AFFECTÉ</Badge>
                </div>
                {monAffectation.theme ? (
                  <p className="text-sm font-medium text-emerald-900 mt-1 line-clamp-2">
                    {monAffectation.theme.titre}
                  </p>
                ) : (
                  <p className="text-sm text-emerald-700 mt-1">
                    Thème à définir par votre encadrant.
                  </p>
                )}
                {monAffectation.encadrant && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Encadrant : {monAffectation.encadrant.prenom} {monAffectation.encadrant.nom}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : acceptedChoix ? (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setDetailThemeId(acceptedChoix.theme.id)}
          >
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-emerald-100 p-2.5 shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-emerald-800">Thème accepté</span>
                  <Badge className="bg-emerald-200 text-emerald-800 border-0 text-xs">
                    Choix n°{acceptedChoix.ordre}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-emerald-900 mt-1 line-clamp-2">
                  {acceptedChoix.theme.titre}
                </p>
                {acceptedChoix.theme.encadrant && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Encadrant : {acceptedChoix.theme.encadrant.prenom} {acceptedChoix.theme.encadrant.nom}
                  </p>
                )}
              </div>
              <Info className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            </div>
          </div>
        ) : allRefused ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-red-100 p-2.5 shrink-0">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-800">Tous vos choix ont été refusés</p>
                <p className="text-sm text-red-700 mt-0.5">
                  Vous pouvez soumettre de nouveaux choix de thèmes.
                </p>
                <Button
                  size="sm"
                  className="mt-3 gap-2 bg-red-600 hover:bg-red-700"
                  onClick={() => navigate('/etudiant/themes')}
                >
                  Choisir de nouveaux thèmes <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : choix.length > 0 ? (
          <div className="space-y-2">
            {choix.map((c) => (
              <div
                key={c.id}
                onClick={() => setDetailThemeId(c.theme.id)}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 cursor-pointer hover:bg-accent/20 transition-colors ${
                  c.statut === 'REFUSED' ? 'bg-red-50/50 border-red-100' : 'bg-card'
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                    c.statut === 'REFUSED'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {c.ordre}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.theme.titre}</p>
                  <p className="text-xs text-muted-foreground">{c.theme.type_pfe}</p>
                </div>
                <StatutBadge statut={c.statut} />
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            ))}
            {pendingChoix.length > 0 && (
              <p className="text-xs text-muted-foreground pl-1 flex items-center gap-1.5 pt-1">
                <Clock className="h-3.5 w-3.5" />
                {pendingChoix.length} choix en attente de réponse des enseignants.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium">Aucun choix soumis</p>
            <p className="text-sm text-muted-foreground mt-1">
              Soumettez jusqu'à 3 thèmes par ordre de préférence.
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => navigate('/etudiant/themes')}
              >
                Parcourir les thèmes <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="gap-2" onClick={() => navigate('/etudiant/proposer')}>
                Proposer un thème <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mon thème proposé */}
      {!loadingThemes && mesThemes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Mon thème proposé
          </h2>
          <div className="space-y-2">
            {mesThemes.map((theme) => (
              <Card key={theme.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{theme.titre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {theme.session?.annee_universitaire}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <Badge
                        className={
                          theme.type_pfe === 'STARTUP'
                            ? 'bg-orange-100 text-orange-700 border-orange-200 text-xs'
                            : 'bg-blue-100 text-blue-700 border-blue-200 text-xs'
                        }
                      >
                        {theme.type_pfe}
                      </Badge>
                      <Badge
                        className={
                          theme.statut_validation === 'VALIDE'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 text-xs'
                            : 'bg-slate-100 text-slate-600 border-slate-200 text-xs'
                        }
                      >
                        {theme.statut_validation === 'VALIDE' ? 'Validé' : 'En cours de validation'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map(({ to, icon: Icon, title, description, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col gap-3 rounded-xl border p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <Icon className={`h-5 w-5 ${color}`} />
              <div>
                <div className="text-sm font-medium">{title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <ThemeDetailDialog
        themeId={detailThemeId}
        onClose={() => setDetailThemeId(null)}
      />
    </div>
  );
}
