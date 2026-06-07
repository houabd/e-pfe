import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, BookOpen, Rocket, Tag, X, ChevronDown,
  HelpCircle, Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateTheme } from '@/hooks/useThemes';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import { api } from '@/services/api';
import type { SousTypeTheme, CreateThemeForm, User } from '@/types';

// ─── Schéma ───────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  titre: z.string().min(5, 'Titre trop court (min 5 caractères)'),
  description: z.string().min(20, 'Description trop courte (min 20 caractères)'),
  mots_cles: z.array(z.string()).default([]),
  necessite_stage: z.boolean().default(false),
  type_pfe: z.enum(['CLASSIQUE', 'STARTUP']),
  sous_types: z.array(z.enum(['RECHERCHE', 'PROFESSIONNEL', 'LES_DEUX'])).default([]),
  specialite_ids: z.array(z.string()).min(1, 'Sélectionnez au moins une spécialité'),
  encadrant_id: z.string().optional(),
  encadrant_externe: z.object({
    nom: z.string().min(1, 'Requis'),
    prenom: z.string().min(1, 'Requis'),
    email: z.string().email('Email invalide'),
    institution: z.string().min(1, 'Requis'),
  }).optional(),
  besoin_encadrant: z.boolean().default(false),
  cherche_binome: z.boolean().default(false),
});

// FormValues uses the output of the base object (defaults resolved → required fields)
type FormValues = z.output<typeof baseSchema>;

const schema = baseSchema.refine(
  (d) => !(d.type_pfe === 'STARTUP' && d.sous_types.length > 0),
  { message: 'Un thème STARTUP ne peut pas avoir de sous-types', path: ['sous_types'] },
).refine(
  (d) => !(d.type_pfe === 'CLASSIQUE' && d.sous_types.length === 0),
  { message: 'Choisissez au moins un sous-type pour un thème CLASSIQUE', path: ['sous_types'] },
);

// ─── Composant info-bulle ─────────────────────────────────────────────────────

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1.5">
      <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SUPERVISOR_ROLES = ['ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'];

export default function ProposeThemePage() {
  const navigate = useNavigate();
  const { data: specialites } = useActiveSpecialites();
  const createTheme = useCreateTheme();

  const [enseignants, setEnseignants] = useState<User[]>([]);
  const [motCleInput, setMotCleInput] = useState('');
  const [showExterne, setShowExterne] = useState(false);

  useEffect(() => {
    api.get<{ data: User[]; meta: unknown }>('/users', { params: { limit: 500 } })
      .then((res) => {
        const superviseurs = res.data.data.filter((u) => SUPERVISOR_ROLES.includes(u.role));
        setEnseignants(superviseurs);
      })
      .catch((err) => console.error('[ProposeTheme] Erreur chargement enseignants:', err));
  }, []);

  const {
    register, handleSubmit, control, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      titre: '', description: '', mots_cles: [], necessite_stage: false,
      type_pfe: 'CLASSIQUE', sous_types: [], specialite_ids: [],
      besoin_encadrant: false, cherche_binome: false,
    },
  });

  const typePfe = watch('type_pfe');
  const motsCles = watch('mots_cles');
  const specialiteIds = watch('specialite_ids');
  const sousTypes = watch('sous_types');

  const addMotCle = () => {
    const val = motCleInput.trim();
    if (val && !motsCles.includes(val)) {
      setValue('mots_cles', [...motsCles, val]);
      setMotCleInput('');
    }
  };

  const toggleSpecialite = (id: string) =>
    setValue('specialite_ids',
      specialiteIds.includes(id)
        ? specialiteIds.filter((s) => s !== id)
        : [...specialiteIds, id],
    );

  const toggleSousType = (st: SousTypeTheme) =>
    setValue('sous_types',
      sousTypes.includes(st)
        ? sousTypes.filter((s) => s !== st)
        : [...sousTypes, st],
    );

  const onSubmit = async (values: FormValues) => {
    const dto: CreateThemeForm = {
      ...values,
      encadrant_externe: showExterne ? values.encadrant_externe : undefined,
    };
    await createTheme.mutateAsync(dto);
    navigate('/enseignant/themes');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/enseignant/themes')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proposer un thème</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Remplissez le formulaire ci-dessous. Le thème sera soumis au responsable de filière pour validation.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Type de PFE ── */}
        <Section title="Type de PFE">
          <Controller
            name="type_pfe"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-4">
                {([
                  {
                    val: 'CLASSIQUE' as const,
                    icon: <BookOpen className="h-6 w-6 text-blue-500" />,
                    title: 'Classique',
                    desc: 'Projet de recherche ou professionnel, encadré par un enseignant interne.',
                  },
                  {
                    val: 'STARTUP' as const,
                    icon: <Rocket className="h-6 w-6 text-orange-500" />,
                    title: 'Startup',
                    desc: "Projet entrepreneurial, jusqu'à 6 étudiants, souvent avec un encadrant externe.",
                  },
                ] as const).map(({ val, icon, title, desc }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      field.onChange(val);
                      if (val === 'STARTUP') setValue('sous_types', []);
                    }}
                    className={`flex flex-col gap-3 rounded-xl border-2 p-5 text-left transition-all ${
                      field.value === val
                        ? val === 'STARTUP'
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-blue-400 bg-blue-50'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                    }`}
                  >
                    {icon}
                    <div>
                      <div className="font-semibold">{title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          />

          {/* Sous-types (CLASSIQUE seulement) */}
          {typePfe === 'CLASSIQUE' && (
            <div className="space-y-2">
              <Label>
                Sous-type(s) <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-3 flex-wrap">
                {([
                  { val: 'RECHERCHE' as const, label: 'Recherche' },
                  { val: 'PROFESSIONNEL' as const, label: 'Professionnel' },
                ] as const).map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleSousType(val)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      sousTypes.includes(val)
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Hint>
                Vous pouvez sélectionner les deux options simultanément si le thème est à la fois de recherche et professionnel.
              </Hint>
              {errors.sous_types && (
                <p className="text-xs text-destructive">{errors.sous_types.message as string}</p>
              )}
            </div>
          )}
        </Section>

        <Separator />

        {/* ── Informations générales ── */}
        <Section title="Informations générales">
          <div className="space-y-1.5">
            <Label htmlFor="titre">
              Titre du projet <span className="text-destructive">*</span>
            </Label>
            <Input
              id="titre"
              {...register('titre')}
              placeholder="Ex : Système de détection d'intrusion par apprentissage automatique"
            />
            {errors.titre && <p className="text-xs text-destructive">{errors.titre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              rows={5}
              {...register('description')}
              placeholder="Décrivez la problématique, les objectifs, les technologies et méthodes envisagées..."
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Mots-clés */}
          <div className="space-y-2">
            <Label>Mots-clés</Label>
            <div className="flex gap-2">
              <Input
                value={motCleInput}
                onChange={(e) => setMotCleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addMotCle(); }
                }}
                placeholder="Tapez un mot-clé et appuyez sur Entrée"
              />
              <Button type="button" variant="outline" onClick={addMotCle}>
                <Tag className="h-4 w-4" />
              </Button>
            </div>
            {motsCles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {motsCles.map((mc) => (
                  <span
                    key={mc}
                    className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    {mc}
                    <button
                      type="button"
                      onClick={() => setValue('mots_cles', motsCles.filter((m) => m !== mc))}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Hint>Les mots-clés aident les étudiants à trouver votre thème via la recherche.</Hint>
          </div>
        </Section>

        <Separator />

        {/* ── Spécialités ── */}
        <Section title="Spécialités concernées">
          <div className="flex flex-wrap gap-2">
            {specialites?.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSpecialite(s.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
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
          <Hint>Un thème peut couvrir plusieurs spécialités (ex : GL + IA).</Hint>
        </Section>

        <Separator />

        {/* ── Co-encadrement ── */}
        <Section title="Co-encadrement (optionnel)">
          <p className="text-sm text-muted-foreground rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
            En tant que proposant, vous êtes automatiquement l'encadrant principal de ce thème.
          </p>
          {/* Co-encadrant interne */}
          <div className="space-y-1.5">
            <Label>Co-encadrant interne (optionnel)</Label>
            <Controller
              name="encadrant_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un co-encadrant..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun co-encadrant</SelectItem>
                    {enseignants.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.prenom} {e.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Hint>
              Si vous désignez un co-encadrant, le thème sera masqué jusqu'à ce qu'il accepte. Une notification lui sera envoyée.
            </Hint>
          </div>

          {/* Encadrant externe (collapsible) */}
          <div className="rounded-xl border">
            <button
              type="button"
              onClick={() => setShowExterne(!showExterne)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors rounded-xl"
            >
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Ajouter un encadrant externe (entreprise / autre université)
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${showExterne ? 'rotate-180' : ''}`}
              />
            </button>

            {showExterne && (
              <div className="grid grid-cols-2 gap-4 px-4 pb-4 border-t pt-4">
                {([
                  ['nom', 'Nom', ''],
                  ['prenom', 'Prénom', ''],
                  ['email', 'Email professionnel', 'contact@entreprise.com'],
                  ['institution', 'Établissement / Entreprise', 'Ex : Sonatrach, USTHB...'],
                ] as const).map(([field, label, placeholder]) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-sm">{label}</Label>
                    <Input
                      {...register(`encadrant_externe.${field}`)}
                      placeholder={placeholder}
                    />
                    {errors.encadrant_externe?.[field] && (
                      <p className="text-xs text-destructive">
                        {errors.encadrant_externe[field]?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Separator />

        {/* ── Options ── */}
        <Section title="Options">
          <div className="space-y-4">
            {/* Stage */}
            <div className="flex items-start gap-3 rounded-xl border p-4">
              <Controller
                name="necessite_stage"
                control={control}
                render={({ field: f }) => (
                  <Checkbox
                    id="necessite_stage"
                    checked={f.value}
                    onCheckedChange={f.onChange}
                    className="mt-0.5"
                  />
                )}
              />
              <div>
                <Label htmlFor="necessite_stage" className="cursor-pointer flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-amber-500" />
                  Nécessite un stage en entreprise
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Le projet se déroule en partie dans une entreprise. L'étudiant doit trouver un stage pour réaliser ce PFE.
                </p>
              </div>
            </div>

          </div>
        </Section>

        {/* ── Résumé avant soumission ── */}
        {(specialiteIds.length > 0 || watch('titre')) && (
          <>
            <Separator />
            <Section title="Récapitulatif">
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={typePfe === 'STARTUP'
                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                  }>
                    {typePfe}
                  </Badge>
                  {sousTypes.map((st) => (
                    <Badge key={st} variant="outline" className="text-xs">
                      {st === 'RECHERCHE' ? 'Recherche' : st === 'PROFESSIONNEL' ? 'Professionnel' : 'Les deux'}
                    </Badge>
                  ))}
                  {specialiteIds.map((id) => {
                    const s = specialites?.find((sp) => sp.id === id);
                    return s ? (
                      <Badge key={id} variant="secondary">{s.nom}</Badge>
                    ) : null;
                  })}
                </div>
                {watch('titre') && (
                  <p className="font-medium">{watch('titre')}</p>
                )}
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                  {watch('necessite_stage') && <span className="text-amber-600">● Stage requis</span>}
                </div>
              </div>
            </Section>
          </>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/enseignant/themes')}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting} size="lg" className="px-8">
            {isSubmitting ? 'Envoi en cours...' : 'Soumettre le thème'}
          </Button>
        </div>
      </form>
    </div>
  );
}
