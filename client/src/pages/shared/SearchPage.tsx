import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, GraduationCap, User, BookOpen, X, ChevronRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearch } from '@/hooks/useSearch';
import type { SearchEtudiant, SearchEnseignant, SearchTheme } from '@/services/search.api';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function highlight(text: string, q: string) {
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function TabCount({ count, loading }: { count: number; loading: boolean }) {
  if (loading) return <span className="ml-1 text-xs text-muted-foreground">…</span>;
  if (count === 0) return null;
  return (
    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
      {count}
    </Badge>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border p-4">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Carte étudiant ───────────────────────────────────────────────────────────

function EtudiantCard({ e, q }: { e: SearchEtudiant; q: string }) {
  const initials = `${e.prenom[0] ?? ''}${e.nom[0] ?? ''}`.toUpperCase();
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900/40 dark:text-blue-300">
        {initials}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">{highlight(`${e.prenom} ${e.nom}`, q)}</p>
          {e.matricule && (
            <Badge variant="outline" className="text-[11px] font-mono">{e.matricule}</Badge>
          )}
          {e.specialite && (
            <Badge variant="secondary" className="text-[11px]">{e.specialite.nom}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{highlight(e.email, q)}</p>
        {e.affectation?.theme ? (
          <div className="flex items-center gap-1.5 text-xs mt-1">
            <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Thème :</span>
            <span className="font-medium truncate">{e.affectation.theme.titre}</span>
            {e.affectation.encadrant && (
              <>
                <span className="text-muted-foreground mx-1">·</span>
                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  {e.affectation.encadrant.prenom} {e.affectation.encadrant.nom}
                </span>
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Sans thème affecté</p>
        )}
      </div>
    </div>
  );
}

// ─── Carte enseignant ─────────────────────────────────────────────────────────

function EnseignantCard({ e, q }: { e: SearchEnseignant; q: string }) {
  const initials = `${e.prenom[0] ?? ''}${e.nom[0] ?? ''}`.toUpperCase();
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-emerald-900/40 dark:text-emerald-300">
        {initials}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">{highlight(`${e.prenom} ${e.nom}`, q)}</p>
          {e.specialite && (
            <Badge variant="secondary" className="text-[11px]">{e.specialite.nom}</Badge>
          )}
          {e.role === 'RESP_FILIERE' && (
            <Badge variant="default" className="text-[11px]">Resp. Filière</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{highlight(e.email, q)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {e.nb_affectations > 0
            ? `${e.nb_affectations} étudiant(s) encadré(s)`
            : 'Aucun étudiant encadré'}
        </p>
      </div>
    </div>
  );
}

// ─── Carte thème ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = { CLASSIQUE: 'Classique', STARTUP: 'Startup' };
const STATUT_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  VALIDE: 'default', NON_VALIDE: 'outline',
};

function ThemeCard({ t, q }: { t: SearchTheme; q: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow space-y-2">
      <div className="flex items-start gap-2">
        <p className="font-semibold text-sm flex-1 min-w-0 leading-snug">{highlight(t.titre, q)}</p>
        <div className="flex gap-1 shrink-0">
          <Badge variant="outline" className="text-[11px]">{TYPE_LABELS[t.type_pfe] ?? t.type_pfe}</Badge>
          <Badge variant={STATUT_VARIANTS[t.statut_validation] ?? 'outline'} className="text-[11px]">
            {t.statut_validation === 'VALIDE' ? 'Validé' : 'Non validé'}
          </Badge>
          {t.is_soutenu && <Badge variant="default" className="text-[11px] bg-green-600">Soutenu</Badge>}
          {t.is_affecte && !t.is_soutenu && <Badge variant="secondary" className="text-[11px]">Affecté</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {t.theme_specialites.map((ts) => (
          <Badge key={ts.specialite.id} variant="outline" className="text-[10px]">
            {ts.specialite.nom}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Proposé par : <span className="font-medium text-foreground">{t.propose_par.prenom} {t.propose_par.nom}</span>
        </span>
        {t.affectation?.encadrant && (
          <span>
            Encadrant : <span className="font-medium text-foreground">
              {t.affectation.encadrant.prenom} {t.affectation.encadrant.nom}
            </span>
          </span>
        )}
        {t.affectation?.etudiants && t.affectation.etudiants.length > 0 && (
          <span>
            Étudiants : <span className="font-medium text-foreground">
              {t.affectation.etudiants.map((ae) => `${ae.etudiant.prenom} ${ae.etudiant.nom}`).join(', ')}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Section vide ─────────────────────────────────────────────────────────────

function EmptySection({ label }: { label: string }) {
  return (
    <div className="py-10 text-center text-muted-foreground">
      <p className="text-sm">Aucun {label} trouvé</p>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qFromUrl = searchParams.get('q') ?? '';
  const [inputValue, setInputValue] = useState(qFromUrl);
  const [activeTab, setActiveTab] = useState('etudiants');
  const autoSwitched = useRef(false);

  useEffect(() => {
    setInputValue(qFromUrl);
    autoSwitched.current = false;
    setActiveTab('etudiants');
  }, [qFromUrl]);

  const validQuery = qFromUrl.trim().length >= 2;
  const { data, isLoading, isFetching } = useSearch(qFromUrl);

  const loading = isLoading && validQuery;

  // Auto-sélection du premier tab non vide
  useEffect(() => {
    if (!data || autoSwitched.current) return;
    if (data.etudiants.length > 0) { setActiveTab('etudiants'); autoSwitched.current = true; return; }
    if (data.enseignants.length > 0) { setActiveTab('enseignants'); autoSwitched.current = true; return; }
    if (data.themes.length > 0) { setActiveTab('themes'); autoSwitched.current = true; }
  }, [data]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    if (q.length >= 2) navigate(`/recherche?q=${encodeURIComponent(q)}`);
  };

  const total = data?.total ?? 0;
  const etudiants = data?.etudiants ?? [];
  const enseignants = data?.enseignants ?? [];
  const themes = data?.themes ?? [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Recherche globale</h2>
        {validQuery && !loading && (
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total} résultat(s) pour « ${qFromUrl} »` : `Aucun résultat pour « ${qFromUrl} »`}
          </p>
        )}
      </div>

      {/* Barre de recherche */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Nom d'étudiant, d'enseignant, titre de thème…"
            className="pl-10 pr-10"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => { setInputValue(''); navigate('/recherche'); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={inputValue.trim().length < 2}>
          Rechercher
        </Button>
      </form>

      {/* État initial ou query trop courte */}
      {!validQuery && (
        <div className="py-20 text-center text-muted-foreground">
          <Search className="mx-auto h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm font-medium">Tapez au moins 2 caractères pour lancer la recherche</p>
          <p className="text-xs mt-1">Étudiants, enseignants, thèmes PFE</p>
        </div>
      )}

      {/* Résultats */}
      {validQuery && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="etudiants" className="flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" />
              Étudiants
              <TabCount count={etudiants.length} loading={loading} />
            </TabsTrigger>
            <TabsTrigger value="enseignants" className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Enseignants
              <TabCount count={enseignants.length} loading={loading} />
            </TabsTrigger>
            <TabsTrigger value="themes" className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Thèmes
              <TabCount count={themes.length} loading={loading} />
            </TabsTrigger>
          </TabsList>

          {/* Étudiants */}
          <TabsContent value="etudiants" className="mt-4">
            {loading ? (
              <ResultSkeleton />
            ) : etudiants.length === 0 ? (
              <EmptySection label="étudiant" />
            ) : (
              <div className="space-y-3">
                {etudiants.map((e) => (
                  <EtudiantCard key={e.id} e={e} q={qFromUrl} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Enseignants */}
          <TabsContent value="enseignants" className="mt-4">
            {loading ? (
              <ResultSkeleton />
            ) : enseignants.length === 0 ? (
              <EmptySection label="enseignant" />
            ) : (
              <div className="space-y-3">
                {enseignants.map((e) => (
                  <EnseignantCard key={e.id} e={e} q={qFromUrl} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Thèmes */}
          <TabsContent value="themes" className="mt-4">
            {loading ? (
              <ResultSkeleton />
            ) : themes.length === 0 ? (
              <EmptySection label="thème" />
            ) : (
              <div className="space-y-3">
                {themes.map((t) => (
                  <ThemeCard key={t.id} t={t} q={qFromUrl} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Indicateur de rechargement subtil */}
      {isFetching && !loading && (
        <div className="fixed bottom-4 right-4">
          <Badge variant="secondary" className="text-xs animate-pulse">
            Mise à jour…
          </Badge>
        </div>
      )}
    </div>
  );
}
