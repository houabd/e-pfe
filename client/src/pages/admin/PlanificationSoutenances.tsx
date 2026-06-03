import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Calendar, List, Download, Plus, X, ChevronLeft, ChevronRight,
  GraduationCap, User, Users, Clock, MapPin, BookOpen, Pencil, CheckCircle2,
} from 'lucide-react';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import { useAffectations } from '@/hooks/useAffectations';
import {
  useSoutenances, useCreateSoutenance, useUpdateSoutenance,
  useEnseignantsDisponibles, useExportSoutenancesPDF, useExportSoutenancesExcel,
} from '@/hooks/useSoutenances';
import { useMarkAsSoutenu } from '@/hooks/useThemes';
import type { AffectationFull } from '@/services/affectations.api';
import type { SoutenanceFull, EnseignantDispoSoutenance } from '@/services/soutenances.api';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function currentAnneeUniversitaire(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function initials(nom: string, prenom: string) {
  return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase();
}

function Avatar({ nom, prenom }: { nom: string; prenom: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials(nom, prenom)}
    </div>
  );
}

function FullName({ nom, prenom }: { nom: string; prenom: string }) {
  return <>{prenom} {nom}</>;
}

// ─── Filtre spécialité ───────────────────────────────────────────────────────

function SpecialiteSelect({
  value, onChange, placeholder = 'Toutes spécialités',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const { data: specialites = [] } = useActiveSpecialites();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Toutes spécialités</SelectItem>
        {specialites.map((s) => (
          <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── JuryBuilder ─────────────────────────────────────────────────────────────

interface JuryBuilderProps {
  themeId: string;
  date: string;
  heure: string;
  presidentId: string;
  onPresidentChange: (id: string) => void;
  examinateurIds: string[];
  onExaminateursChange: (ids: string[]) => void;
  errors?: { president?: string; examinateurs?: string };
}

function JuryBuilder({
  themeId, date, heure,
  presidentId, onPresidentChange,
  examinateurIds, onExaminateursChange,
  errors,
}: JuryBuilderProps) {
  const canQuery = !!(date && heure);
  const { data: enseignants = [], isLoading } = useEnseignantsDisponibles(
    { date, heure, theme_id: themeId },
    canQuery,
  );

  const allSelectedIds = [presidentId, ...examinateurIds].filter(Boolean);
  const available = enseignants.filter((e) => !allSelectedIds.includes(e.id));

  const findEns = (id: string) => enseignants.find((e) => e.id === id);

  const handleRemoveExaminateur = (id: string) => {
    onExaminateursChange(examinateurIds.filter((e) => e !== id));
  };

  const handleAddExaminateur = (id: string) => {
    if (id && examinateurIds.length < 3 && !examinateurIds.includes(id)) {
      onExaminateursChange([...examinateurIds, id]);
    }
  };

  if (!canQuery) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        Renseignez la date et l'heure pour sélectionner le jury
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  const presEns = presidentId ? findEns(presidentId) : null;

  return (
    <div className="space-y-4">
      {/* Président */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Président du jury <span className="text-destructive">*</span>
        </Label>
        {presEns ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <Avatar nom={presEns.nom} prenom={presEns.prenom} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium"><FullName {...presEns} /></p>
              {presEns.specialite && (
                <p className="text-xs text-muted-foreground">{presEns.specialite.nom}</p>
              )}
            </div>
            <Badge variant="default" className="text-xs shrink-0">Président</Badge>
            <Button
              type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0"
              onClick={() => onPresidentChange('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Select value="" onValueChange={onPresidentChange}>
            <SelectTrigger className={errors?.president ? 'border-destructive' : ''}>
              <SelectValue placeholder="Sélectionner le président…" />
            </SelectTrigger>
            <SelectContent>
              {available.length === 0 ? (
                <div className="py-2 px-3 text-sm text-muted-foreground">Aucun enseignant disponible</div>
              ) : (
                available.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.prenom} {e.nom}{e.specialite ? ` — ${e.specialite.nom}` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
        {errors?.president && (
          <p className="text-xs text-destructive">{errors.president}</p>
        )}
      </div>

      {/* Examinateurs */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Examinateurs ({examinateurIds.length}/3) <span className="text-destructive">*</span>
        </Label>
        <div className="space-y-2">
          {examinateurIds.map((id) => {
            const e = findEns(id);
            if (!e) return null;
            return (
              <div key={id} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <Avatar nom={e.nom} prenom={e.prenom} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium"><FullName {...e} /></p>
                  {e.specialite && (
                    <p className="text-xs text-muted-foreground">{e.specialite.nom}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">Examinateur</Badge>
                <Button
                  type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0"
                  onClick={() => handleRemoveExaminateur(id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
          {examinateurIds.length < 3 && (
            <Select value="" onValueChange={handleAddExaminateur}>
              <SelectTrigger>
                <SelectValue placeholder="Ajouter un examinateur…" />
              </SelectTrigger>
              <SelectContent>
                {available.filter((e) => e.id !== presidentId).length === 0 ? (
                  <div className="py-2 px-3 text-sm text-muted-foreground">Aucun enseignant disponible</div>
                ) : (
                  available
                    .filter((e) => e.id !== presidentId)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.prenom} {e.nom}{e.specialite ? ` — ${e.specialite.nom}` : ''}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>
        {errors?.examinateurs && (
          <p className="text-xs text-destructive">{errors.examinateurs}</p>
        )}
      </div>
    </div>
  );
}

// ─── Schéma formulaire ───────────────────────────────────────────────────────

const formSchema = z.object({
  date_soutenance: z.string().min(1, 'Date requise'),
  heure: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  salle: z.string().min(1, 'Salle requise'),
  annee_universitaire: z.string().min(1, 'Année universitaire requise'),
  president_id: z.string().min(1, 'Président requis'),
  examinateur_ids: z
    .array(z.string())
    .min(1, 'Au moins 1 examinateur requis')
    .max(3, 'Maximum 3 examinateurs'),
});
type FormValues = z.infer<typeof formSchema>;

// ─── Dialog formulaire ───────────────────────────────────────────────────────

interface SoutenanceFormDialogProps {
  open: boolean;
  onClose: () => void;
  affectation?: AffectationFull;
  soutenance?: SoutenanceFull;
}

function SoutenanceFormDialog({
  open, onClose, affectation, soutenance,
}: SoutenanceFormDialogProps) {
  const isEdit = !!soutenance;
  const createMutation = useCreateSoutenance();
  const updateMutation = useUpdateSoutenance();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const themeId = affectation?.theme?.id ?? soutenance?.theme.id ?? '';
  const themeTitle = affectation?.theme?.titre ?? soutenance?.theme.titre ?? '';
  const encadrant = affectation?.encadrant ?? soutenance?.theme.affectation?.encadrant ?? null;
  const etudiants = affectation?.etudiants ?? soutenance?.theme.affectation?.etudiants ?? [];
  const specialites = affectation?.theme?.theme_specialites ?? soutenance?.theme.theme_specialites ?? [];

  const defaultPresident = soutenance?.jury.find((j) => j.role === 'PRESIDENT')?.enseignant.id ?? '';
  const defaultExaminateurs = soutenance?.jury
    .filter((j) => j.role === 'EXAMINATEUR')
    .map((j) => j.enseignant.id) ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date_soutenance: soutenance?.date_soutenance.slice(0, 10) ?? '',
      heure: soutenance?.heure ?? '',
      salle: soutenance?.salle ?? '',
      annee_universitaire: soutenance?.annee_universitaire ?? currentAnneeUniversitaire(),
      president_id: defaultPresident,
      examinateur_ids: defaultExaminateurs,
    },
  });

  const dateVal = watch('date_soutenance');
  const heureVal = watch('heure');
  const presidentId = watch('president_id');
  const examinateurIds = watch('examinateur_ids');

  const onSubmit = (values: FormValues) => {
    const jury = [
      { enseignant_id: values.president_id, role: 'PRESIDENT' as const },
      ...values.examinateur_ids.map((id) => ({ enseignant_id: id, role: 'EXAMINATEUR' as const })),
    ];

    if (isEdit && soutenance) {
      updateMutation.mutate(
        {
          id: soutenance.id,
          dto: {
            date_soutenance: values.date_soutenance,
            heure: values.heure,
            salle: values.salle,
            annee_universitaire: values.annee_universitaire,
            jury,
          },
        },
        { onSuccess: handleClose },
      );
    } else {
      createMutation.mutate(
        {
          theme_id: themeId,
          date_soutenance: values.date_soutenance,
          heure: values.heure,
          salle: values.salle,
          annee_universitaire: values.annee_universitaire,
          jury,
        },
        { onSuccess: handleClose },
      );
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier la soutenance' : 'Planifier une soutenance'}
          </DialogTitle>
        </DialogHeader>

        {/* Info thème (readonly) */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-snug">{themeTitle}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {specialites.map((ts) => (
                  <Badge key={ts.specialite.id} variant="outline" className="text-[11px]">
                    {ts.specialite.nom}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          {encadrant && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>Encadrant :</span>
              <span className="font-medium text-foreground">
                <FullName nom={encadrant.nom} prenom={encadrant.prenom} />
              </span>
            </div>
          )}
          {etudiants.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="shrink-0">Étudiant(s) :</span>
              <span className="font-medium text-foreground">
                {etudiants.map((ae) => (
                  <FullName key={ae.etudiant.id} nom={ae.etudiant.nom} prenom={ae.etudiant.prenom} />
                )).reduce((acc: React.ReactNode[], el, i) => i === 0 ? [el] : [...acc, ', ', el], [])}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Date + heure + salle */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
              <Input id="date" type="date" {...register('date_soutenance')} />
              {errors.date_soutenance && (
                <p className="text-xs text-destructive">{errors.date_soutenance.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="heure">Heure <span className="text-destructive">*</span></Label>
              <Input id="heure" type="time" {...register('heure')} />
              {errors.heure && (
                <p className="text-xs text-destructive">{errors.heure.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salle">Salle <span className="text-destructive">*</span></Label>
              <Input id="salle" placeholder="ex : A101" {...register('salle')} />
              {errors.salle && (
                <p className="text-xs text-destructive">{errors.salle.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="annee">Année universitaire <span className="text-destructive">*</span></Label>
            <Input
              id="annee"
              placeholder="ex : 2024-2025"
              {...register('annee_universitaire')}
              className="max-w-[200px]"
            />
            {errors.annee_universitaire && (
              <p className="text-xs text-destructive">{errors.annee_universitaire.message}</p>
            )}
          </div>

          <Separator />

          {/* Jury */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Composition du jury</h4>
            <JuryBuilder
              themeId={themeId}
              date={dateVal}
              heure={heureVal}
              presidentId={presidentId}
              onPresidentChange={(id) => setValue('president_id', id, { shouldValidate: true })}
              examinateurIds={examinateurIds}
              onExaminateursChange={(ids) => setValue('examinateur_ids', ids, { shouldValidate: true })}
              errors={{
                president: errors.president_id?.message,
                examinateurs: errors.examinateur_ids?.message,
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Planifier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte thème à planifier ─────────────────────────────────────────────────

function ThemeAffecteCard({
  affectation,
  onPlanifier,
}: {
  affectation: AffectationFull;
  onPlanifier: () => void;
}) {
  const theme = affectation.theme!;
  return (
    <div className="flex items-start gap-4 rounded-lg border bg-card p-4 shadow-sm hover:shadow transition-shadow">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2">
          <p className="font-semibold text-sm leading-snug flex-1 min-w-0">{theme.titre}</p>
          <Badge variant="secondary" className="text-xs shrink-0">CLASSIQUE</Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          {theme.theme_specialites.map((ts) => (
            <Badge key={ts.specialite.id} variant="outline" className="text-[11px]">
              {ts.specialite.nom}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {affectation.encadrant && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <FullName nom={affectation.encadrant.nom} prenom={affectation.encadrant.prenom} />
            </span>
          )}
          {affectation.etudiants.length > 0 && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              {affectation.etudiants
                .map((ae) => `${ae.etudiant.prenom} ${ae.etudiant.nom}`)
                .join(', ')}
            </span>
          )}
        </div>
      </div>
      <Button size="sm" onClick={onPlanifier} className="shrink-0">
        <Plus className="h-3.5 w-3.5 mr-1" />
        Planifier
      </Button>
    </div>
  );
}

// ─── Vue liste planning ───────────────────────────────────────────────────────

function ListePlanning({
  soutenances,
  onEdit,
  onMarquerSoutenu,
}: {
  soutenances: SoutenanceFull[];
  onEdit: (s: SoutenanceFull) => void;
  onMarquerSoutenu: (themeId: string, isSoutenu: boolean) => void;
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, SoutenanceFull[]>();
    for (const s of soutenances) {
      const key = s.date_soutenance.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [soutenances]);

  if (soutenances.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Calendar className="mx-auto h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm">Aucune soutenance planifiée</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {[...byDate.entries()].map(([dateStr, items]) => {
        const dateLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
        return (
          <div key={dateStr}>
            <h3 className="text-sm font-semibold capitalize text-muted-foreground mb-2 sticky top-0 bg-background py-1">
              {dateLabel}
            </h3>
            <div className="space-y-2">
              {items.map((s) => {
                const president = s.jury.find((j) => j.role === 'PRESIDENT');
                const examinateurs = s.jury.filter((j) => j.role === 'EXAMINATEUR');
                return (
                  <div
                    key={s.id}
                    className="rounded-lg border bg-card p-4 grid grid-cols-[auto_1fr_auto] gap-4 items-start"
                  >
                    {/* Heure + salle */}
                    <div className="text-center min-w-[56px]">
                      <p className="text-lg font-bold text-primary">{s.heure}</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                        <MapPin className="h-3 w-3" />{s.salle}
                      </p>
                    </div>

                    {/* Infos */}
                    <div className="min-w-0 space-y-1.5">
                      <p className="font-semibold text-sm truncate">{s.theme.titre}</p>
                      <div className="flex flex-wrap gap-1">
                        {s.theme.theme_specialites.map((ts) => (
                          <Badge key={ts.specialite.id} variant="outline" className="text-[11px]">
                            {ts.specialite.nom}
                          </Badge>
                        ))}
                      </div>
                      {s.theme.affectation?.etudiants && s.theme.affectation.etudiants.length > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          {s.theme.affectation.etudiants
                            .map((ae) => `${ae.etudiant.prenom} ${ae.etudiant.nom}`)
                            .join(', ')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {president && (
                          <Badge variant="default" className="text-[11px]">
                            Président : {president.enseignant.prenom} {president.enseignant.nom}
                          </Badge>
                        )}
                        {examinateurs.map((j) => (
                          <Badge key={j.enseignant.id} variant="secondary" className="text-[11px]">
                            {j.enseignant.prenom} {j.enseignant.nom}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {s.theme.is_soutenu ? (
                        <>
                          <Badge variant="default" className="text-[11px] bg-green-600 hover:bg-green-600 shrink-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Soutenu
                          </Badge>
                          <Button
                            size="sm" variant="ghost"
                            className="text-xs h-7 text-muted-foreground"
                            onClick={() => onMarquerSoutenu(s.theme.id, false)}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm" variant="outline"
                          className="text-xs h-7 border-green-600 text-green-700 hover:bg-green-50 shrink-0"
                          onClick={() => onMarquerSoutenu(s.theme.id, true)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Marquer soutenu
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Vue calendrier ───────────────────────────────────────────────────────────

function CalendrierMensuel({
  soutenances,
  onEdit,
}: {
  soutenances: SoutenanceFull[];
  onEdit: (s: SoutenanceFull) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, SoutenanceFull[]>();
    for (const s of soutenances) {
      const key = s.date_soutenance.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [soutenances]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const selectedSoutenances = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost" size="sm"
          onClick={() => { setCurrentMonth(new Date(year, month - 1, 1)); setSelectedDate(null); }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold capitalize">{monthLabel}</h3>
        <Button
          variant="ghost" size="sm"
          onClick={() => { setCurrentMonth(new Date(year, month + 1, 1)); setSelectedDate(null); }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* En-têtes jours */}
      <div className="grid grid-cols-7 gap-1">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="min-h-[72px]" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const daySoutenances = byDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={[
                'min-h-[72px] rounded-lg border p-1.5 text-left transition-colors hover:border-primary/50',
                isToday ? 'border-primary bg-primary/5' : 'border-border',
                isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary' : '',
              ].join(' ')}
            >
              <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-primary' : ''}`}>
                {day}
              </div>
              {daySoutenances.slice(0, 2).map((s) => (
                <div
                  key={s.id}
                  className="mb-0.5 truncate rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                >
                  {s.heure} {s.theme.titre.slice(0, 14)}…
                </div>
              ))}
              {daySoutenances.length > 2 && (
                <div className="text-[10px] text-muted-foreground">
                  +{daySoutenances.length - 2} autre(s)
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Détail du jour sélectionné */}
      {selectedDate && selectedSoutenances.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <h4 className="font-semibold text-sm">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </h4>
          {selectedSoutenances.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="text-sm font-bold text-primary w-12 shrink-0">{s.heure}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.theme.titre}</p>
                <p className="text-xs text-muted-foreground">Salle {s.salle}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onEdit(s)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {selectedDate && selectedSoutenances.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-2">
          Aucune soutenance ce jour
        </p>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PlanificationSoutenances() {
  const [specialiteId, setSpecialiteId] = useState('all');
  const [anneeFilter, setAnneeFilter] = useState('');
  const [planningView, setPlanningView] = useState<'liste' | 'calendrier'>('liste');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAffectation, setSelectedAffectation] = useState<AffectationFull | undefined>();
  const [selectedSoutenance, setSelectedSoutenance] = useState<SoutenanceFull | undefined>();

  const soutenanceFilters = {
    annee_universitaire: anneeFilter || undefined,
    specialite_id: specialiteId !== 'all' ? specialiteId : undefined,
    limit: 1000,
  };

  const { data: soutenancesResult, isLoading: loadingSoutenances } = useSoutenances(soutenanceFilters);
  const { data: affectationsResult, isLoading: loadingAff } = useAffectations(
    specialiteId !== 'all'
      ? { specialite_id: specialiteId, limit: 500 }
      : { limit: 500 },
  );
  const exportPDF = useExportSoutenancesPDF();
  const exportExcel = useExportSoutenancesExcel();
  const markAsSoutenuMutation = useMarkAsSoutenu();

  const soutenances = soutenancesResult?.data ?? [];
  const affectations = affectationsResult?.data ?? [];

  const plannedThemeIds = useMemo(
    () => new Set(soutenances.map((s) => s.theme.id)),
    [soutenances],
  );

  const themesAPlannifier = useMemo(
    () =>
      affectations.filter(
        (a) =>
          a.theme !== null &&
          a.theme.type_pfe === 'CLASSIQUE' &&
          !plannedThemeIds.has(a.theme.id),
      ),
    [affectations, plannedThemeIds],
  );

  const handlePlanifier = (aff: AffectationFull) => {
    setSelectedAffectation(aff);
    setSelectedSoutenance(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (s: SoutenanceFull) => {
    setSelectedSoutenance(s);
    setSelectedAffectation(undefined);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAffectation(undefined);
    setSelectedSoutenance(undefined);
  };

  const exportFilters = {
    annee_universitaire: anneeFilter || undefined,
    specialite_id: specialiteId !== 'all' ? specialiteId : undefined,
  };

  const isExporting = exportPDF.isPending || exportExcel.isPending;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Planification des Soutenances</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {soutenances.length} soutenance(s) planifiée(s) · {themesAPlannifier.length} thème(s) en attente
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={anneeFilter}
            onChange={(e) => setAnneeFilter(e.target.value)}
            placeholder="ex : 2025-2026"
            className="w-[140px]"
          />
          <SpecialiteSelect value={specialiteId} onChange={setSpecialiteId} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExcel.mutate(exportFilters)}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportPDF.mutate(exportFilters)}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-1.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="planifier">
        <TabsList>
          <TabsTrigger value="planifier" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Thèmes à planifier
            {themesAPlannifier.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center">
                {themesAPlannifier.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="planning" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Planning
          </TabsTrigger>
        </TabsList>

        {/* Onglet : Thèmes à planifier */}
        <TabsContent value="planifier" className="mt-4">
          {loadingAff ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : themesAPlannifier.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <GraduationCap className="mx-auto h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Tous les thèmes affectés sont planifiés</p>
              <p className="text-xs mt-1">Aucun thème classique en attente de soutenance</p>
            </div>
          ) : (
            <div className="space-y-3">
              {themesAPlannifier.map((aff) => (
                <ThemeAffecteCard
                  key={aff.id}
                  affectation={aff}
                  onPlanifier={() => handlePlanifier(aff)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Onglet : Planning */}
        <TabsContent value="planning" className="mt-4">
          <div className="space-y-4">
            {/* Toggle vue */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {soutenances.length} soutenance(s)
              </p>
              <div className="flex rounded-lg border p-0.5 bg-muted gap-0.5">
                <Button
                  size="sm"
                  variant={planningView === 'liste' ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setPlanningView('liste')}
                >
                  <List className="h-3.5 w-3.5 mr-1" />Liste
                </Button>
                <Button
                  size="sm"
                  variant={planningView === 'calendrier' ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setPlanningView('calendrier')}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" />Calendrier
                </Button>
              </div>
            </div>

            {loadingSoutenances ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
              </div>
            ) : planningView === 'liste' ? (
              <ListePlanning
                soutenances={soutenances}
                onEdit={handleEdit}
                onMarquerSoutenu={(themeId, isSoutenu) =>
                  markAsSoutenuMutation.mutate({ id: themeId, isSoutenu })
                }
              />
            ) : (
              <CalendrierMensuel soutenances={soutenances} onEdit={handleEdit} />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog création / édition */}
      <SoutenanceFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        affectation={selectedAffectation}
        soutenance={selectedSoutenance}
      />
    </div>
  );
}
