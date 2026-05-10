import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Search, Filter, ChevronDown, GripVertical,
  X, Plus, CheckCircle2, AlertCircle, Users, ArrowRight,
  ChevronUp, ChevronDown as ChevronDownIcon, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMesChoix, useSubmitChoix } from '@/hooks/useChoix';
import { useMonBinome } from '@/hooks/useBinomes';
import { useThemes } from '@/hooks/useThemes';
import { useActiveSession } from '@/hooks/useSession';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import { useCurrentUser } from '@/stores/authStore';
import { toast } from 'sonner';
import type { Theme } from '@/types';

const MAX_CHOIX = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return type === 'STARTUP' ? (
    <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-xs">
      STARTUP
    </Badge>
  ) : (
    <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">
      CLASSIQUE
    </Badge>
  );
}

function StatutBadge({ statut }: { statut: 'PENDING' | 'ACCEPTED' | 'REFUSED' }) {
  if (statut === 'ACCEPTED') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">
        Accepté
      </Badge>
    );
  }
  if (statut === 'REFUSED') {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">
        Refusé
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs">
      En attente
    </Badge>
  );
}

// ─── Filtre spécialités multi-select ─────────────────────────────────────────

function SpecialiteFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: specialites = [] } = useActiveSpecialites();

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  const label =
    selected.length === 0
      ? 'Toutes les spécialités'
      : selected.length === 1
        ? (specialites.find((s) => s.id === selected[0])?.nom ?? '1 spécialité')
        : `${selected.length} spécialités`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 text-sm">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-2">
        {specialites.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-2.5 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
          >
            <Checkbox
              checked={selected.includes(s.id)}
              onCheckedChange={() => toggle(s.id)}
            />
            {s.nom}
          </label>
        ))}
        {selected.length > 0 && (
          <>
            <div className="border-t my-1" />
            <button
              className="w-full text-left rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              onClick={() => onChange([])}
            >
              Effacer les filtres
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Panier de sélection (drag & drop) ───────────────────────────────────────

function SelectionPanier({
  items,
  ordreOffset,
  onChange,
}: {
  items: Theme[];
  ordreOffset: number;
  onChange: (themes: Theme[]) => void;
}) {
  const dragIndex = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function handleDragStart(e: React.DragEvent, i: number) {
    dragIndex.current = i;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(i);
  }

  function handleDrop(e: React.DragEvent, targetIdx: number) {
    e.preventDefault();
    const src = dragIndex.current;
    if (src === null || src === targetIdx) {
      setDragOverIdx(null);
      return;
    }
    const next = [...items];
    const [removed] = next.splice(src, 1);
    next.splice(targetIdx, 0, removed);
    onChange(next);
    dragIndex.current = null;
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOverIdx(null);
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  }

  function moveDown(i: number) {
    if (i === items.length - 1) return;
    const next = [...items];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Cliquez sur <strong>Ajouter</strong> pour sélectionner des thèmes.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Glissez-déposez pour changer l'ordre de préférence.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((theme, i) => {
        const ordre = ordreOffset + i + 1;
        return (
          <div
            key={theme.id}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 rounded-lg border bg-card p-3 transition-all cursor-grab active:cursor-grabbing ${
              dragOverIdx === i ? 'border-primary bg-primary/5 scale-[1.01]' : ''
            }`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {ordre}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{theme.titre}</p>
              {theme.encadrant && (
                <p className="text-xs text-muted-foreground truncate">
                  {theme.encadrant.prenom} {theme.encadrant.nom}
                </p>
              )}
            </div>
            <TypeBadge type={theme.type_pfe} />
            <div className="flex shrink-0 gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={i === 0}
                onClick={() => moveUp(i)}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={i === items.length - 1}
                onClick={() => moveDown(i)}
              >
                <ChevronDownIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => remove(i)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Carte thème disponible ───────────────────────────────────────────────────

function ThemeCard({
  theme,
  onAdd,
  disabled,
  disabledReason,
}: {
  theme: Theme;
  onAdd: () => void;
  disabled: boolean;
  disabledReason?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:bg-accent/20 transition-colors">
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-medium line-clamp-2">{theme.titre}</p>
        {theme.encadrant && (
          <p className="text-xs text-muted-foreground">
            Encadrant : {theme.encadrant.prenom} {theme.encadrant.nom}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-1">
          <TypeBadge type={theme.type_pfe} />
          {theme.theme_specialites.map((ts) => (
            <Badge
              key={ts.specialite.id}
              variant="outline"
              className="text-xs border-border text-muted-foreground"
            >
              {ts.specialite.nom}
            </Badge>
          ))}
        </div>
      </div>
      <div className="shrink-0 pt-0.5">
        <Button
          size="sm"
          className="h-8 gap-1.5"
          disabled={disabled}
          title={disabledReason}
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}

// ─── Dialog confirmation ──────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  selectedThemes,
  ordreOffset,
  binome,
  hasBinome,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedThemes: Theme[];
  ordreOffset: number;
  binome: { etud1: { id: string; nom: string; prenom: string }; etud2: { id: string; nom: string; prenom: string } } | null | undefined;
  hasBinome: boolean;
  isPending: boolean;
}) {
  const user = useCurrentUser();
  const navigate = useNavigate();

  const partner = binome
    ? user?.id === binome.etud1.id
      ? binome.etud2
      : binome.etud1
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasBinome ? 'Confirmer vos choix de thèmes' : 'Soumettre sans binôme ?'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!hasBinome && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Vous n'avez pas encore de binôme.</p>
                <p className="mt-0.5 text-amber-700">
                  Si vous formez un binôme après la soumission, votre partenaire partagera
                  automatiquement ces choix.
                </p>
              </div>
            </div>
          )}

          {hasBinome && partner && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
              <Users className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-sm text-blue-800">
                Ces choix seront communs avec votre binôme{' '}
                <strong>{partner.prenom} {partner.nom}</strong>.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Choix à soumettre
            </p>
            {selectedThemes.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {ordreOffset + i + 1}
                </span>
                <span className="line-clamp-1 flex-1">{t.titre}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          {!hasBinome && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => { onClose(); navigate('/etudiant/binome'); }}
            >
              <Users className="h-3.5 w-3.5" />
              Gérer mon binôme
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={isPending} onClick={onConfirm}>
            {isPending ? 'Envoi en cours…' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ChoixThemes() {
  const navigate = useNavigate();
  const activeSession = useActiveSession();
  const { data: mesChoixData, isLoading: loadingChoix } = useMesChoix();
  const { data: binome } = useMonBinome();

  const choix = mesChoixData?.choix ?? [];
  const peutRechoisir = mesChoixData?.peutRechoisir ?? false;

  // Choix non refusés déjà soumis
  const existingActive = useMemo(
    () => choix.filter((c) => c.statut !== 'REFUSED'),
    [choix],
  );
  const acceptedChoix = existingActive.find((c) => c.statut === 'ACCEPTED');

  const isSessionChoix = !!activeSession && activeSession.type === 'CHOIX';
  const slotsLeft = MAX_CHOIX - existingActive.length;
  const canAddMore = !acceptedChoix && slotsLeft > 0 && isSessionChoix;

  // Ordres disponibles (ceux non encore pris)
  const usedOrdres = useMemo(
    () => new Set(existingActive.map((c) => c.ordre)),
    [existingActive],
  );
  const availableOrdres = useMemo(
    () => ([1, 2, 3] as const).filter((o) => !usedOrdres.has(o)),
    [usedOrdres],
  );

  // Sélection locale (nouveaux thèmes avant soumission)
  const [selectedThemes, setSelectedThemes] = useState<Theme[]>([]);

  // Filtres de recherche
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSpecialites, setSelectedSpecialites] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Array<'CLASSIQUE' | 'STARTUP'>>([]);

  // Dialog
  const [showConfirm, setShowConfirm] = useState(false);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Themes disponibles (VALIDE, non affectés, session actuelle si possible)
  const { data: themesResponse, isLoading: loadingThemes } = useThemes({
    statut_validation: 'VALIDE',
    is_affecte: false,
    search: debouncedSearch || undefined,
    limit: 50,
  });

  const allThemes: Theme[] = themesResponse?.data ?? [];

  // IDs déjà sélectionnés ou déjà soumis
  const excludedIds = useMemo(() => {
    const ids = new Set<string>();
    existingActive.forEach((c) => ids.add(c.theme.id));
    selectedThemes.forEach((t) => ids.add(t.id));
    return ids;
  }, [existingActive, selectedThemes]);

  // Filtrage client-side (spécialités + type)
  const filteredThemes = useMemo(() => {
    let list = allThemes.filter((t) => !excludedIds.has(t.id));

    if (selectedSpecialites.length > 0) {
      list = list.filter((t) =>
        t.theme_specialites.some((ts) => selectedSpecialites.includes(ts.specialite.id)),
      );
    }
    if (selectedTypes.length > 0 && selectedTypes.length < 2) {
      list = list.filter((t) => selectedTypes.includes(t.type_pfe as 'CLASSIQUE' | 'STARTUP'));
    }
    return list;
  }, [allThemes, excludedIds, selectedSpecialites, selectedTypes]);

  // Mutation submit
  const submitMutation = useSubmitChoix();

  async function handleConfirm() {
    try {
      for (let i = 0; i < selectedThemes.length; i++) {
        await submitMutation.mutateAsync({
          theme_id: selectedThemes[i].id,
          ordre: availableOrdres[i],
        });
      }
      toast.success(`${selectedThemes.length} choix soumis avec succès`);
      setSelectedThemes([]);
      setShowConfirm(false);
    } catch {
      // erreur déjà gérée par le hook
      setShowConfirm(false);
    }
  }

  function addTheme(theme: Theme) {
    if (selectedThemes.length >= slotsLeft) return;
    setSelectedThemes((prev) => [...prev, theme]);
  }

  function toggleType(type: 'CLASSIQUE' | 'STARTUP') {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Choix de thèmes
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sélectionnez jusqu'à 3 thèmes classés par ordre de préférence.
          </p>
        </div>
      </div>

      {/* Bannière session */}
      {!isSessionChoix && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            La période de choix de thèmes n'est pas ouverte actuellement.
            {existingActive.length > 0 && ' Vos choix soumis restent visibles ci-dessous.'}
          </p>
        </div>
      )}

      {/* Thème accepté → état final */}
      {!loadingChoix && acceptedChoix && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-emerald-100 p-2.5 shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-800">Thème affecté — Choix n°{acceptedChoix.ordre}</p>
                <p className="text-sm font-medium text-emerald-900 mt-1">{acceptedChoix.theme.titre}</p>
                {acceptedChoix.theme.encadrant && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Encadrant : {acceptedChoix.theme.encadrant.prenom} {acceptedChoix.theme.encadrant.nom}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Choix déjà soumis (non refusés) */}
      {!loadingChoix && existingActive.length > 0 && !acceptedChoix && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mes choix soumis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {existingActive.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg border px-4 py-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {c.ordre}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.theme.titre}</p>
                  <p className="text-xs text-muted-foreground">{c.theme.type_pfe}</p>
                </div>
                <StatutBadge statut={c.statut} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Banner rechoisir */}
      {peutRechoisir && isSessionChoix && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <RotateCcw className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800">
            Tous vos choix ont été refusés. Vous pouvez soumettre 3 nouveaux choix.
          </p>
        </div>
      )}

      {/* ─── Section sélection ─── */}
      {canAddMore && (
        <>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground px-2">
              {slotsLeft === 1 ? '1 choix restant' : `${slotsLeft} choix restants`}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Panier de sélection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>
                  Ma sélection
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({selectedThemes.length}/{slotsLeft})
                  </span>
                </span>
                {selectedThemes.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-muted-foreground"
                    onClick={() => setSelectedThemes([])}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Vider
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SelectionPanier
                items={selectedThemes}
                ordreOffset={existingActive.length}
                onChange={setSelectedThemes}
              />
            </CardContent>
          </Card>

          {/* Avertissement binôme */}
          {!binome && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Users className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-800">
                  Vous n'avez pas encore de binôme. Vos choix seront soumis à titre individuel.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-8 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => navigate('/etudiant/binome')}
              >
                Gérer <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Bouton valider */}
          <div className="flex justify-end">
            <Button
              size="lg"
              className="gap-2"
              disabled={selectedThemes.length === 0 || submitMutation.isPending}
              onClick={() => setShowConfirm(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Valider {selectedThemes.length > 0 ? `${selectedThemes.length} choix` : 'mes choix'}
            </Button>
          </div>

          {/* Filtres */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Thèmes disponibles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher par titre, description…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Type + Spécialité */}
              <div className="flex flex-wrap gap-2">
                {/* Type buttons */}
                {(['CLASSIQUE', 'STARTUP'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selectedTypes.includes(type)
                        ? type === 'STARTUP'
                          ? 'border-orange-400 bg-orange-100 text-orange-800'
                          : 'border-blue-400 bg-blue-100 text-blue-800'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {type}
                  </button>
                ))}

                <SpecialiteFilter
                  selected={selectedSpecialites}
                  onChange={setSelectedSpecialites}
                />
              </div>

              {/* Liste thèmes */}
              {loadingThemes ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredThemes.length === 0 ? (
                <div className="py-10 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Aucun thème disponible pour cette recherche.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredThemes.map((theme) => {
                    const reachedMax = selectedThemes.length >= slotsLeft;
                    return (
                      <ThemeCard
                        key={theme.id}
                        theme={theme}
                        onAdd={() => addTheme(theme)}
                        disabled={reachedMax}
                        disabledReason={
                          reachedMax
                            ? `Vous avez déjà sélectionné ${slotsLeft} thème(s)`
                            : undefined
                        }
                      />
                    );
                  })}
                  {allThemes.length === 50 && (
                    <p className="text-center text-xs text-muted-foreground pt-1">
                      Affichage limité à 50 résultats — affinez votre recherche.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Aucun choix, session fermée */}
      {!loadingChoix && choix.length === 0 && !isSessionChoix && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium">Aucun choix soumis</p>
          <p className="text-sm text-muted-foreground mt-1">
            La période de choix de thèmes n'est pas encore ouverte.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 gap-2"
            onClick={() => navigate('/etudiant')}
          >
            Retour au tableau de bord <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Max 3 atteint sans ACCEPTED (3 pending) */}
      {!loadingChoix && !acceptedChoix && !peutRechoisir && existingActive.length >= MAX_CHOIX && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800">
            Vous avez soumis 3 choix. En attente de réponse des enseignants.
          </p>
        </div>
      )}

      {/* Dialog de confirmation */}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        selectedThemes={selectedThemes}
        ordreOffset={existingActive.length}
        binome={binome}
        hasBinome={!!binome}
        isPending={submitMutation.isPending}
      />
    </div>
  );
}
