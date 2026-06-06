import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, Trash2, CheckCircle2, XCircle,
  BookOpen, Rocket, Tag, X, ChevronDown, Shield, GraduationCap, Download, Info,
  MessageSquarePlus, Check, Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useThemes, useValidateTheme, useMarkAsSoutenu,
  useDeleteTheme, useCreateThemeAsAdmin, useExportThemes,
  useDemandesModification, useTraiterDemandeModification,
} from '@/hooks/useThemes';
import { ThemeDetailDialog } from '@/components/themes/ThemeDetailDialog';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import { api } from '@/services/api';
import type { Theme, SousTypeTheme, CreateThemeForm, User, DemandeModification } from '@/types';

const SUPERVISOR_ROLES = ['ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'];

// ─── Schéma Zod ───────────────────────────────────────────────────────────────

const themeSchema = z.object({
  titre: z.string().min(5, 'Titre trop court (min 5 caractères)'),
  description: z.string().min(20, 'Description trop courte (min 20 caractères)'),
  mots_cles: z.array(z.string()).default([]),
  necessite_stage: z.boolean().default(false),
  type_pfe: z.enum(['CLASSIQUE', 'STARTUP']),
  sous_types: z.array(z.enum(['RECHERCHE', 'PROFESSIONNEL'])).default([]),
  specialite_ids: z.array(z.string()).min(1, 'Choisir au moins une spécialité'),
  encadrant_id: z.string().optional(),
  encadrant_externe: z.object({
    nom: z.string().min(1, 'Requis'),
    prenom: z.string().min(1, 'Requis'),
    email: z.string().email('Email invalide'),
    institution: z.string().min(1, 'Requis'),
  }).optional(),
  besoin_encadrant: z.boolean().default(false),
  cherche_binome: z.boolean().default(false),
  propose_par_id: z.string().optional(),
}).refine(
  (d) => !(d.type_pfe === 'STARTUP' && d.sous_types.length > 0),
  { message: 'Un thème STARTUP ne peut pas avoir de sous-types', path: ['sous_types'] },
).refine(
  (d) => !(d.type_pfe === 'CLASSIQUE' && d.sous_types.length === 0),
  { message: 'Un thème CLASSIQUE doit avoir au moins un sous-type', path: ['sous_types'] },
);

type ThemeFormValues = z.infer<typeof themeSchema>;

// ─── Badges ───────────────────────────────────────────────────────────────────

function ValidationBadge({ theme }: { theme: Theme }) {
  if (theme.is_soutenu)
    return <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">Soutenu</Badge>;
  if (theme.is_affecte)
    return <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">Affecté</Badge>;
  if (theme.statut_validation === 'VALIDE')
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Validé</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">En attente</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  return type === 'STARTUP'
    ? <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs gap-1"><Rocket className="h-3 w-3" />Startup</Badge>
    : <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs gap-1"><BookOpen className="h-3 w-3" />Classique</Badge>;
}

// ─── Dialog Valider ───────────────────────────────────────────────────────────

function ValidateDialog({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const validate = useValidateTheme();

  const onConfirm = async () => {
    await validate.mutateAsync({ id: theme.id, action: 'VALIDE' });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Valider le thème
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Confirmer la validation de ce thème ?</p>
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="font-medium line-clamp-2">{theme.titre}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Proposé par {theme.propose_par.prenom} {theme.propose_par.nom}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Le proposant recevra une notification. Le thème deviendra visible aux étudiants pour sélection.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={onConfirm}
            disabled={validate.isPending}
          >
            {validate.isPending ? 'Validation...' : 'Valider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Refuser ───────────────────────────────────────────────────────────

function RefuseDialog({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const [motif, setMotif] = useState('');
  const refuse = useValidateTheme();

  const onConfirm = async () => {
    await refuse.mutateAsync({ id: theme.id, action: 'REFUSE', motif: motif || undefined });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Refuser le thème
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="font-medium line-clamp-2">{theme.titre}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Proposé par {theme.propose_par.prenom} {theme.propose_par.nom}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motif">Motif du refus (optionnel)</Label>
            <Textarea
              id="motif"
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Expliquez la raison du refus..."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Le proposant recevra une notification avec le motif s'il est renseigné.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={refuse.isPending}>
            {refuse.isPending ? 'Refus...' : 'Refuser'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Marquer soutenu ───────────────────────────────────────────────────

function SoutenanceDialog({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const markSoutenu = useMarkAsSoutenu();

  const onConfirm = async () => {
    await markSoutenu.mutateAsync(theme.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-slate-600" />
            Marquer comme soutenu
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Confirmer que la soutenance de ce thème a eu lieu ?</p>
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="font-medium line-clamp-2">{theme.titre}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Proposé par {theme.propose_par.prenom} {theme.propose_par.nom}
            </p>
          </div>
          <p className="text-xs text-destructive">Cette action est irréversible.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={onConfirm} disabled={markSoutenu.isPending}>
            {markSoutenu.isPending ? 'Enregistrement...' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Supprimer ─────────────────────────────────────────────────────────

function DeleteDialog({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const deleteTheme = useDeleteTheme();

  const onConfirm = async () => {
    await deleteTheme.mutateAsync(theme.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Supprimer le thème
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="font-medium line-clamp-2">{theme.titre}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Proposé par {theme.propose_par.prenom} {theme.propose_par.nom}
            </p>
          </div>
          <p className="text-destructive font-medium">Cette action est irréversible.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleteTheme.isPending}>
            {deleteTheme.isPending ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Formulaire admin (ajouter un thème) ─────────────────────────────────────

function AdminThemeFormDialog({
  open, onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: specialites } = useActiveSpecialites();
  const [enseignants, setEnseignants] = useState<User[]>([]);
  const [motCleInput, setMotCleInput] = useState('');
  const [showExterne, setShowExterne] = useState(false);

  useEffect(() => {
    api.get<{ data: User[] }>('/users', { params: { limit: 500 } })
      .then((res) => setEnseignants(res.data.data.filter((u) => SUPERVISOR_ROLES.includes(u.role))))
      .catch((err) => console.error('[AdminGestionThemes] Erreur chargement enseignants:', err));
  }, []);

  const createAdmin = useCreateThemeAsAdmin();

  const defaultValues: ThemeFormValues = {
    titre: '', description: '', mots_cles: [], necessite_stage: false,
    type_pfe: 'CLASSIQUE', sous_types: [], specialite_ids: [],
    besoin_encadrant: false, cherche_binome: false,
  };

  const {
    register, handleSubmit, control, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<ThemeFormValues>({ resolver: zodResolver(themeSchema), defaultValues });

  const typePfe = watch('type_pfe');
  const motsCles = watch('mots_cles');
  const specialiteIds = watch('specialite_ids');
  const sousTypes = watch('sous_types');
  const besoinEncadrant = watch('besoin_encadrant');

  const addMotCle = () => {
    const val = motCleInput.trim();
    if (val && !motsCles.includes(val)) { setValue('mots_cles', [...motsCles, val]); setMotCleInput(''); }
  };

  const toggleSpecialite = (id: string) =>
    setValue('specialite_ids',
      specialiteIds.includes(id) ? specialiteIds.filter((s) => s !== id) : [...specialiteIds, id]);

  const toggleSousType = (st: SousTypeTheme) =>
    setValue('sous_types',
      sousTypes.includes(st) ? sousTypes.filter((s) => s !== st) : [...sousTypes, st]);

  const onSubmit = async (values: ThemeFormValues) => {
    if (!values.propose_par_id) return;
    const base: CreateThemeForm = {
      ...values,
      besoin_encadrant: values.besoin_encadrant ?? false,
      cherche_binome: values.cherche_binome ?? false,
      encadrant_id: values.besoin_encadrant ? undefined : values.encadrant_id,
      encadrant_externe: showExterne ? values.encadrant_externe : undefined,
    };
    await createAdmin.mutateAsync({ ...base, propose_par_id: values.propose_par_id });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Ajouter un thème
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Proposé par */}
          <div className="space-y-1.5">
            <Label>
              Proposé par <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="propose_par_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un enseignant..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sélectionner...</SelectItem>
                    {enseignants.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.prenom} {e.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.propose_par_id && (
              <p className="text-xs text-destructive">{errors.propose_par_id.message}</p>
            )}
          </div>

          {/* Type PFE */}
          <div className="space-y-2">
            <Label>Type de PFE</Label>
            <Controller
              name="type_pfe"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {(['CLASSIQUE', 'STARTUP'] as const).map((t) => (
                    <button
                      key={t} type="button"
                      onClick={() => { field.onChange(t); if (t === 'STARTUP') setValue('sous_types', []); }}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        field.value === t
                          ? t === 'STARTUP' ? 'border-orange-400 bg-orange-50' : 'border-blue-400 bg-blue-50'
                          : 'border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      {t === 'STARTUP'
                        ? <Rocket className="h-5 w-5 text-orange-500 shrink-0" />
                        : <BookOpen className="h-5 w-5 text-blue-500 shrink-0" />}
                      <div>
                        <div className="font-semibold text-sm">{t === 'STARTUP' ? 'Startup' : 'Classique'}</div>
                        <div className="text-xs text-muted-foreground">
                          {t === 'STARTUP' ? "Jusqu'à 6 étudiants" : 'Recherche / Professionnel'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Sous-types */}
          {typePfe === 'CLASSIQUE' && (
            <div className="space-y-2">
              <Label>Sous-type(s) <span className="text-destructive">*</span></Label>
              <div className="flex gap-3 flex-wrap">
                {(['RECHERCHE', 'PROFESSIONNEL'] as const).map((st) => (
                  <button
                    key={st} type="button" onClick={() => toggleSousType(st)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      sousTypes.includes(st)
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    {st === 'RECHERCHE' ? 'Recherche' : 'Professionnel'}
                  </button>
                ))}
                <p className="w-full text-xs text-muted-foreground mt-1">
                  Vous pouvez sélectionner les deux options simultanément.
                </p>
              </div>
              {errors.sous_types && <p className="text-xs text-destructive">{errors.sous_types.message as string}</p>}
            </div>
          )}

          {/* Titre */}
          <div className="space-y-1.5">
            <Label htmlFor="titre">Titre <span className="text-destructive">*</span></Label>
            <Input id="titre" {...register('titre')} placeholder="Titre du projet" />
            {errors.titre && <p className="text-xs text-destructive">{errors.titre.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
            <Textarea id="description" rows={4} {...register('description')}
              placeholder="Objectifs, problématique, technologies envisagées..." />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          {/* Spécialités */}
          <div className="space-y-2">
            <Label>Spécialités <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-2">
              {specialites?.map((s) => (
                <button
                  key={s.id} type="button" onClick={() => toggleSpecialite(s.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                    specialiteIds.includes(s.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  {s.nom}
                </button>
              ))}
            </div>
            {errors.specialite_ids && <p className="text-xs text-destructive">{errors.specialite_ids.message}</p>}
          </div>

          {/* Mots-clés */}
          <div className="space-y-2">
            <Label>Mots-clés</Label>
            <div className="flex gap-2">
              <Input
                value={motCleInput} onChange={(e) => setMotCleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMotCle(); } }}
                placeholder="Appuyer sur Entrée pour ajouter"
              />
              <Button type="button" variant="outline" onClick={addMotCle}><Tag className="h-4 w-4" /></Button>
            </div>
            {motsCles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {motsCles.map((mc) => (
                  <span key={mc} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-sm">
                    {mc}
                    <button type="button" onClick={() => setValue('mots_cles', motsCles.filter((m) => m !== mc))}>
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Encadrant interne */}
          <div className="space-y-1.5">
            <Label>Encadrant interne (optionnel)</Label>
            <Controller
              name="encadrant_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                  disabled={besoinEncadrant}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={besoinEncadrant ? 'Désactivé' : 'Sélectionner...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {enseignants.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Encadrant externe */}
          <div>
            <button
              type="button"
              onClick={() => setShowExterne(!showExterne)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showExterne ? 'rotate-180' : ''}`} />
              {showExterne ? 'Masquer' : 'Ajouter'} un encadrant externe
            </button>
            {showExterne && (
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-4">
                {(['nom', 'prenom', 'email', 'institution'] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs capitalize">{field}</Label>
                    <Input {...register(`encadrant_externe.${field}`)}
                      placeholder={field === 'email' ? 'email@institution.dz' : field === 'institution' ? 'Université / Entreprise' : ''} />
                    {errors.encadrant_externe?.[field] && (
                      <p className="text-xs text-destructive">{errors.encadrant_externe[field]?.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Options</Label>
            <div className="space-y-2.5">
              {([
                ['necessite_stage', 'Nécessite un stage en entreprise'],
                ['besoin_encadrant', 'Recherche un encadrant (désactive la sélection ci-dessus)'],
                ['cherche_binome', 'Ouvert pour former un binôme'],
              ] as const).map(([fieldName, label]) => (
                <div key={fieldName} className="flex items-center gap-2.5">
                  <Controller
                    name={fieldName}
                    control={control}
                    render={({ field: f }) => (
                      <Checkbox
                        id={fieldName} checked={f.value}
                        onCheckedChange={(v) => {
                          f.onChange(v);
                          if (fieldName === 'besoin_encadrant' && v) setValue('encadrant_id', undefined);
                        }}
                      />
                    )}
                  />
                  <Label htmlFor={fieldName} className="font-normal cursor-pointer text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ligne thème ──────────────────────────────────────────────────────────────

function ThemeRow({
  theme,
  onValidate,
  onRefuse,
  onSoutenu,
  onDelete,
  onView,
}: {
  theme: Theme;
  onValidate: (t: Theme) => void;
  onRefuse: (t: Theme) => void;
  onSoutenu: (t: Theme) => void;
  onDelete: (t: Theme) => void;
  onView: (id: string) => void;
}) {
  const canValidate = theme.statut_validation === 'NON_VALIDE' && !theme.is_affecte;
  const canSoutenu = theme.statut_validation === 'VALIDE' && theme.is_affecte && !theme.is_soutenu;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 rounded-xl border bg-card px-5 py-4 hover:shadow-sm transition-shadow">
      {/* Icône type */}
      <div className={`rounded-lg p-2 shrink-0 mt-0.5 ${
        theme.type_pfe === 'STARTUP' ? 'bg-orange-100' : 'bg-blue-100'
      }`}>
        {theme.type_pfe === 'STARTUP'
          ? <Rocket className="h-4 w-4 text-orange-600" />
          : <BookOpen className="h-4 w-4 text-blue-600" />}
      </div>

      {/* Contenu principal */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="font-semibold text-sm leading-snug line-clamp-2">{theme.titre}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {theme.propose_par.prenom} {theme.propose_par.nom}
            {theme.encadrant && (
              <span className="ml-2">· Encadrant : {theme.encadrant.prenom} {theme.encadrant.nom}</span>
            )}
            <span className="ml-2">· {theme.session.annee_universitaire}</span>
          </span>
          {theme.propose_par.role === 'ETUDIANT' ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">Étudiant</span>
          ) : (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">Enseignant</span>
          )}
        </div>

        {/* Spécialités */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {theme.theme_specialites.map(({ specialite }) => (
            <span key={specialite.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              {specialite.nom}
            </span>
          ))}
          {theme.sous_types.map((st) => (
            <Badge key={st} variant="outline" className="text-xs py-0">
              {st === 'RECHERCHE' ? 'Recherche' : 'Professionnel'}
            </Badge>
          ))}
        </div>

        {/* Flags */}
        <div className="flex gap-3 text-xs flex-wrap">
          {theme.necessite_stage && <span className="text-amber-600 font-medium">Stage requis</span>}
          {theme.besoin_encadrant && <span className="text-blue-600 font-medium">Cherche encadrant</span>}
          {theme.cherche_binome && <span className="text-purple-600 font-medium">Cherche binôme</span>}
        </div>
      </div>

      {/* Badges statut + actions */}
      <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
        <div className="flex gap-1.5 flex-wrap justify-end">
          <TypeBadge type={theme.type_pfe} />
          <ValidationBadge theme={theme} />
        </div>

        <div className="flex gap-1.5 flex-wrap justify-end mt-1">
          {canValidate && (
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onValidate(theme)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Valider
            </Button>
          )}
          {canValidate && (
            <Button
              size="sm" variant="outline"
              className="h-7 px-2.5 text-xs text-destructive hover:text-destructive border-destructive/30"
              onClick={() => onRefuse(theme)}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />Refuser
            </Button>
          )}
          {canSoutenu && (
            <Button
              size="sm" variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => onSoutenu(theme)}
            >
              <GraduationCap className="h-3.5 w-3.5 mr-1" />Soutenu
            </Button>
          )}
          <Button
            size="sm" variant="outline"
            className="h-7 px-2.5 text-xs gap-1"
            onClick={() => onView(theme.id)}
          >
            <Info className="h-3.5 w-3.5" />Détails
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-7 px-2.5 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(theme)}
            disabled={theme.is_affecte}
            title={theme.is_affecte ? 'Thème affecté, non supprimable' : ''}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

type QuickFilter = 'tous' | 'attente' | 'valides' | 'affectes' | 'non-affectes';

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'attente', label: 'En attente' },
  { key: 'valides', label: 'Validés' },
  { key: 'affectes', label: 'Affectés' },
  { key: 'non-affectes', label: 'Non affectés' },
];

// ─── Traitement d'une demande de modification ─────────────────────────────────

function TraiterDemandeDialog({
  demande, onClose,
}: { demande: DemandeModification; onClose: () => void }) {
  const [commentaire, setCommentaire] = useState('');
  const traiter = useTraiterDemandeModification();

  const handle = async (decision: 'ACCEPTED' | 'REFUSED') => {
    await traiter.mutateAsync({ demandeId: demande.id, decision, commentaire: commentaire.trim() || undefined });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Traiter la demande de modification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <p><span className="text-muted-foreground">Thème :</span> <span className="font-medium">{demande.theme.titre}</span></p>
            <p><span className="text-muted-foreground">Enseignant :</span> {demande.demandeur.prenom} {demande.demandeur.nom}</p>
            <p className="text-muted-foreground">Motif :</p>
            <p className="whitespace-pre-wrap rounded bg-background border px-3 py-2">{demande.motif}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
            <Textarea
              id="commentaire"
              placeholder="Ajoutez une explication à votre décision…"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/5 gap-1.5"
            disabled={traiter.isPending}
            onClick={() => handle('REFUSED')}
          >
            <Ban className="h-4 w-4" />Refuser
          </Button>
          <Button
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            disabled={traiter.isPending}
            onClick={() => handle('ACCEPTED')}
          >
            <Check className="h-4 w-4" />Autoriser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Section demandes de modification ────────────────────────────────────────

function DemandesModificationSection() {
  const { data: demandes = [], isLoading } = useDemandesModification('PENDING');
  const [traiterTarget, setTraiterTarget] = useState<DemandeModification | null>(null);

  if (isLoading) return null;
  if (demandes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="h-5 w-5 text-amber-600" />
        <h2 className="font-semibold text-amber-800">
          Demandes de modification en attente
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {demandes.length}
          </span>
        </h2>
      </div>
      <div className="divide-y rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
        {demandes.map((d) => (
          <div key={d.id} className="flex items-start gap-4 p-4">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-semibold truncate">{d.theme.titre}</p>
              <p className="text-xs text-muted-foreground">
                {d.demandeur.prenom} {d.demandeur.nom} · {new Date(d.created_at).toLocaleDateString('fr-FR')}
              </p>
              <p className="text-sm text-foreground/80 line-clamp-2">{d.motif}</p>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => setTraiterTarget(d)}
            >
              Traiter
            </Button>
          </div>
        ))}
      </div>
      {traiterTarget && <TraiterDemandeDialog demande={traiterTarget} onClose={() => setTraiterTarget(null)} />}
    </div>
  );
}

export default function GestionThemes() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSpecialite, setFilterSpecialite] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('tous');
  const [page, setPage] = useState(1);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [validateTarget, setValidateTarget] = useState<Theme | null>(null);
  const [refuseTarget, setRefuseTarget] = useState<Theme | null>(null);
  const [soutenanceTarget, setSoutenanceTarget] = useState<Theme | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Theme | null>(null);
  const [detailThemeId, setDetailThemeId] = useState<string | null>(null);

  const { data: specialites } = useActiveSpecialites();

  const apiFilters = {
    search: search || undefined,
    type_pfe: (filterType || undefined) as 'CLASSIQUE' | 'STARTUP' | undefined,
    statut_validation:
      quickFilter === 'attente' ? ('NON_VALIDE' as const) :
      quickFilter === 'valides'  ? ('VALIDE'    as const) :
      undefined,
    is_affecte:
      quickFilter === 'affectes'     ? true  :
      quickFilter === 'non-affectes' ? false :
      undefined,
    specialite_id: filterSpecialite || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useThemes(apiFilters);
  const themes: Theme[] = (data?.data as Theme[]) ?? [];
  const meta = data?.meta;
  const exportThemes = useExportThemes();

  const handleExport = (format: 'excel' | 'pdf') => {
    const { page: _p, limit: _l, ...exportFilters } = apiFilters;
    exportThemes.mutate({ format, filters: exportFilters });
  };

  const stats = {
    total: meta?.total ?? themes.length,
    enAttente: themes.filter((t) => t.statut_validation === 'NON_VALIDE').length,
    valides: themes.filter((t) => t.statut_validation === 'VALIDE').length,
    affectes: themes.filter((t) => t.is_affecte).length,
    soutenus: themes.filter((t) => t.is_soutenu).length,
  };

  const resetFiltersAndPage = () => setPage(1);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suivi des thèmes PFE</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {meta?.total ?? '–'} thème{(meta?.total ?? 0) !== 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={exportThemes.isPending}>
            <Download className="h-4 w-4" />Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={exportThemes.isPending}>
            <Download className="h-4 w-4" />PDF
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />Ajouter un thème
          </Button>
        </div>
      </div>

      <DemandesModificationSection />

      {/* Filtres rapides */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setQuickFilter(key); resetFiltersAndPage(); }}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
              quickFilter === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher par titre, mots-clés..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetFiltersAndPage(); }}
          />
        </div>
        <Select value={filterType || '__all__'} onValueChange={(v) => { setFilterType(v === '__all__' ? '' : v); resetFiltersAndPage(); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les types</SelectItem>
            <SelectItem value="CLASSIQUE">Classique</SelectItem>
            <SelectItem value="STARTUP">Startup</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSpecialite || '__all__'} onValueChange={(v) => { setFilterSpecialite(v === '__all__' ? '' : v); resetFiltersAndPage(); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Spécialité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes les spécialités</SelectItem>
            {specialites?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Résumé de la page */}
      {!isLoading && themes.length > 0 && (
        <div className="flex gap-4 text-xs text-muted-foreground px-1">
          <span>{stats.enAttente} en attente</span>
          <span>·</span>
          <span>{stats.valides} validé{stats.valides !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{stats.affectes} affecté{stats.affectes !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{stats.soutenus} soutenu{stats.soutenus !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : themes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">Aucun thème trouvé</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            Aucun thème ne correspond aux filtres sélectionnés.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {themes.map((theme) => (
            <ThemeRow
              key={theme.id}
              theme={theme}
              onValidate={setValidateTarget}
              onRefuse={setRefuseTarget}
              onSoutenu={setSoutenanceTarget}
              onDelete={setDeleteTarget}
              onView={setDetailThemeId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} sur {meta.totalPages} · {meta.total} thème{meta.total !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ThemeDetailDialog themeId={detailThemeId} onClose={() => setDetailThemeId(null)} />
      {addDialogOpen && (
        <AdminThemeFormDialog open onClose={() => setAddDialogOpen(false)} />
      )}
      {validateTarget && <ValidateDialog theme={validateTarget} onClose={() => setValidateTarget(null)} />}
      {refuseTarget && <RefuseDialog theme={refuseTarget} onClose={() => setRefuseTarget(null)} />}
      {soutenanceTarget && <SoutenanceDialog theme={soutenanceTarget} onClose={() => setSoutenanceTarget(null)} />}
      {deleteTarget && <DeleteDialog theme={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}
