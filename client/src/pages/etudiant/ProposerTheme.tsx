import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, BookOpen, Rocket, Tag, X, ChevronDown,
  HelpCircle, Users, UserSearch, UserCheck, Briefcase, Megaphone,
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
import { useUsers } from '@/hooks/useUsers';
import { useActiveSession } from '@/hooks/useSession';
import { useMonAffectation } from '@/hooks/useAffectations';
import { CheckCircle2 } from 'lucide-react';
import type { SousTypeTheme, CreateThemeForm } from '@/types';

// ─── Schéma ───────────────────────────────────────────────────────────────────

const schema = z.object({
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
}).refine(
  (d) => !(d.type_pfe === 'STARTUP' && d.sous_types.length > 0),
  { message: 'Un thème STARTUP ne peut pas avoir de sous-types', path: ['sous_types'] },
).refine(
  (d) => !(d.type_pfe === 'CLASSIQUE' && d.sous_types.length === 0),
  { message: 'Choisissez au moins un sous-type pour un thème CLASSIQUE', path: ['sous_types'] },
);

type FormValues = z.infer<typeof schema>;

// ─── Composants utilitaires ───────────────────────────────────────────────────

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1.5">
      <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProposerTheme() {
  const navigate = useNavigate();
  const activeSession = useActiveSession();
  const { data: monAffectation } = useMonAffectation();
  const { data: specialites } = useActiveSpecialites();
  const { data: enseignantsData } = useUsers({ role: 'ENSEIGNANT', limit: 200 });
  const enseignants = enseignantsData?.data ?? [];
  const createTheme = useCreateTheme();
  const isAffecte = !!monAffectation;

  const [motCleInput, setMotCleInput] = useState('');
  const [showExterne, setShowExterne] = useState(false);

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
  const besoinEncadrant = watch('besoin_encadrant');
  const chercheBinome = watch('cherche_binome');
  const encadrantExterne = watch('encadrant_externe');

  const isSessionActive = !!activeSession && activeSession.type === 'CHOIX';
  const hasEncadrantExterne = showExterne && !!encadrantExterne?.nom && !!encadrantExterne?.email;

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
      encadrant_id: values.besoin_encadrant ? undefined : values.encadrant_id,
      encadrant_externe: showExterne ? values.encadrant_externe : undefined,
    };
    await createTheme.mutateAsync(dto);
    navigate('/etudiant');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/etudiant')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proposer un thème</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Remplissez le formulaire. Le thème sera soumis au responsable de filière pour validation.
          </p>
        </div>
      </div>

      {/* Bannière affecté */}
      {isAffecte && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800">Vous avez déjà un thème affecté</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              La proposition de thèmes est désactivée — vous ne pouvez plus soumettre de nouveau thème.
            </p>
          </div>
        </div>
      )}

      {/* Bannière hors session */}
      {!isAffecte && !isSessionActive && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aucune session de choix ouverte. La soumission de thèmes est temporairement désactivée.
        </div>
      )}

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
              placeholder="Ex : Application de gestion des stocks avec IA prédictive"
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
            <Hint>Les mots-clés aident à trouver votre thème via la recherche.</Hint>
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

        {/* ── Encadrement ── */}
        <Section title="Encadrement">
          {/* Toggle besoin_encadrant */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue('besoin_encadrant', false)}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                !besoinEncadrant
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
              }`}
            >
              <UserCheck
                className={`h-5 w-5 mt-0.5 shrink-0 ${
                  !besoinEncadrant ? 'text-emerald-600' : 'text-muted-foreground'
                }`}
              />
              <div>
                <div className="font-semibold text-sm">J'ai déjà un encadrant</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Sélectionnez l'enseignant qui supervise votre projet
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setValue('besoin_encadrant', true);
                setValue('encadrant_id', undefined);
              }}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                besoinEncadrant
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
              }`}
            >
              <UserSearch
                className={`h-5 w-5 mt-0.5 shrink-0 ${
                  besoinEncadrant ? 'text-blue-600' : 'text-muted-foreground'
                }`}
              />
              <div>
                <div className="font-semibold text-sm">Je recherche un encadrant</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Le responsable de filière en assignera un
                </div>
              </div>
            </button>
          </div>

          {/* Encadrant interne (si pas besoin_encadrant) */}
          {!besoinEncadrant ? (
            <div className="space-y-1.5">
              <Label>Encadrant interne (optionnel)</Label>
              <Controller
                name="encadrant_id"
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
                      <SelectItem value="__none__">Aucun pour l'instant</SelectItem>
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
                Laissez vide si vous n'avez pas encore obtenu l'accord de l'enseignant.
              </Hint>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Le responsable de filière sera informé que ce thème a besoin d'un encadrant et en désignera
              un après validation.
            </div>
          )}

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
              <div className="px-4 pb-4 border-t pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                {/* Auto-affecté info (STARTUP + encadrant externe rempli) */}
                {typePfe === 'STARTUP' && hasEncadrantExterne && (
                  <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800 flex items-start gap-2">
                    <Rocket className="h-4 w-4 mt-0.5 shrink-0 text-orange-500" />
                    <span>
                      Pour un thème STARTUP avec encadrant externe, votre thème sera automatiquement{' '}
                      <strong>marqué comme affecté</strong> une fois soumis.
                    </span>
                  </div>
                )}
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
                  Le projet se déroule en partie dans une entreprise. Vous devez trouver un stage pour
                  réaliser ce PFE.
                </p>
              </div>
            </div>

            {/* Cherche binôme + message conditionnel */}
            <div>
              <div
                className={`flex items-start gap-3 border p-4 transition-all ${
                  chercheBinome
                    ? 'rounded-t-xl rounded-b-none border-b-0'
                    : 'rounded-xl'
                }`}
              >
                <Controller
                  name="cherche_binome"
                  control={control}
                  render={({ field: f }) => (
                    <Checkbox
                      id="cherche_binome"
                      checked={f.value}
                      onCheckedChange={f.onChange}
                      className="mt-0.5"
                    />
                  )}
                />
                <div>
                  <Label htmlFor="cherche_binome" className="cursor-pointer flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    Ouvert pour former un binôme
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Publie une annonce visible par les étudiants qui cherchent un binôme.
                  </p>
                </div>
              </div>

              {/* Message conditionnel */}
              {chercheBinome && (
                <div className="rounded-b-xl border border-t-0 border-purple-200 bg-purple-50 px-4 py-3 flex items-start gap-2">
                  <Megaphone className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-800">
                    <strong>Votre annonce sera visible</strong> — une fois ce thème validé par le
                    responsable de filière, il apparaîtra dans la page{' '}
                    <strong>Annonces</strong>. Les étudiants sans binôme pourront demander à rejoindre
                    votre projet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Récapitulatif ── */}
        {(specialiteIds.length > 0 || watch('titre')) && (
          <>
            <Separator />
            <Section title="Récapitulatif">
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={
                      typePfe === 'STARTUP'
                        ? 'bg-orange-100 text-orange-700 border-orange-200'
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                    }
                  >
                    {typePfe}
                  </Badge>
                  {sousTypes.map((st) => (
                    <Badge key={st} variant="outline" className="text-xs">
                      {st === 'RECHERCHE' ? 'Recherche' : st === 'PROFESSIONNEL' ? 'Professionnel' : 'Les deux'}
                    </Badge>
                  ))}
                  {specialiteIds.map((id) => {
                    const s = specialites?.find((sp) => sp.id === id);
                    return s ? <Badge key={id} variant="secondary">{s.nom}</Badge> : null;
                  })}
                </div>
                {watch('titre') && <p className="font-medium">{watch('titre')}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                  {besoinEncadrant && <span className="text-blue-600">● Cherche encadrant</span>}
                  {watch('necessite_stage') && <span className="text-amber-600">● Stage requis</span>}
                  {chercheBinome && <span className="text-purple-600">● Ouvert pour binôme</span>}
                  {typePfe === 'STARTUP' && hasEncadrantExterne && (
                    <span className="text-orange-600">● Auto-affecté (encadrant externe)</span>
                  )}
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
            onClick={() => navigate('/etudiant')}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isSessionActive || isAffecte}
            size="lg"
            className="px-8"
          >
            {isSubmitting ? 'Envoi en cours...' : 'Soumettre le thème'}
          </Button>
        </div>
      </form>
    </div>
  );
}
