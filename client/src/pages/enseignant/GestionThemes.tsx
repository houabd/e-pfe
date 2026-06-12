import { useState, useEffect } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Pencil, Trash2, CheckCircle, Clock,
  BookOpen, Rocket, Tag, Mail, X, ChevronDown, Eye, MessageSquarePlus, UserCheck, UserPlus,
} from 'lucide-react';
import { ThemeDetailDialog } from '@/components/themes/ThemeDetailDialog';
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
import {
  useMyThemes, useCreateTheme, useUpdateTheme, useRespFiliereInfo,
  useDemanderModification, useConfirmCoEncadrant, useRefuseCoEncadrant,
  useThemesAwaitingCoEncadrant,
} from '@/hooks/useThemes';
import { useAddMembreFromTheme } from '@/hooks/useAffectations';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import { useUsers } from '@/hooks/useUsers';
import { useCurrentUser } from '@/stores/authStore';
import { api } from '@/services/api';
import type { Theme, SousTypeTheme, CreateThemeForm, User } from '@/types';

const SUPERVISOR_ROLES = ['ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'];

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
    return <Badge className="bg-[#e8e8e8] text-emerald-700 border-[#e8e8e8]">Validé</Badge>;
  return <Badge variant="outline" className="text-amber-600 border-amber-300">En attente</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  return type === 'STARTUP'
    ? <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1"><Rocket className="h-3 w-3" />Startup</Badge>
    : <Badge className="bg-[#e8e8e8] text-[#1a1a1a] border-[#e8e8e8] gap-1"><BookOpen className="h-3 w-3" />Classique</Badge>;
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
  const [enseignants, setEnseignants] = useState<User[]>([]);
  const [motCleInput, setMotCleInput] = useState('');
  const [showExterne, setShowExterne] = useState(!!editingTheme?.encadrant_externe);

  useEffect(() => {
    api.get<{ data: User[] }>('/users', { params: { is_teacher: true, limit: 500 } })
      .then((res) => setEnseignants(res.data.data))
      .catch((err) => console.error('[GestionThemes] Erreur chargement enseignants:', err));
  }, []);

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
  } = useForm<ThemeFormValues>({ resolver: zodResolver(themeSchema) as Resolver<ThemeFormValues>, defaultValues });

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

  const needsPermission = (editingTheme?.is_affecte || editingTheme?.statut_validation === 'VALIDE');
  const isBlocked = needsPermission && !editingTheme?.modification_autorisee;

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

        {editingTheme?.modification_autorisee && (
          <div className="rounded-lg border border-[#e8e8e8] bg-[#f7f7f7] px-4 py-3 text-sm text-emerald-800">
            Modification autorisée par l'administration. Cette autorisation sera consommée à la sauvegarde.
          </div>
        )}
        {isBlocked && (
          <div className="rounded-lg border border-[#e8e8e8] bg-[#f7f7f7] px-4 py-3 text-sm text-amber-800">
            Ce thème est verrouillé. Soumettez une demande de modification pour obtenir l'autorisation.
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
                          ? t === 'STARTUP' ? 'border-orange-400 bg-orange-50' : 'border-[#c2c2c2] bg-[#f7f7f7]'
                          : 'border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      {t === 'STARTUP'
                        ? <Rocket className="h-5 w-5 text-orange-500 shrink-0" />
                        : <BookOpen className="h-5 w-5 text-[#009474] shrink-0" />}
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
                        ? 'border-[#c2c2c2] bg-[#f7f7f7] text-[#1a1a1a]'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    {st === 'RECHERCHE' ? 'Recherche' : 'Professionnel'}
                  </button>
                ))}
              </div>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1.5">
                Vous pouvez sélectionner les deux options simultanément si le thème est à la fois de recherche et professionnel.
              </p>
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
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-[#e8e8e8] bg-[#f7f7f7] px-3 py-2.5">
                <Mail className="h-4 w-4 text-[#1a1a1a] shrink-0" />
                <div>
                  <p className="font-medium text-sm text-[#1a1a1a]">{r.prenom} {r.nom}</p>
                  <p className="text-xs text-[#1a1a1a] font-mono select-all">{r.email}</p>
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

// ─── Dialog demande de modification ──────────────────────────────────────────

function DemandeModifDialog({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const [motif, setMotif] = useState('');
  const demander = useDemanderModification();

  const onSubmit = async () => {
    if (motif.trim().length < 10) return;
    await demander.mutateAsync({ themeId: theme.id, motif: motif.trim() });
    onClose();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Demander une modification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Thème : <span className="font-medium text-foreground">{theme.titre}</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="motif">Motif de la demande <span className="text-destructive">*</span></Label>
            <Textarea
              id="motif"
              placeholder="Expliquez pourquoi vous souhaitez modifier ce thème (min. 10 caractères)…"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={4}
            />
            {motif.trim().length > 0 && motif.trim().length < 10 && (
              <p className="text-xs text-destructive">Motif trop court (min. 10 caractères)</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={onSubmit}
            disabled={motif.trim().length < 10 || demander.isPending}
          >
            {demander.isPending ? 'Envoi…' : 'Envoyer la demande'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog ajout membre Startup (depuis thème) ───────────────────────────────

function AjouterMembreStartupDialog({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const addMembre = useAddMembreFromTheme();
  const { data: etudiantsData } = useUsers({ role: 'ETUDIANT', limit: 500 });
  const etudiants = etudiantsData?.data ?? [];
  const { data: specialites = [] } = useActiveSpecialites();
  const [filterSpecialite, setFilterSpecialite] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [open, setOpen] = useState(false);

  const bySpecialite = filterSpecialite
    ? etudiants.filter((e) => e.specialite?.id === filterSpecialite)
    : etudiants;

  const q = query.trim().toLowerCase();
  const suggestions = q
    ? bySpecialite.filter((e) =>
        `${e.prenom} ${e.nom} ${e.email}`.toLowerCase().includes(q),
      )
    : bySpecialite;

  const selectedUser = etudiants.find((e) => e.id === selectedId);

  const handleSelect = (id: string) => {
    const u = etudiants.find((e) => e.id === id);
    setSelectedId(id);
    setQuery(u ? `${u.prenom} ${u.nom}` : '');
    setOpen(false);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSelectedId('');
    setOpen(true);
  };

  const totalMembers = (theme.affectation?.startup_membres?.length ?? 0)
    + (theme.affectation?.etudiants?.length ?? 0);

  const onSubmit = () => {
    if (!selectedId) return;
    addMembre.mutate(
      { themeId: theme.id, dto: { etudiant_id: selectedId } },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Inviter un membre — {theme.titre}
            <Badge variant="secondary" className="text-xs">{totalMembers}/6</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Filtrer par spécialité</Label>
            <Select
              value={filterSpecialite || '__all__'}
              onValueChange={(v) => { setFilterSpecialite(v === '__all__' ? '' : v); setSelectedId(''); setQuery(''); }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Toutes les spécialités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes les spécialités</SelectItem>
                {specialites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Étudiant <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 pr-8"
                placeholder="Rechercher par nom ou email..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                autoComplete="off"
              />
              {(query || selectedId) && (
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onMouseDown={(e) => { e.preventDefault(); setQuery(''); setSelectedId(''); setOpen(false); }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {open && suggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-md border bg-popover shadow-md text-sm">
                  {suggestions.slice(0, 50).map((e) => (
                    <li
                      key={e.id}
                      onMouseDown={() => handleSelect(e.id)}
                      className={`flex flex-col px-3 py-2 cursor-pointer hover:bg-accent ${selectedId === e.id ? 'bg-primary/5 text-primary' : ''}`}
                    >
                      <span className="font-medium">{e.prenom} {e.nom}</span>
                      <span className="text-xs text-muted-foreground">{e.email}{e.specialite ? ` · ${e.specialite.nom}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
              {open && q.length > 0 && suggestions.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
                  Aucun étudiant trouvé.
                </div>
              )}
            </div>
            {selectedUser && (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                {selectedUser.prenom} {selectedUser.nom} sélectionné
                {selectedUser.specialite && <span className="text-muted-foreground font-normal">· {selectedUser.specialite.nom}</span>}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            L'étudiant recevra une invitation et devra l'accepter pour rejoindre l'équipe.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={onSubmit} disabled={!selectedId || addMembre.isPending}>
            {addMembre.isPending ? 'Envoi…' : "Envoyer l'invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte thème ──────────────────────────────────────────────────────────────

function ThemeCard({
  theme, onEdit, onDeleteRequest, onView, onDemandeModif, onAjouterMembre, currentUserId,
}: {
  theme: Theme;
  onEdit: (t: Theme) => void;
  onDeleteRequest: (t: Theme) => void;
  onView: (id: string) => void;
  onDemandeModif: (t: Theme) => void;
  onAjouterMembre: (t: Theme) => void;
  currentUserId: string;
}) {
  const confirmCoEnc = useConfirmCoEncadrant();
  const refuseCoEnc = useRefuseCoEncadrant();
  const isProposant = theme.propose_par.id === currentUserId;
  const isCoEncadrant = !isProposant && theme.co_encadrant?.id === currentUserId;
  const isPendingCoEnc = isCoEncadrant && !theme.encadrant_valide;
  const coEncPending = isProposant && !!theme.co_encadrant && !theme.encadrant_valide;
  const isLocked = (theme.statut_validation === 'VALIDE' || theme.is_affecte) && !theme.modification_autorisee;
  const canEdit = isProposant && !isLocked;
  const canDelete = isProposant && !theme.is_affecte;
  const canRequestModif = isProposant && isLocked;

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
            {isCoEncadrant && (
              <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 text-xs">
                Co-encadrant
              </Badge>
            )}
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
                {st === 'RECHERCHE' ? 'Recherche' : 'Professionnel'}
              </Badge>
            ))}
          </div>
        )}

        {theme.encadrant && (
          <p className="text-xs text-muted-foreground">
            Encadrant : <span className="font-medium text-foreground">{theme.encadrant.prenom} {theme.encadrant.nom}</span>
          </p>
        )}

        {theme.co_encadrant && !isCoEncadrant && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            Co-encadrant :&nbsp;<span className="font-medium text-foreground">{theme.co_encadrant.prenom} {theme.co_encadrant.nom}</span>
            {coEncPending && (
              <span className="rounded-full bg-[#e8e8e8] px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-[#e8e8e8]">
                en attente
              </span>
            )}
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
          {theme.besoin_encadrant && <span className="text-[#1a1a1a] font-medium">Cherche encadrant</span>}
          {theme.cherche_binome && <span className="text-purple-600 font-medium">Cherche binôme</span>}
        </div>

        {theme.modification_autorisee && (
          <div className="rounded-md border border-[#e8e8e8] bg-[#f7f7f7] px-2.5 py-1.5 text-xs text-emerald-700 font-medium">
            Modification autorisée
          </div>
        )}

        {isPendingCoEnc && (
          <div className="rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs text-violet-700 font-medium">
            En attente de votre confirmation comme co-encadrant
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t mt-auto flex-wrap">
          <Button
            size="sm" variant="outline"
            className="gap-1.5"
            onClick={() => onView(theme.id)}
            title="Voir les détails"
          >
            <Eye className="h-3.5 w-3.5" />Détails
          </Button>
          {theme.type_pfe === 'STARTUP' && theme.statut_validation === 'VALIDE' && isProposant && (
            <Button
              size="sm" variant="outline"
              className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
              onClick={() => onAjouterMembre(theme)}
              title="Ajouter un membre à l'équipe"
            >
              <UserPlus className="h-3.5 w-3.5" />Membres
            </Button>
          )}
          {isPendingCoEnc ? (
            <>
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={confirmCoEnc.isPending}
                onClick={() => confirmCoEnc.mutate(theme.id)}
              >
                Accepter
              </Button>
              <Button
                size="sm" variant="outline"
                className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                disabled={refuseCoEnc.isPending}
                onClick={() => refuseCoEnc.mutate(theme.id)}
              >
                Refuser
              </Button>
            </>
          ) : isProposant ? (
            <>
              {canRequestModif ? (
                <Button
                  size="sm" variant="outline" className="flex-1 gap-1.5 text-amber-600 border-amber-300 hover:bg-[#f7f7f7]"
                  onClick={() => onDemandeModif(theme)}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />Demander modification
                </Button>
              ) : (
                <Button
                  size="sm" variant="outline" className="flex-1"
                  onClick={() => onEdit(theme)} disabled={!canEdit}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />Modifier
                </Button>
              )}
              <Button
                size="sm" variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/5"
                onClick={() => onDeleteRequest(theme)}
                disabled={!canDelete}
                title={!canDelete ? 'Thème affecté, non supprimable' : 'Demander la suppression'}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <p className="flex-1 text-xs text-muted-foreground flex items-center">
              Proposé par {theme.propose_par.prenom} {theme.propose_par.nom}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function GestionThemes() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Theme | null>(null);
  const [detailThemeId, setDetailThemeId] = useState<string | null>(null);
  const [demandeModifTarget, setDemandeModifTarget] = useState<Theme | null>(null);
  const [ajouterMembreTarget, setAjouterMembreTarget] = useState<Theme | null>(null);

  const filters = {
    search: search || undefined,
    type_pfe: filterType || undefined,
    statut_validation: filterStatut || undefined,
  };

  const { data, isLoading } = useMyThemes(filters);
  const themes: Theme[] = (data?.data as Theme[]) ?? [];
  const total = data?.meta?.total ?? themes.length;

  const { data: pendingCoEnc = [] } = useThemesAwaitingCoEncadrant();
  const confirmCoEnc = useConfirmCoEncadrant();
  const refuseCoEnc = useRefuseCoEncadrant();

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
            {total} thème{total !== 1 ? 's' : ''} dans votre portfolio
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />Proposer un thème
        </Button>
      </div>

      {/* Confirmation co-encadrant en attente */}
      {pendingCoEnc.length > 0 && (
        <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-violet-600 shrink-0" />
            <p className="font-semibold text-violet-800">
              {pendingCoEnc.length === 1
                ? 'Vous avez été désigné co-encadrant d\'un thème'
                : `Vous avez été désigné co-encadrant pour ${pendingCoEnc.length} thèmes`}
            </p>
          </div>
          <div className="space-y-2">
            {pendingCoEnc.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-violet-200 bg-white px-4 py-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{t.titre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Proposé par {t.propose_par.prenom} {t.propose_par.nom}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    disabled={confirmCoEnc.isPending}
                    onClick={() => confirmCoEnc.mutate(t.id)}
                  >
                    Accepter
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-1.5"
                    disabled={refuseCoEnc.isPending}
                    onClick={() => refuseCoEnc.mutate(t.id)}
                  >
                    Refuser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: BookOpen, cls: 'text-[#1a1a1a]' },
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
            <ThemeCard key={theme.id} theme={theme} onEdit={openEdit} onDeleteRequest={setDeleteTarget} onView={setDetailThemeId} onDemandeModif={setDemandeModifTarget} onAjouterMembre={setAjouterMembreTarget} currentUserId={currentUser?.id ?? ''} />
          ))}
        </div>
      )}

      {dialogOpen && <ThemeFormDialog open={dialogOpen} onClose={closeDialog} editingTheme={editingTheme} />}
      {deleteTarget && <DeleteRequestDialog theme={deleteTarget} onClose={() => setDeleteTarget(null)} />}
      {demandeModifTarget && <DemandeModifDialog theme={demandeModifTarget} onClose={() => setDemandeModifTarget(null)} />}
      {ajouterMembreTarget && <AjouterMembreStartupDialog theme={ajouterMembreTarget} onClose={() => setAjouterMembreTarget(null)} />}
      <ThemeDetailDialog themeId={detailThemeId} onClose={() => setDetailThemeId(null)} />
    </div>
  );
}
