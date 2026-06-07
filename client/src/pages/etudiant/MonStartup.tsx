import { useState, useRef, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Rocket, Users, Mail, Globe, UserPlus, Clock, CheckCircle2, XCircle,
  Building2, GraduationCap, ChevronDown, ChevronUp, Search, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useMonAffectation } from '@/hooks/useAffectations';
import { useStartupEquipe, usePropositions, useProposerMembre } from '@/hooks/useAffectations';
import { useUsers } from '@/hooks/useUsers';
import type { PropositionMembre } from '@/services/affectations.api';

// ─── Schémas ──────────────────────────────────────────────────────────────────

const schemaInterne = z.object({
  candidat_interne_id: z.string().min(1, 'Sélectionnez un étudiant'),
});

const schemaExterne = z.object({
  nom: z.string().min(1, 'Requis'),
  prenom: z.string().min(1, 'Requis'),
  email: z.string().email('Email invalide'),
  specialite: z.string().optional(),
  universite: z.string().optional(),
  commentaire: z.string().optional(),
});

// ─── Carte membre ─────────────────────────────────────────────────────────────

function MembreCard({ prenom, nom, email, specialite, tag }: {
  prenom: string; nom: string; email: string;
  specialite?: string | null; tag?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-primary">{prenom[0]}{nom[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{prenom} {nom}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {specialite && <Badge variant="outline" className="text-xs">{specialite}</Badge>}
        {tag && <Badge variant="secondary" className="text-xs">{tag}</Badge>}
      </div>
    </div>
  );
}

// ─── Badge statut proposition ─────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: PropositionMembre['statut'] }) {
  if (statut === 'PENDING') return (
    <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
      <Clock className="h-3 w-3" />En attente
    </Badge>
  );
  if (statut === 'ACCEPTED') return (
    <Badge className="text-xs gap-1 bg-green-100 text-green-700 border-green-200">
      <CheckCircle2 className="h-3 w-3" />Acceptée
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30">
      <XCircle className="h-3 w-3" />Refusée
    </Badge>
  );
}

// ─── Recherche étudiant (autocomplete) ────────────────────────────────────────

type EtudiantItem = { id: string; prenom: string; nom: string; email: string; specialite?: { id: string; nom: string } | null };

function EtudiantSearchInput({ value, onChange, etudiants, excludeIds = [], allowedSpecialiteIds }: {
  value: string;
  onChange: (id: string) => void;
  etudiants: EtudiantItem[];
  excludeIds?: string[];
  allowedSpecialiteIds?: string[];
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => etudiants.find((e) => e.id === value), [value, etudiants]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return etudiants
      .filter((e) => {
        if (excludeIds.includes(e.id)) return false;
        if (allowedSpecialiteIds?.length && !allowedSpecialiteIds.includes(e.specialite?.id ?? '')) return false;
        return (
          `${e.prenom} ${e.nom}`.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [search, etudiants, excludeIds, allowedSpecialiteIds]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border p-3 bg-primary/5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">{selected.prenom[0]}{selected.nom[0]}</span>
          </div>
          <div>
            <p className="text-sm font-medium">{selected.prenom} {selected.nom}</p>
            <p className="text-xs text-muted-foreground">{selected.email}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Chercher par nom, prénom ou email..."
          className="pl-9"
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => { onChange(e.id); setSearch(''); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent text-left transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-primary">{e.prenom[0]}{e.nom[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{e.prenom} {e.nom}</p>
                <p className="text-xs text-muted-foreground truncate">{e.email}</p>
              </div>
              {e.specialite && (
                <span className="text-[10px] border rounded px-1.5 py-0.5 text-muted-foreground shrink-0">
                  {e.specialite.nom}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && search.trim().length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border bg-popover shadow-lg p-3">
          <p className="text-sm text-muted-foreground text-center">Aucun résultat pour « {search} »</p>
        </div>
      )}
    </div>
  );
}

// ─── Dialog proposition ───────────────────────────────────────────────────────

function ProposerDialog({ affectationId, onClose, excludeIds = [], allowedSpecialiteIds }: {
  affectationId: string;
  onClose: () => void;
  excludeIds?: string[];
  allowedSpecialiteIds?: string[];
}) {
  const proposer = useProposerMembre();
  const { data: etudiantsData } = useUsers({ role: 'ETUDIANT', sans_affectation: true, limit: 500 });
  const etudiants = etudiantsData?.data ?? [];

  const formInterne = useForm<z.infer<typeof schemaInterne>>({ resolver: zodResolver(schemaInterne) });
  const formExterne = useForm<z.infer<typeof schemaExterne>>({ resolver: zodResolver(schemaExterne) });

  const selectedId = formInterne.watch('candidat_interne_id') ?? '';

  const onSubmitInterne = (values: z.infer<typeof schemaInterne>) => {
    proposer.mutate({ affectationId, dto: { candidat_interne_id: values.candidat_interne_id } }, { onSuccess: onClose });
  };
  const onSubmitExterne = (values: z.infer<typeof schemaExterne>) => {
    proposer.mutate({ affectationId, dto: { candidat_externe: values } }, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Proposer un membre
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="interne">
          <TabsList className="w-full">
            <TabsTrigger value="interne" className="flex-1">Étudiant interne</TabsTrigger>
            <TabsTrigger value="externe" className="flex-1">Membre externe</TabsTrigger>
          </TabsList>

          <TabsContent value="interne" className="mt-4">
            <form onSubmit={formInterne.handleSubmit(onSubmitInterne)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Étudiant <span className="text-destructive">*</span></Label>
                <EtudiantSearchInput
                  value={selectedId}
                  onChange={(id) => formInterne.setValue('candidat_interne_id', id, { shouldValidate: true })}
                  etudiants={etudiants}
                  excludeIds={excludeIds}
                  allowedSpecialiteIds={allowedSpecialiteIds}
                />
                {formInterne.formState.errors.candidat_interne_id && (
                  <p className="text-xs text-destructive">{formInterne.formState.errors.candidat_interne_id.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                <Button type="submit" disabled={proposer.isPending}>Envoyer la proposition</Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="externe" className="mt-4">
            <form onSubmit={formExterne.handleSubmit(onSubmitExterne)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {([['prenom', 'Prénom'], ['nom', 'Nom']] as const).map(([field, label]) => (
                  <div key={field} className="space-y-1">
                    <Label>{label} <span className="text-destructive">*</span></Label>
                    <Input {...formExterne.register(field)} />
                    {formExterne.formState.errors[field] && (
                      <p className="text-xs text-destructive">{formExterne.formState.errors[field]?.message}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input {...formExterne.register('email')} type="email" />
                {formExterne.formState.errors.email && (
                  <p className="text-xs text-destructive">{formExterne.formState.errors.email.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Spécialité</Label>
                  <Input {...formExterne.register('specialite')} placeholder="Ex: Informatique" />
                </div>
                <div className="space-y-1">
                  <Label>Université</Label>
                  <Input {...formExterne.register('universite')} placeholder="Ex: USTHB" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Commentaire</Label>
                <Textarea {...formExterne.register('commentaire')} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                <Button type="submit" disabled={proposer.isPending}>Envoyer la proposition</Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mes propositions ─────────────────────────────────────────────────────────

function MesPropositions({ affectationId }: { affectationId: string }) {
  const [open, setOpen] = useState(false);
  const { data: propositions = [], isLoading } = usePropositions(affectationId);

  if (isLoading) return null;
  if (propositions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Mes propositions
            <Badge variant="secondary" className="text-xs">{propositions.length}</Badge>
          </CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-2">
          {propositions.map((prop) => {
            const ext = prop.candidat_externe;
            const nom = prop.candidat_interne
              ? `${prop.candidat_interne.prenom} ${prop.candidat_interne.nom}`
              : ext ? `${ext.prenom} ${ext.nom} (externe)` : '—';
            return (
              <div key={prop.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{nom}</p>
                  {prop.candidat_interne?.email && (
                    <p className="text-xs text-muted-foreground">{prop.candidat_interne.email}</p>
                  )}
                  {ext?.universite && (
                    <p className="text-xs text-muted-foreground">{ext.universite}</p>
                  )}
                </div>
                <StatutBadge statut={prop.statut} />
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MonStartup() {
  const [showProposer, setShowProposer] = useState(false);
  const { data: monAffectation, isLoading: loadingAff } = useMonAffectation();

  const isStartup = monAffectation?.theme?.type_pfe === 'STARTUP';
  const { data: equipe, isLoading: loadingEquipe } = useStartupEquipe(
    isStartup ? monAffectation?.id : undefined,
  );

  if (loadingAff) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (!isStartup) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Rocket className="h-14 w-14 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold">Vous n'êtes pas dans une équipe Startup</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-sm">
            Cette page est réservée aux étudiants affectés à un thème de type Startup.
          </p>
        </div>
      </div>
    );
  }

  const totalMembers = (equipe?.startup_membres?.length ?? 0) + (equipe?.membres_externes?.length ?? 0) + (equipe?.etudiants?.length ?? 0);
  const peutAjouter = totalMembers < 6;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Rocket className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold tracking-tight">Mon équipe Startup</h1>
        </div>
        <p className="text-muted-foreground text-sm">{equipe?.theme?.titre ?? '...'}</p>
      </div>

      {/* Encadrant */}
      {equipe?.encadrant && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Encadrant</p>
              <p className="text-sm font-semibold">{equipe.encadrant.prenom} {equipe.encadrant.nom}</p>
              <p className="text-xs text-muted-foreground">{equipe.encadrant.email}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Équipe */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Membres de l'équipe
              <Badge variant="secondary" className="text-xs">{totalMembers} / 6</Badge>
            </CardTitle>
            {peutAjouter && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => setShowProposer(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                Proposer un membre
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingEquipe ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="divide-y">
              {equipe?.startup_membres?.map((m) => (
                <MembreCard
                  key={m.id}
                  prenom={m.etudiant.prenom}
                  nom={m.etudiant.nom}
                  email={m.etudiant.email}
                  specialite={m.etudiant.specialite?.nom}
                />
              ))}
              {equipe?.etudiants?.map((ae) => (
                <MembreCard
                  key={ae.etudiant.id}
                  prenom={ae.etudiant.prenom}
                  nom={ae.etudiant.nom}
                  email={ae.etudiant.email}
                  specialite={ae.etudiant.specialite?.nom}
                />
              ))}
              {equipe?.membres_externes?.map((m) => (
                <MembreCard
                  key={m.id}
                  prenom={m.prenom}
                  nom={m.nom}
                  email={m.email}
                  specialite={m.universite ?? m.specialite ?? undefined}
                  tag="Externe"
                />
              ))}
              {totalMembers === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun membre pour l'instant</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spécialités */}
      {(equipe?.theme?.theme_specialites?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Spécialités :</span>
          {equipe!.theme!.theme_specialites?.map((ts) => (
            <Badge key={ts.specialite.id} variant="outline" className="text-xs">{ts.specialite.nom}</Badge>
          ))}
        </div>
      )}

      <Separator />

      {/* Mes propositions */}
      <MesPropositions affectationId={monAffectation!.id} />

      {/* Encadrant externe (info) */}
      {equipe?.theme?.encadrant_externe && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-start gap-3">
            <Building2 className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-1">Encadrant externe</p>
              {(() => {
                const ext = equipe.theme!.encadrant_externe as { prenom?: string; nom?: string; email?: string; institution?: string } | null;
                return ext ? (
                  <div className="text-sm text-orange-800 space-y-0.5">
                    <p className="font-semibold">{ext.prenom} {ext.nom}</p>
                    {ext.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{ext.email}</p>}
                    {ext.institution && <p className="flex items-center gap-1"><Globe className="h-3 w-3" />{ext.institution}</p>}
                  </div>
                ) : null;
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      {showProposer && (
        <ProposerDialog
          affectationId={monAffectation!.id}
          onClose={() => setShowProposer(false)}
          excludeIds={[
            ...(equipe?.startup_membres?.map((m) => m.etudiant.id) ?? []),
            ...(equipe?.etudiants?.map((ae) => ae.etudiant.id) ?? []),
          ]}
          allowedSpecialiteIds={equipe?.theme?.theme_specialites?.map((ts) => ts.specialite.id)}
        />
      )}
    </div>
  );
}
