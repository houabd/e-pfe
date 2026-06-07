import { useState, useMemo } from 'react';
import { useAnnoncesEncadrement, usePostulerEncadrant } from '@/hooks/useThemes';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import type { AnnonceTheme } from '@/services/themes.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeDetailDialog } from '@/components/themes/ThemeDetailDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { BookOpen, ChevronDown, Search, Tag, User, UserCheck } from 'lucide-react';

// ─── Multi-select spécialité ──────────────────────────────────────────────────

function SpecialiteMultiSelect({
  specialites,
  selected,
  onChange,
}: {
  specialites: { id: string; nom: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const label =
    selected.length === 0
      ? 'Toutes les spécialités'
      : selected.length === 1
        ? specialites.find((s) => s.id === selected[0])?.nom ?? '1 spécialité'
        : `${selected.length} spécialités`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[200px] justify-between">
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {specialites.map((s) => (
          <DropdownMenuCheckboxItem
            key={s.id}
            checked={selected.includes(s.id)}
            onCheckedChange={() =>
              onChange(selected.includes(s.id) ? selected.filter((x) => x !== s.id) : [...selected, s.id])
            }
          >
            {s.nom}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Carte annonce ────────────────────────────────────────────────────────────

function AnnonceCard({
  annonce,
  onPostuler,
  onView,
}: {
  annonce: AnnonceTheme;
  onPostuler: (a: AnnonceTheme) => void;
  onView: (id: string) => void;
}) {
  const proposant = annonce.propose_par;
  const specialites = annonce.theme_specialites.map((ts) => ts.specialite);

  return (
    <div
      onClick={() => onView(annonce.id)}
      className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md hover:border-primary/30 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {specialites.map((s) => (
            <Badge key={s.id} variant="secondary" className="text-xs">
              {s.nom}
            </Badge>
          ))}
          <Badge variant="outline" className="text-xs">
            {annonce.type_pfe === 'CLASSIQUE' ? 'Classique' : 'Startup'}
          </Badge>
          <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
            Cherche encadrant
          </Badge>
        </div>
        {annonce.session && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {annonce.session.annee_universitaire}
          </span>
        )}
      </div>

      <div>
        <h3 className="font-semibold leading-snug line-clamp-2">{annonce.titre}</h3>
        {annonce.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{annonce.description}</p>
        )}
      </div>

      {annonce.mots_cles.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          {annonce.mots_cles.slice(0, 5).map((mc) => (
            <span key={mc} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {mc}
            </span>
          ))}
          {annonce.mots_cles.length > 5 && (
            <span className="text-xs text-muted-foreground">+{annonce.mots_cles.length - 5}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <span>
            {proposant.prenom} {proposant.nom}
            {proposant.specialite && (
              <span className="ml-1 text-xs">· {proposant.specialite.nom}</span>
            )}
          </span>
        </div>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onPostuler(annonce);
          }}
        >
          <UserCheck className="mr-1.5 h-3.5 w-3.5" />
          Postuler
        </Button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AnnonceSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-1 h-4 w-full" />
      <Skeleton className="mb-4 h-4 w-5/6" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AnnoncesEncadrement() {
  const [search, setSearch] = useState('');
  const [selectedSpecialites, setSelectedSpecialites] = useState<string[]>([]);
  const [confirmAnnonce, setConfirmAnnonce] = useState<AnnonceTheme | null>(null);
  const [detailThemeId, setDetailThemeId] = useState<string | null>(null);

  const { data: annoncesResult, isLoading } = useAnnoncesEncadrement();
  const { data: specialites = [] } = useActiveSpecialites();
  const postuler = usePostulerEncadrant();

  const annonces = annoncesResult?.data ?? [];

  const filtered = useMemo(() => {
    let list = annonces;
    if (selectedSpecialites.length > 0) {
      list = list.filter((a) =>
        a.theme_specialites.some((ts) => selectedSpecialites.includes(ts.specialite.id)),
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.titre.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.mots_cles.some((mc) => mc.toLowerCase().includes(q)) ||
          `${a.propose_par.prenom} ${a.propose_par.nom}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [annonces, selectedSpecialites, search]);

  function handleConfirmPostuler() {
    if (!confirmAnnonce) return;
    postuler.mutate(confirmAnnonce.id, { onSettled: () => setConfirmAnnonce(null) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Annonces — Encadrement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thèmes validés proposés par des étudiants qui cherchent un encadrant. Postulez pour encadrer un thème qui vous intéresse.
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher par titre, mots-clés, étudiant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {specialites.length > 0 && (
          <SpecialiteMultiSelect
            specialites={specialites}
            selected={selectedSpecialites}
            onChange={setSelectedSpecialites}
          />
        )}
        {(search || selectedSpecialites.length > 0) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setSelectedSpecialites([]); }}>
            Réinitialiser
          </Button>
        )}
      </div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {filtered.length === annonces.length
            ? `${annonces.length} annonce${annonces.length > 1 ? 's' : ''}`
            : `${filtered.length} sur ${annonces.length} annonce${annonces.length > 1 ? 's' : ''}`}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <AnnonceSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Aucune annonce pour le moment</p>
          {(search || selectedSpecialites.length > 0) && (
            <p className="mt-1 text-sm text-muted-foreground">Essayez de modifier vos filtres.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <AnnonceCard
              key={a.id}
              annonce={a}
              onPostuler={setConfirmAnnonce}
              onView={setDetailThemeId}
            />
          ))}
        </div>
      )}

      {/* Dialog confirmation */}
      <AlertDialog open={!!confirmAnnonce} onOpenChange={(open) => !open && setConfirmAnnonce(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la candidature</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez postuler en tant qu'encadrant pour le thème{' '}
              <strong>« {confirmAnnonce?.titre} »</strong>. Cette action vous assignera directement
              comme encadrant. Voulez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPostuler} disabled={postuler.isPending}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ThemeDetailDialog themeId={detailThemeId} onClose={() => setDetailThemeId(null)} />
    </div>
  );
}
