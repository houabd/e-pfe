import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useEnseignantsDispo, useEtudiantsSansTheme, useCreateAffectation,
  useCreateStartupAffectation, useAffectationAutoPreview, useConfirmerAffectationsAuto,
  useAffectations,
} from '@/hooks/useAffectations';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import type {
  EnseignantDispo, EtudiantSansTheme, ThemeDispo, AutoSuggestion,
} from '@/services/affectations.api';
import {
  Users, GraduationCap, Zap, BookOpen, ChevronRight, X, Check,
  AlertCircle, RefreshCw, UserCheck,
} from 'lucide-react';

// ─── Petit utilitaire ────────────────────────────────────────────────────────

function initials(nom: string, prenom: string) {
  return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase();
}

function Avatar({ nom, prenom, className = '' }: { nom: string; prenom: string; className?: string }) {
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ${className}`}>
      {initials(nom, prenom)}
    </div>
  );
}

// ─── Filtre spécialité ───────────────────────────────────────────────────────

function SpecialiteSelect({
  value, onChange, placeholder = 'Toutes les spécialités',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const { data: specialites = [] } = useActiveSpecialites();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Toutes les spécialités</SelectItem>
        {specialites.map((s) => (
          <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Dialog d'affectation manuelle ───────────────────────────────────────────

interface AffectationDialogProps {
  open: boolean;
  onClose: () => void;
  preselectedEnseignant?: EnseignantDispo;
  preselectedEtudiant?: EtudiantSansTheme;
  allEnseignants: EnseignantDispo[];
  allEtudiants: EtudiantSansTheme[];
}

function AffectationDialog({
  open, onClose, preselectedEnseignant, preselectedEtudiant,
  allEnseignants, allEtudiants,
}: AffectationDialogProps) {
  const createAffectation = useCreateAffectation();
  const createStartup = useCreateStartupAffectation();

  const [selectedEnseignant, setSelectedEnseignant] = useState<EnseignantDispo | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeDispo | null>(null);
  const [selectedEtudiants, setSelectedEtudiants] = useState<EtudiantSansTheme[]>([]);
  const [etudFilter, setEtudFilter] = useState('all');

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    // If student has a binôme, wait until allEtudiants is loaded before initializing
    const needsPartnerLookup = Boolean(preselectedEtudiant?.binome);
    if (initializedRef.current || (needsPartnerLookup && allEtudiants.length === 0)) return;

    setSelectedEnseignant(preselectedEnseignant ?? null);
    setSelectedTheme(null);
    setEtudFilter('all');

    if (preselectedEtudiant) {
      const initial: EtudiantSansTheme[] = [preselectedEtudiant];
      if (preselectedEtudiant.binome) {
        const partner = allEtudiants.find((e) => e.id === preselectedEtudiant.binome!.partenaire.id);
        if (partner) initial.push(partner);
      }
      setSelectedEtudiants(initial);
    } else {
      setSelectedEtudiants([]);
    }

    initializedRef.current = true;
  }, [open, preselectedEnseignant, preselectedEtudiant, allEtudiants]);

  // Reset theme when teacher changes
  useEffect(() => { setSelectedTheme(null); }, [selectedEnseignant]);

  // Par affectation : max 2 étudiants (CLASSIQUE) ou 6 (STARTUP)
  const maxStudents = selectedTheme?.type_pfe === 'STARTUP' ? 6 : 2;
  const capaciteOk = true; // validée côté serveur (max 2 affectations/enseignant)

  const filteredEtudiants = useMemo(() => {
    const selectedIds = new Set(selectedEtudiants.map((e) => e.id));
    return allEtudiants.filter((e) => {
      if (selectedIds.has(e.id)) return false;
      if (etudFilter !== 'all' && e.specialite?.id !== etudFilter) return false;
      return true;
    });
  }, [allEtudiants, selectedEtudiants, etudFilter]);

  function toggleEtudiant(e: EtudiantSansTheme) {
    setSelectedEtudiants((prev) => {
      if (prev.some((x) => x.id === e.id)) return prev.filter((x) => x.id !== e.id);
      if (prev.length >= maxStudents) return prev;
      const toAdd: EtudiantSansTheme[] = [e];
      if (e.binome && prev.length + 2 <= maxStudents) {
        const partner = allEtudiants.find((x) => x.id === e.binome!.partenaire.id);
        if (partner && !prev.some((x) => x.id === partner.id)) {
          toAdd.push(partner);
        }
      }
      return [...prev, ...toAdd];
    });
  }

  function getBinomeId(): string | undefined {
    if (selectedEtudiants.length !== 2) return undefined;
    const [a, b] = selectedEtudiants;
    if (a.binome?.partenaire.id === b.id) return a.binome.id;
    if (b.binome?.partenaire.id === a.id) return b.binome!.id;
    return undefined;
  }

  const canSubmit = selectedEnseignant !== null && selectedEtudiants.length > 0 && capaciteOk;

  const isPending = createAffectation.isPending || createStartup.isPending;

  function handleSubmit() {
    if (!selectedEnseignant) return;
    const etudiant_ids = selectedEtudiants.map((e) => e.id);

    if (selectedTheme?.type_pfe === 'STARTUP') {
      createStartup.mutate(
        { theme_id: selectedTheme.id, etudiant_ids },
        { onSuccess: onClose },
      );
    } else {
      createAffectation.mutate(
        {
          ...(selectedTheme ? { theme_id: selectedTheme.id } : {}),
          encadrant_id: selectedEnseignant.id,
          etudiant_ids,
          binome_id: getBinomeId(),
        },
        { onSuccess: onClose },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une affectation</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Enseignant ── */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">1</span>
              Enseignant
            </h3>
            {preselectedEnseignant ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
                <Avatar nom={preselectedEnseignant.nom} prenom={preselectedEnseignant.prenom} />
                <div>
                  <p className="font-medium text-sm">{preselectedEnseignant.prenom} {preselectedEnseignant.nom}</p>
                  <p className="text-xs text-muted-foreground">{preselectedEnseignant.specialite?.nom ?? 'Spécialité non définie'}</p>
                </div>
                <div className="ml-auto flex flex-col items-end gap-0.5">
                  <Badge variant="outline" className="text-xs">{preselectedEnseignant.nb_affectations}/2 thèmes</Badge>
                </div>
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-1.5 rounded-lg border p-2">
                {allEnseignants.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Aucun enseignant disponible</p>
                )}
                {allEnseignants.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedEnseignant(e)}
                    className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${selectedEnseignant?.id === e.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted'}`}
                  >
                    <Avatar nom={e.nom} prenom={e.prenom} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.prenom} {e.nom}</p>
                      <p className="text-xs text-muted-foreground">{e.specialite?.nom ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-xs">{e.nb_affectations}/2</Badge>
                    </div>
                    {selectedEnseignant?.id === e.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── Thème (optionnel) ── */}
          {selectedEnseignant && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">2</span>
                  Thème à affecter
                  <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                </h3>
                {selectedTheme && (
                  <button
                    type="button"
                    onClick={() => setSelectedTheme(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="inline h-3 w-3 mr-0.5" />Retirer
                  </button>
                )}
              </div>
              {selectedEnseignant.themes_encadres.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Cet enseignant n'a aucun thème validé disponible. Créez-en un via «&nbsp;Gestion des thèmes&nbsp;».
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedEnseignant.themes_encadres.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTheme(t)}
                      className={`w-full flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${selectedTheme?.id === t.id ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.titre}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant={t.type_pfe === 'STARTUP' ? 'default' : 'secondary'} className="text-xs">
                            {t.type_pfe}
                          </Badge>
                          {t.theme_specialites.map((ts) => (
                            <Badge key={ts.specialite.id} variant="outline" className="text-xs">{ts.specialite.nom}</Badge>
                          ))}
                        </div>
                      </div>
                      {selectedTheme?.id === t.id && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Étudiants ── */}
          {selectedEnseignant && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">3</span>
                  Étudiants ({selectedEtudiants.length}/{maxStudents})
                </h3>
                <SpecialiteSelect value={etudFilter} onChange={setEtudFilter} />
              </div>
              {!capaciteOk && (
                <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  La capacité maximale (2 thèmes) sera vérifiée à la soumission.
                </div>
              )}

              {/* Sélectionnés */}
              {selectedEtudiants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedEtudiants.map((e) => {
                    const isInBinomePair = e.binome != null &&
                      selectedEtudiants.some((x) => x.id === e.binome!.partenaire.id);
                    return (
                      <div
                        key={e.id}
                        className={`flex items-center gap-1.5 rounded-full pl-2.5 pr-1.5 py-1 text-xs font-medium ${
                          isInBinomePair ? 'bg-blue-100 text-blue-800' : 'bg-primary/10'
                        }`}
                      >
                        {e.prenom} {e.nom}
                        {isInBinomePair && (
                          <Badge className="bg-blue-200 text-blue-800 hover:bg-blue-200 text-[10px] py-0 border-0">binôme</Badge>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleEtudiant(e)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Liste disponibles */}
              {selectedEtudiants.length < maxStudents && (
                <div className="max-h-44 overflow-y-auto space-y-1 rounded-lg border p-2">
                  {filteredEtudiants.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">Aucun étudiant disponible</p>
                  )}
                  {filteredEtudiants.map((e) => {
                    const partnerAvailable = e.binome
                      ? allEtudiants.some((x) => x.id === e.binome!.partenaire.id)
                      : false;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggleEtudiant(e)}
                        className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted transition-colors"
                      >
                        <Avatar nom={e.nom} prenom={e.prenom} className="h-7 w-7 text-[10px]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{e.prenom} {e.nom}</p>
                          <p className="text-xs text-muted-foreground">{e.specialite?.nom ?? '—'} {e.matricule ? `· ${e.matricule}` : ''}</p>
                        </div>
                        {e.binome && (
                          <span className={`text-xs shrink-0 ${partnerAvailable ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                            {partnerAvailable
                              ? `+ ${e.binome.partenaire.prenom} ${e.binome.partenaire.nom}`
                              : `binôme: ${e.binome.partenaire.prenom}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
          >
            {isPending ? 'Création…' : 'Créer l\'affectation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 1 : Vue d'ensemble (enseignants + étudiants) ────────────────────────

function VueDisponibilites({
  onAffecter,
}: {
  onAffecter: (ens?: EnseignantDispo, etud?: EtudiantSansTheme) => void;
}) {
  const [ensFilter, setEnsFilter] = useState('all');
  const [etudFilter, setEtudFilter] = useState('all');

  const { data: enseignants = [], isLoading: loadingEns } = useEnseignantsDispo(ensFilter === 'all' ? undefined : ensFilter);
  const { data: etudiants = [], isLoading: loadingEtud } = useEtudiantsSansTheme(etudFilter === 'all' ? undefined : etudFilter);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Enseignants disponibles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Enseignants disponibles</span>
            {!loadingEns && (
              <Badge variant="secondary">{enseignants.length}</Badge>
            )}
          </div>
          <SpecialiteSelect value={ensFilter} onChange={setEnsFilter} />
        </div>

        <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
          {loadingEns ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : enseignants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              <UserCheck className="mb-2 h-8 w-8 opacity-30" />
              Tous les enseignants sont à capacité
            </div>
          ) : (
            enseignants.map((ens) => (
              <div key={ens.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar nom={ens.nom} prenom={ens.prenom} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ens.prenom} {ens.nom}</p>
                    <p className="text-xs text-muted-foreground">{ens.specialite?.nom ?? 'Spécialité non définie'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1">
                      {[0, 1].map((i) => (
                        <div
                          key={i}
                          className={`h-2 w-2 rounded-full ${i < ens.nb_affectations ? 'bg-primary' : 'bg-muted'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{ens.nb_affectations}/2 thèmes</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {ens.sans_proposition && (
                      <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-300">Sans thème proposé</Badge>
                    )}
                    {ens.themes_encadres.length > 0 && (
                      <Badge variant="secondary" className="text-[11px]">
                        {ens.themes_encadres.length} thème{ens.themes_encadres.length > 1 ? 's' : ''} dispo.
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onAffecter(ens)}
                  >
                    Affecter <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>

                {ens.themes_encadres.length > 0 && (
                  <div className="space-y-1 border-t pt-2">
                    {ens.themes_encadres.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3 shrink-0" />
                        <span className="truncate">{t.titre}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{t.type_pfe}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Étudiants sans thème */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Étudiants sans thème</span>
            {!loadingEtud && (
              <Badge variant="secondary">{etudiants.length}</Badge>
            )}
          </div>
          <SpecialiteSelect value={etudFilter} onChange={setEtudFilter} />
        </div>

        <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
          {loadingEtud ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
          ) : etudiants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              <Users className="mb-2 h-8 w-8 opacity-30" />
              Tous les étudiants ont un thème
            </div>
          ) : (
            etudiants.map((etud) => (
              <div
                key={etud.id}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm"
              >
                <Avatar nom={etud.nom} prenom={etud.prenom} className="h-8 w-8 text-[11px]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{etud.prenom} {etud.nom}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{etud.specialite?.nom ?? '—'}</span>
                    {etud.matricule && <span>· {etud.matricule}</span>}
                    {etud.binome && (
                      <span className="text-blue-600">· binôme avec {etud.binome.partenaire.prenom} {etud.binome.partenaire.nom}</span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onAffecter(undefined, etud)}>
                  Affecter
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2 : Semi-automatique ─────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  checked,
  onToggle,
}: {
  suggestion: AutoSuggestion;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex gap-4 rounded-xl border p-4 transition-colors ${checked ? 'border-primary/30 bg-primary/5' : 'opacity-60'}`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-medium text-sm line-clamp-1">{suggestion.theme_titre}</span>
          <Badge variant={suggestion.theme_type_pfe === 'STARTUP' ? 'default' : 'secondary'} className="text-xs shrink-0">
            {suggestion.theme_type_pfe}
          </Badge>
          {suggestion.specialites.map((s) => (
            <Badge key={s.id} variant="outline" className="text-xs">{s.nom}</Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <GraduationCap className="h-3.5 w-3.5" />
            {suggestion.encadrant.prenom} {suggestion.encadrant.nom}
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {suggestion.etudiants.map((e) => `${e.prenom} ${e.nom}`).join(' + ')}
            {suggestion.binome_id && <Badge variant="secondary" className="text-[10px]">binôme</Badge>}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Étudiants sans correspondance (groupés par spécialité) ──────────────────

type NonAffecte = { id: string; nom: string; prenom: string; email: string; specialite: { id: string; nom: string } | null };

function NonAffectesSection({ etudiants }: { etudiants: NonAffecte[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: NonAffecte[] }>();
    for (const e of etudiants) {
      const key = e.specialite?.id ?? '__sans__';
      const label = e.specialite?.nom ?? 'Sans spécialité';
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(e);
    }
    return [...map.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label));
  }, [etudiants]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-amber-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Étudiants sans correspondance
          <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100">
            {etudiants.length}
          </Badge>
        </h3>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCollapsed(new Set())}>
            Tout ouvrir
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCollapsed(new Set(grouped.map(([k]) => k)))}>
            Tout réduire
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Ces étudiants n'ont pu être associés à aucun thème disponible — affectation manuelle recommandée.
      </p>
      <div className="space-y-2">
        {grouped.map(([key, { label, items }]) => {
          const isOpen = !collapsed.has(key);
          return (
            <div key={key} className="rounded-lg border border-amber-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(key)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
              >
                <span className="text-sm font-medium text-amber-800">{label}</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-200 text-amber-800 hover:bg-amber-200 border-0 text-xs">
                    {items.length} étudiant{items.length > 1 ? 's' : ''}
                  </Badge>
                  <ChevronRight className={`h-3.5 w-3.5 text-amber-600 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {isOpen && (
                <div className="divide-y divide-amber-100">
                  {items.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-2 bg-white">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700">
                        {e.prenom[0]}{e.nom[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.prenom} {e.nom}</p>
                        <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SemiAutomatique() {
  const preview = useAffectationAutoPreview();
  const confirmer = useConfirmerAffectationsAuto();
  const [selectedThemeIds, setSelectedThemeIds] = useState<Set<string>>(new Set());

  const result = preview.data;

  useEffect(() => {
    if (result) {
      setSelectedThemeIds(new Set(result.suggestions.map((s) => s.theme_id)));
    }
  }, [result]);

  function toggleSuggestion(themeId: string) {
    setSelectedThemeIds((prev) => {
      const next = new Set(prev);
      if (next.has(themeId)) next.delete(themeId);
      else next.add(themeId);
      return next;
    });
  }

  function handleConfirmer() {
    if (!result) return;
    const selected = result.suggestions.filter((s) => selectedThemeIds.has(s.theme_id));
    confirmer.mutate({
      suggestions: selected.map((s) => ({
        theme_id: s.theme_id,
        encadrant_id: s.encadrant.id,
        etudiant_ids: s.etudiant_ids,
        binome_id: s.binome_id,
      })),
    }, {
      onSuccess: () => {
        preview.reset();
        setSelectedThemeIds(new Set());
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-xl border bg-muted/30 p-5">
        <Zap className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="font-medium">Affectation semi-automatique</p>
          <p className="mt-1 text-sm text-muted-foreground">
            L'algorithme analyse les thèmes validés disponibles et les étudiants sans thème,
            puis génère des suggestions par spécialité en priorisant les binômes.
            Vous pouvez désélectionner des suggestions avant de confirmer.
          </p>
        </div>
      </div>

      {!result && (
        <div className="flex justify-center py-4">
          <Button
            size="lg"
            onClick={() => { void preview.mutate(); }}
            disabled={preview.isPending}
          >
            {preview.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours…
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Générer les suggestions
              </>
            )}
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* Stats banner */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Suggestions', value: result.stats.total_suggestions },
              { label: 'Thèmes utilisés', value: result.stats.themes_utilises },
              { label: 'Étudiants affectés', value: result.stats.etudiants_affectes },
              { label: 'Non affectés', value: result.stats.etudiants_non_affectes, warn: result.stats.etudiants_non_affectes > 0 },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg border px-4 py-3 text-center ${s.warn ? 'border-amber-300 bg-amber-50' : ''}`}>
                <p className={`text-2xl font-bold ${s.warn ? 'text-amber-600' : ''}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Suggestions générées
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({selectedThemeIds.size}/{result.suggestions.length} sélectionnée{selectedThemeIds.size > 1 ? 's' : ''})
                </span>
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelectedThemeIds(new Set(result.suggestions.map((s) => s.theme_id)))}>
                  Tout sélectionner
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedThemeIds(new Set())}>
                  Tout désélectionner
                </Button>
              </div>
            </div>

            {result.suggestions.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-dashed p-6 text-muted-foreground">
                <AlertCircle className="h-5 w-5 shrink-0" />
                Aucune suggestion générée — vérifiez qu'il y a des thèmes validés avec encadrant disponible.
              </div>
            ) : (
              <div className="space-y-2">
                {result.suggestions.map((s) => (
                  <SuggestionCard
                    key={s.theme_id}
                    suggestion={s}
                    checked={selectedThemeIds.has(s.theme_id)}
                    onToggle={() => toggleSuggestion(s.theme_id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Étudiants non affectés */}
          {result.non_affectes.length > 0 && (
            <NonAffectesSection etudiants={result.non_affectes} />
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              variant="outline"
              onClick={() => { preview.reset(); setSelectedThemeIds(new Set()); }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regénérer
            </Button>
            <Button
              onClick={handleConfirmer}
              disabled={selectedThemeIds.size === 0 || confirmer.isPending}
            >
              {confirmer.isPending ? 'Confirmation…' : `Confirmer ${selectedThemeIds.size} affectation${selectedThemeIds.size > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3 : Affectations existantes ─────────────────────────────────────────

function AffectationsExistantes() {
  const [filter, setFilter] = useState('all');
  const { data, isLoading } = useAffectations(filter === 'all' ? {} : { specialite_id: filter });
  const affectations = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? '…' : `${data?.meta.total ?? 0} affectation(s)`}
        </p>
        <SpecialiteSelect value={filter} onChange={setFilter} />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : affectations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            <BookOpen className="mb-2 h-8 w-8 opacity-30" />
            Aucune affectation pour ces critères
          </div>
        ) : (
          affectations.map((a) => (
            <div key={a.id} className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">
                    {a.theme?.titre ?? <span className="italic text-muted-foreground">Thème à définir</span>}
                  </span>
                  {a.theme && (
                    <Badge variant={a.theme.type_pfe === 'STARTUP' ? 'default' : 'secondary'} className="text-xs shrink-0">
                      {a.theme.type_pfe}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[11px] text-green-700 border-green-300 shrink-0">
                    {a.type === 'AUTO' ? 'Semi-auto' : 'Manuel'}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {a.encadrant && (
                    <span><GraduationCap className="inline h-3 w-3 mr-0.5" />{a.encadrant.prenom} {a.encadrant.nom}</span>
                  )}
                  <span><Users className="inline h-3 w-3 mr-0.5" />
                    {a.etudiants.map((e) => `${e.etudiant.prenom} ${e.etudiant.nom}`).join(', ')}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 shrink-0">
                {a.theme?.theme_specialites.map((ts) => (
                  <Badge key={ts.specialite.id} variant="outline" className="text-[11px]">{ts.specialite.nom}</Badge>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function GestionAffectations() {
  const { data: enseignants = [] } = useEnseignantsDispo();
  const { data: etudiants = [] } = useEtudiantsSansTheme();

  const [dialog, setDialog] = useState<{
    open: boolean;
    ens?: EnseignantDispo;
    etud?: EtudiantSansTheme;
  }>({ open: false });

  function openDialog(ens?: EnseignantDispo, etud?: EtudiantSansTheme) {
    setDialog({ open: true, ens, etud });
  }

  function closeDialog() {
    setDialog({ open: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des affectations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assignation des thèmes aux étudiants et enseignants pour la session en cours.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <UserCheck className="mr-2 h-4 w-4" />
          Nouvelle affectation
        </Button>
      </div>

      <Tabs defaultValue="disponibilites">
        <TabsList>
          <TabsTrigger value="disponibilites" className="gap-2">
            <Users className="h-4 w-4" />
            Disponibilités
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-2">
            <Zap className="h-4 w-4" />
            Semi-automatique
          </TabsTrigger>
          <TabsTrigger value="existantes" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Affectations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disponibilites" className="mt-6">
          <VueDisponibilites onAffecter={openDialog} />
        </TabsContent>

        <TabsContent value="auto" className="mt-6">
          <SemiAutomatique />
        </TabsContent>

        <TabsContent value="existantes" className="mt-6">
          <AffectationsExistantes />
        </TabsContent>
      </Tabs>

      <AffectationDialog
        open={dialog.open}
        onClose={closeDialog}
        preselectedEnseignant={dialog.ens}
        preselectedEtudiant={dialog.etud}
        allEnseignants={enseignants}
        allEtudiants={etudiants}
      />
    </div>
  );
}
