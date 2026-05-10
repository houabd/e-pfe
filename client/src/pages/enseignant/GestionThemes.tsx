import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Pencil, Trash2, CheckCircle, Clock,
  BookOpen, Rocket, Tag, Mail, X, ChevronDown,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMyThemes, useCreateTheme, useUpdateTheme, useRespFiliereInfo } from '@/hooks/useThemes';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import { useUsers } from '@/hooks/useUsers';
import type { Theme, SousTypeTheme, CreateThemeForm } from '@/types';

// ─── Schéma Zod ───────────────────────────────────────────────────────────────

const themeSchema = z.object({
  titre: z.string().min(5, 'Titre trop court (min 5 caractères)'),
  description: z.string().min(20, 'Description trop courte (min 20 caractères)'),
  mots_cles: z.array(z.string()).default([]),
  necessite_stage: z.boolean().default(false),
  type_pfe: z.enum(['CLASSIQUE', 'STARTUP']),
  sous_types: z.array(z.enum(['RECHERCHE', 'PROFESSIONNEL', 'LES_DEUX'])).default([]),
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
}).refine(
  (d) => !(d.type_pfe === 'STARTUP' && d.sous_types.length > 0),
  { message: 'Un thème STARTUP ne peut pas avoir de sous-types', path: ['sous_types'] },
).refine(
  (d) => !(d.type_pfe === 'CLASSIQUE' && d.sous_types.length === 0),
  { message: 'Un thème CLASSIQUE doit avoir au moins un sous-type', path: ['sous_types'] },
);

type ThemeFormValues = z.infer<typeof themeSchema>;

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatutBadge({ theme }: { theme: Theme }) {
  if (theme.is_affecte)
    return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Affecté</Badge>;
  if (theme.statut_validation === 'VALIDE')
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Validé</Badge>;
  return <Badge variant="outline" className="text-amber-600 border-amber-300">En attente</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  return type === 'STARTUP'
    ? <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1"><Rocket className="h-3 w-3" />Startup</Badge>
    : <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><BookOpen className="h-3 w-3" />Classique</Badge>;
}

// ─── Formulaire ───────────────────────────────────────────────────────────────

function ThemeFormDialog({
  open, onClose, editingTheme,
}: {
  open: boolean;
  onClose: () => void;
  editingTheme: Theme | null;
}) {
  const { data: specialites } = useActiveSpecialites();
  const { data: enseignantsData } = useUsers({ role: 'ENSEIGNANT', limit: 200 });
  const enseignants = enseignantsData?.data ?? [];
  const [motCleInput, setMotCleInput] = useState('');
  const [showExterne, setShowExterne] = useState(!!editingTheme?.encadrant_externe);

  const createTheme = useCreateTheme();
  const updateTheme = useUpdateTheme();

  const defaultValues: ThemeFormValues = editingTheme
    ? {
        titre: editingTheme.titre,
        description: editingTheme.description,
        mots_cles: editingTheme.mots_cles,
        necessite_stage: editingTheme.necessite_stage,
        type_pfe: editingTheme.type_pfe,
        sous_types: editingTheme.sous_types as SousTypeTheme[],
        specialite_ids: editingTheme.theme_specialites.map((ts) => ts.specialite.id),
        encadrant_id: editingTheme.encadrant?.id,
        encadrant_externe: editingTheme.encadrant_externe ?? undefined,
        besoin_encadrant: editingTheme.besoin_encadrant,
        cherche_binome: editingTheme.cherche_binome,
      }
    : {
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
    if (val && !motsCles.includes(val)) {
      setValue('mots_cles', [...motsCles, val]);
      setMotCleInput('');
    }
  };

  const toggleSpecialite = (id: string) =>
    setValue('specialite_ids',
      specialiteIds.includes(id) ? specialiteIds.filter((s) => s !== id) : [...specialiteIds, id]);

  const toggleSousType = (st: SousTypeTheme) =>
    setValue('sous_types',
      sousTypes.includes(st) ? sousTypes.filter((s) => s !== st) : [...sousTypes, st]);

  const isBlocked = editingTheme?.is_affecte || editingTheme?.statut_validation === 'VALIDE';

  const onSubmit = async (values: ThemeFormValues) => {
    const dto: CreateThemeForm = {
      ...values,
      encadrant_id: values.besoin_encadrant ? undefined : values.encadrant_id,
      encadrant_externe: showExterne ? values.encadrant_externe : undefined,
    };
    if (editingTheme) {
      await updateTheme.mutateAsync({ id: editingTheme.id, dto });
    } else {
      await createTheme.mutateAsync(dto);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTheme ? 'Modifier le thème' : 'Proposer un thème'}</DialogTitle>
        </DialogHeader>

        {isBlocked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {editingTheme?.is_affecte
              ? 'Ce thème est affecté et ne peut plus être modifié.'
              : 'Ce thème est validé. Contactez le responsable de filière pour toute modification.'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                {(['RECHERCHE', 'PROFESSIONNEL', 'LES_DEUX'] as const).map((st) => (
                  <button
                    key={st} type="button" onClick={() => toggleSousType(st)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      sousTypes.includes(st)
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    {st === 'RECHERCHE' ? 'Recherche' : st === 'PROFESSIONNEL' ? 'Professionnel' : 'Les deux'}
                  </button>
                ))}
              </div>
              {errors.sous_types && (
                <p className="text-xs text-destructive">{errors.sous_types.message as string}</p>
              )}
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
            <Textarea
              id="description" rows={4} {...register('description')}
              placeholder="Objectifs, problématique, technologies envisagées..."
            />
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
            {errors.specialite_ids && (
              <p className="text-xs text-destructive">{errors.specialite_ids.message}</p>
            )}
          </div>

          {/* Mots-clés */}
          <div className="space-y-2">
            <Label>Mots-clés</Label>
            <div className="flex gap-2">
              <Input
                value={motCleInput}
                onChange={(e) => setMotCleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMotCle(); } }}
                placeholder="Appuyer sur Entrée pour ajouter"
              />
              <Button type="button" variant="outline" onClick={addMotCle}>
                <Tag className="h-4 w-4" />
              </Button>
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
                    <SelectValue placeholder={besoinEncadrant ? 'Désactivé — besoin encadrant coché' : 'Sélectionner...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {enseignants.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.prenom} {e.nom}
                      </SelectItem>
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
                    <Input
                      {...register(`encadrant_externe.${field}`)}
                      placeholder={field === 'email' ? 'email@institution.dz' : field === 'institution' ? 'Université / Entreprise' : ''}
                    />
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
                        id={fieldName}
                        checked={f.value}
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
            <Button type="submit" disabled={isSubmitting || !!isBlocked}>
              {isSubmitting ? 'Enregistrement...' : editingTheme ? 'Enregistrer' : 'Proposer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Popup demande de suppression ─────────────────────────────────────────────

function DeleteRequestDialog({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const { data: responsables = [] } = useRespFiliereInfo();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Demande de suppression
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            En tant qu'enseignant, vous ne pouvez pas supprimer directement un thème. Contactez le responsable de filière.
          </p>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Thème concerné</p>
            <p className="font-semibold line-clamp-2">{theme.titre}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Responsable(s) de filière</p>
            {responsables.length > 0 ? responsables.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                <div>
                  <p className="font-medium text-sm text-blue-900">{r.prenom} {r.nom}</p>
                  <p className="text-xs text-blue-600 font-mono select-all">{r.email}</p>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground italic text-xs">Aucun responsable de filière actif.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte thème ──────────────────────────────────────────────────────────────

function ThemeCard({
  theme, onEdit, onDeleteRequest,
}: {
  theme: Theme;
  onEdit: (t: Theme) => void;
  onDeleteRequest: (t: Theme) => void;
}) {
  const canEdit = !theme.is_affecte && theme.statut_validation !== 'VALIDE';

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm leading-snug line-clamp-2">{theme.titre}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {theme.session.annee_universitaire} · {theme.session.type}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <TypeBadge type={theme.type_pfe} />
            <StatutBadge theme={theme} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{theme.description}</p>

        <div className="flex flex-wrap gap-1">
          {theme.theme_specialites.map(({ specialite }) => (
            <span key={specialite.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              {specialite.nom}
            </span>
          ))}
        </div>

        {theme.sous_types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {theme.sous_types.map((st) => (
              <Badge key={st} variant="outline" className="text-xs">
                {st === 'RECHERCHE' ? 'Recherche' : st === 'PROFESSIONNEL' ? 'Professionnel' : 'Les deux'}
              </Badge>
            ))}
          </div>
        )}

        {theme.encadrant && (
          <p className="text-xs text-muted-foreground">
            Encadrant : <span className="font-medium text-foreground">{theme.encadrant.prenom} {theme.encadrant.nom}</span>
          </p>
        )}

        {theme.mots_cles.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {theme.mots_cles.slice(0, 4).map((mc) => `#${mc}`).join(' ')}
            {theme.mots_cles.length > 4 && ` +${theme.mots_cles.length - 4}`}
          </p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs">
          {theme.necessite_stage && <span className="text-amber-600 font-medium">Stage requis</span>}
          {theme.besoin_encadrant && <span className="text-blue-600 font-medium">Cherche encadrant</span>}
          {theme.cherche_binome && <span className="text-purple-600 font-medium">Cherche binôme</span>}
        </div>

        <div className="flex gap-2 pt-2 border-t mt-auto">
          <Button
            size="sm" variant="outline" className="flex-1"
            onClick={() => onEdit(theme)} disabled={!canEdit}
            title={!canEdit ? (theme.is_affecte ? 'Thème affecté' : 'Thème validé — contacter le resp. filière') : ''}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />Modifier
          </Button>
          <Button
            size="sm" variant="outline"
            className="text-destructive hover:text-destructive hover:bg-destructive/5"
            onClick={() => onDeleteRequest(theme)}
            disabled={theme.is_affecte}
            title={theme.is_affecte ? 'Thème affecté, non supprimable' : 'Demander la suppression'}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function GestionThemes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Theme | null>(null);

  const filters = {
    search: search || undefined,
    type_pfe: filterType || undefined,
    statut_validation: filterStatut || undefined,
  };

  const { data, isLoading } = useMyThemes(filters);
  const themes: Theme[] = (data?.data as Theme[]) ?? [];
  const total = data?.meta?.total ?? themes.length;

  const stats = {
    total: themes.length,
    valides: themes.filter((t) => t.statut_validation === 'VALIDE').length,
    enAttente: themes.filter((t) => t.statut_validation !== 'VALIDE' && !t.is_affecte).length,
    affectes: themes.filter((t) => t.is_affecte).length,
  };

  const openCreate = () => navigate('/enseignant/themes/nouveau');
  const openEdit = (theme: Theme) => { setEditingTheme(theme); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingTheme(null); };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes thèmes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} thème{total !== 1 ? 's' : ''} proposé{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />Proposer un thème
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: BookOpen, cls: 'text-blue-600' },
          { label: 'Validés', value: stats.valides, icon: CheckCircle, cls: 'text-emerald-600' },
          { label: 'En attente', value: stats.enAttente, icon: Clock, cls: 'text-amber-600' },
          { label: 'Affectés', value: stats.affectes, icon: Rocket, cls: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, cls }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${cls} shrink-0`} />
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType || '__all__'} onValueChange={(v) => setFilterType(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les types</SelectItem>
            <SelectItem value="CLASSIQUE">Classique</SelectItem>
            <SelectItem value="STARTUP">Startup</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatut || '__all__'} onValueChange={(v) => setFilterStatut(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les statuts</SelectItem>
            <SelectItem value="NON_VALIDE">En attente</SelectItem>
            <SelectItem value="VALIDE">Validé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grille */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : themes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">Aucun thème trouvé</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            {search || filterType || filterStatut
              ? 'Aucun thème ne correspond aux filtres.'
              : 'Vous n\'avez pas encore proposé de thème.'}
          </p>
          {!search && !filterType && !filterStatut && (
            <Button className="mt-4 gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />Proposer un thème
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <ThemeCard key={theme.id} theme={theme} onEdit={openEdit} onDeleteRequest={setDeleteTarget} />
          ))}
        </div>
      )}

      {dialogOpen && <ThemeFormDialog open={dialogOpen} onClose={closeDialog} editingTheme={editingTheme} />}
      {deleteTarget && <DeleteRequestDialog theme={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}
