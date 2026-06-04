import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, GraduationCap, User, BookOpen, X, Mail, MapPin, Hash, CheckCircle2, AlertCircle } from 'lucide-react';
import { ThemeDetailDialog } from '@/components/themes/ThemeDetailDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
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

// ─── Dialog détail étudiant ───────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  CHEF_DEPT: 'Chef de Département',
  CHEF_EQUIPE: 'Responsable de Filière',
  RESP_SPECIALITE: 'Responsable de Spécialité',
  TECHNICIEN: 'Technicien',
  ENSEIGNANT: 'Enseignant',
  ETUDIANT: 'Étudiant',
};

function EtudiantDetailDialog({ etudiant, onClose }: { etudiant: SearchEtudiant | null; onClose: () => void }) {
  if (!etudiant) return null;
  const initials = `${etudiant.prenom[0] ?? ''}${etudiant.nom[0] ?? ''}`.toUpperCase();
  const aff = etudiant.affectation;

  return (
    <Dialog open={!!etudiant} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Détails de l'étudiant</DialogTitle>
        </DialogHeader>

        {/* Avatar + nom */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-4 border-b">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-2xl font-bold">
            {initials}
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{etudiant.prenom} {etudiant.nom}</p>
            <p className="text-sm text-muted-foreground">Étudiant</p>
          </div>
        </div>

        {/* Informations */}
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium ml-auto truncate max-w-[220px]">{etudiant.email}</span>
          </div>

          {etudiant.matricule && (
            <div className="flex items-center gap-3 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Matricule</span>
              <span className="font-mono font-medium ml-auto">{etudiant.matricule}</span>
            </div>
          )}

          {etudiant.specialite && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Spécialité</span>
              <Badge variant="secondary" className="ml-auto text-xs">{etudiant.specialite.nom}</Badge>
            </div>
          )}

          {/* Statut d'affectation */}
          <div className="mt-4 rounded-lg border p-4">
            {aff?.theme ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700">Thème affecté</span>
                  <Badge className={`ml-auto text-[11px] border-0 ${aff.theme.type_pfe === 'STARTUP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {aff.theme.type_pfe}
                  </Badge>
                </div>
                <p className="text-sm font-medium pl-6 line-clamp-2">{aff.theme.titre}</p>
                {aff.encadrant ? (
                  <p className="text-xs text-muted-foreground pl-6">
                    Encadrant : {aff.encadrant.prenom} {aff.encadrant.nom}
                  </p>
                ) : aff.theme.type_pfe === 'STARTUP' ? (
                  <p className="text-xs text-muted-foreground pl-6 italic">Encadrant externe</p>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm text-amber-700">Sans thème affecté</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog détail enseignant ─────────────────────────────────────────────────

function EnseignantDetailDialog({ enseignant, onClose }: { enseignant: SearchEnseignant | null; onClose: () => void }) {
  if (!enseignant) return null;
  const initials = `${enseignant.prenom[0] ?? ''}${enseignant.nom[0] ?? ''}`.toUpperCase();

  return (
    <Dialog open={!!enseignant} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Détails de l'enseignant</DialogTitle>
        </DialogHeader>

        {/* Avatar + nom */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-4 border-b">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-2xl font-bold">
            {initials}
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{enseignant.prenom} {enseignant.nom}</p>
            <p className="text-sm text-muted-foreground">{ROLE_LABELS[enseignant.role] ?? enseignant.role}</p>
          </div>
        </div>

        {/* Informations */}
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium ml-auto truncate max-w-[220px]">{enseignant.email}</span>
          </div>

          {enseignant.specialite && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Spécialité</span>
              <Badge variant="secondary" className="ml-auto text-xs">{enseignant.specialite.nom}</Badge>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Thèmes proposés</span>
            <span className="font-semibold ml-auto">{enseignant.nb_themes}</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Étudiants encadrés</span>
            <span className="font-semibold ml-auto">{enseignant.nb_affectations}</span>
          </div>

          {/* Indicateur de charge */}
          <div className="mt-2 rounded-lg border p-4">
            {enseignant.nb_affectations === 0 ? (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm text-amber-700">Aucun étudiant encadré actuellement</span>
              </div>
            ) : enseignant.nb_affectations > 2 ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />
                <span className="text-sm text-orange-700">
                  Encadre {enseignant.nb_affectations} étudiants — chargé
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-sm text-emerald-700">
                  Encadre {enseignant.nb_affectations} étudiant{enseignant.nb_affectations > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte étudiant ───────────────────────────────────────────────────────────

function EtudiantCard({ e, q, onClick }: { e: SearchEtudiant; q: string; onClick: () => void }) {
  const initials = `${e.prenom[0] ?? ''}${e.nom[0] ?? ''}`.toUpperCase();
  return (
    <div
      className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer"
      onClick={onClick}
    >
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

function EnseignantCard({ e, q, onClick }: { e: SearchEnseignant; q: string; onClick: () => void }) {
  const initials = `${e.prenom[0] ?? ''}${e.nom[0] ?? ''}`.toUpperCase();
  return (
    <div
      className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-emerald-900/40 dark:text-emerald-300">
        {initials}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">{highlight(`${e.prenom} ${e.nom}`, q)}</p>
          {e.specialite && (
            <Badge variant="secondary" className="text-[11px]">{e.specialite.nom}</Badge>
          )}
          {e.role === 'CHEF_EQUIPE' && (
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

function ThemeCard({ t, q, onClick }: { t: SearchTheme; q: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="rounded-lg border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-shadow space-y-2 cursor-pointer">
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
  const [detailThemeId, setDetailThemeId] = useState<string | null>(null);
  const [detailEtudiant, setDetailEtudiant] = useState<SearchEtudiant | null>(null);
  const [detailEnseignant, setDetailEnseignant] = useState<SearchEnseignant | null>(null);
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
                  <EtudiantCard key={e.id} e={e} q={qFromUrl} onClick={() => setDetailEtudiant(e)} />
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
                  <EnseignantCard key={e.id} e={e} q={qFromUrl} onClick={() => setDetailEnseignant(e)} />
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
                  <ThemeCard key={t.id} t={t} q={qFromUrl} onClick={() => setDetailThemeId(t.id)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <ThemeDetailDialog
        themeId={detailThemeId}
        onClose={() => setDetailThemeId(null)}
      />
      <EtudiantDetailDialog
        etudiant={detailEtudiant}
        onClose={() => setDetailEtudiant(null)}
      />
      <EnseignantDetailDialog
        enseignant={detailEnseignant}
        onClose={() => setDetailEnseignant(null)}
      />

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
