import { useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search, Users, Mail, GraduationCap, BookOpen, Rocket, Copy, Check, X,
  UserPlus, Building2, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, Globe, PenLine,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useMesEtudiants } from '@/hooks/useStats';
import {
  useMesStartups, usePropositions,
  useAddMembreInterne, useAddMembreExterne,
  useAccepterProposition, useRefuserProposition,
  useUpdateAffectationTheme,
} from '@/hooks/useAffectations';
import { useMyThemes } from '@/hooks/useThemes';
import { useUsers } from '@/hooks/useUsers';
import { useCurrentUser } from '@/stores/authStore';
import type { EtudiantEncadre, StartupEquipe, PropositionMembre } from '@/services/affectations.api';

// ─── Popup contact ──────────────────────────────────────────────────────────

function ContactDialog({
  etudiant,
  onClose,
}: {
  etudiant: EtudiantEncadre['etudiant'];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(etudiant.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary">
                {etudiant.prenom[0]}{etudiant.nom[0]}
              </span>
            </div>
            <div>
              <div>{etudiant.prenom} {etudiant.nom}</div>
              {etudiant.specialite && (
                <div className="text-xs font-normal text-muted-foreground">{etudiant.specialite.nom}</div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Adresse email universitaire
            </p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-mono flex-1 select-all">{etudiant.email}</span>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Copier l'adresse"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copiez l'adresse pour l'utiliser dans votre client de messagerie.
            </p>
          </div>

          {etudiant.matricule && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Matricule
              </p>
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm font-mono">
                {etudiant.matricule}
              </div>
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full mt-2" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Fermer
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog définir thème ─────────────────────────────────────────────────────

function DefinirThemeDialog({
  affectationId,
  onClose,
}: {
  affectationId: string;
  onClose: () => void;
}) {
  const updateTheme = useUpdateAffectationTheme();
  const { data: themesResponse, isLoading } = useMyThemes({ statut_validation: 'VALIDE', is_affecte: false });
  const themes = themesResponse?.data ?? [];
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  function handleConfirm() {
    if (!selectedThemeId) return;
    updateTheme.mutate({ affectationId, theme_id: selectedThemeId }, { onSuccess: onClose });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Définir le thème de l'affectation
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : themes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
            Vous n'avez aucun thème validé disponible.<br />
            Proposez d'abord un thème depuis «&nbsp;Mes thèmes&nbsp;».
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedThemeId(t.id)}
                className={`w-full flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${selectedThemeId === t.id ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.titre}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant={t.type_pfe === 'STARTUP' ? 'default' : 'secondary'} className="text-xs">{t.type_pfe}</Badge>
                  </div>
                </div>
                {selectedThemeId === t.id && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={!selectedThemeId || updateTheme.isPending}>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte étudiant ──────────────────────────────────────────────────────────

function EtudiantCard({
  item,
  onContact,
}: {
  item: EtudiantEncadre;
  onContact: (e: EtudiantEncadre['etudiant']) => void;
}) {
  const { etudiant, affectation } = item;
  const [definirTheme, setDefinirTheme] = useState(false);

  return (
    <>
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-primary">
              {etudiant.prenom[0]}{etudiant.nom[0]}
            </span>
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">
                  {etudiant.prenom} {etudiant.nom}
                </p>
                {etudiant.matricule && (
                  <p className="text-xs text-muted-foreground font-mono">{etudiant.matricule}</p>
                )}
              </div>
              {etudiant.specialite && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {etudiant.specialite.nom}
                </Badge>
              )}
            </div>

            {/* Thème */}
            <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {affectation.theme ? (
                <span className="line-clamp-2">{affectation.theme.titre}</span>
              ) : (
                <span className="italic">Thème à définir par l'enseignant</span>
              )}
            </div>

            <div className="mt-3">
              {affectation.theme?.type_pfe === 'STARTUP' ? (
                <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200 gap-1">
                  <Rocket className="h-3 w-3" />Startup
                </Badge>
              ) : affectation.theme ? (
                <Badge className="text-xs bg-[#e8e8e8] text-[#1a1a1a] border-[#e8e8e8] gap-1">
                  <BookOpen className="h-3 w-3" />Classique
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  En attente
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t flex gap-2">
          {!affectation.theme && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-2 border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => setDefinirTheme(true)}
            >
              <PenLine className="h-3.5 w-3.5" />
              Définir thème
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onContact(etudiant)}
          >
            <Mail className="h-3.5 w-3.5" />
            Contacter
          </Button>
        </div>
      </CardContent>
    </Card>

    {definirTheme && (
      <DefinirThemeDialog
        affectationId={affectation.id}
        onClose={() => setDefinirTheme(false)}
      />
    )}
  </>
  );
}

// ─── Carte binôme ────────────────────────────────────────────────────────────

function BinomeCard({
  items,
  onContact,
}: {
  items: [EtudiantEncadre, EtudiantEncadre];
  onContact: (e: EtudiantEncadre['etudiant']) => void;
}) {
  const theme = items[0].affectation.theme;
  const affectationId = items[0].affectation.id;
  const [definirTheme, setDefinirTheme] = useState(false);

  return (
    <>
    <Card className="hover:shadow-md transition-shadow border-violet-200">
      <CardContent className="p-4 space-y-3">
        {/* Binôme badge + thème */}
        <div className="flex items-center gap-2">
          <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200 gap-1 shrink-0">
            <Users className="h-3 w-3" />Binôme
          </Badge>
          {theme ? (
            <span className="text-xs text-muted-foreground line-clamp-1 flex-1">{theme.titre}</span>
          ) : (
            <span className="text-xs text-muted-foreground italic flex-1">Thème à définir</span>
          )}
        </div>

        {/* Les deux étudiants */}
        <div className="space-y-2 divide-y">
          {items.map((item) => {
            const { etudiant } = item;
            return (
              <div key={etudiant.id} className="flex items-center gap-3 pt-2 first:pt-0">
                <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-violet-700">
                    {etudiant.prenom[0]}{etudiant.nom[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{etudiant.prenom} {etudiant.nom}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {etudiant.matricule && (
                      <span className="text-xs text-muted-foreground font-mono">{etudiant.matricule}</span>
                    )}
                    {etudiant.specialite && (
                      <Badge variant="outline" className="text-[10px] py-0">{etudiant.specialite.nom}</Badge>
                    )}
                  </div>
                </div>
                <button
                  className="text-muted-foreground hover:text-primary transition-colors p-1 shrink-0"
                  title={`Contacter ${etudiant.prenom}`}
                  onClick={() => onContact(etudiant)}
                >
                  <Mail className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Type badge + action */}
        <div className="pt-1 border-t flex items-center justify-between gap-2">
          <div>
            {theme?.type_pfe === 'STARTUP' ? (
              <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200 gap-1">
                <Rocket className="h-3 w-3" />Startup
              </Badge>
            ) : theme ? (
              <Badge className="text-xs bg-[#e8e8e8] text-[#1a1a1a] border-[#e8e8e8] gap-1">
                <BookOpen className="h-3 w-3" />Classique
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">En attente</Badge>
            )}
          </div>
          {!theme && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => setDefinirTheme(true)}
            >
              <PenLine className="h-3 w-3" />Définir thème
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {definirTheme && (
      <DefinirThemeDialog
        affectationId={affectationId}
        onClose={() => setDefinirTheme(false)}
      />
    )}
  </>
  );
}

// ─── Schémas ajout membre ─────────────────────────────────────────────────────

const schemaExterne = z.object({
  nom: z.string().min(1, 'Requis'), prenom: z.string().min(1, 'Requis'),
  email: z.string().email('Email invalide'),
  specialite: z.string().optional(), universite: z.string().optional(), commentaire: z.string().optional(),
});

// ─── Dialog ajout membre (encadrant) ─────────────────────────────────────────

function AjouterMembreDialog({ startup, onClose }: { startup: StartupEquipe; onClose: () => void }) {
  const addInterne = useAddMembreInterne();
  const addExterne = useAddMembreExterne();
  const { data: etudiantsData } = useUsers({ role: 'ETUDIANT', limit: 500 });
  const etudiants = etudiantsData?.data ?? [];

  const [selectedEtudiant, setSelectedEtudiant] = useState('');
  const formExterne = useForm<z.infer<typeof schemaExterne>>({ resolver: zodResolver(schemaExterne) });

  const onSubmitInterne = () => {
    if (!selectedEtudiant) return;
    addInterne.mutate(
      { affectationId: startup.id, dto: { etudiant_id: selectedEtudiant } },
      { onSuccess: () => { toast.success("Invitation envoyée — l'étudiant doit accepter pour rejoindre l'équipe"); onClose(); } },
    );
  };

  const onSubmitExterne = (values: z.infer<typeof schemaExterne>) => {
    addExterne.mutate({ affectationId: startup.id, dto: values }, { onSuccess: onClose });
  };

  const totalMembers = startup.startup_membres.length + startup.membres_externes.length + (startup.etudiants?.length ?? 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Ajouter un membre — {startup.theme?.titre}
            <Badge variant="secondary" className="text-xs">{totalMembers}/6</Badge>
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="interne">
          <TabsList className="w-full">
            <TabsTrigger value="interne" className="flex-1">Étudiant interne</TabsTrigger>
            <TabsTrigger value="externe" className="flex-1">Membre externe</TabsTrigger>
          </TabsList>

          <TabsContent value="interne" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Étudiant <span className="text-destructive">*</span></Label>
              <select
                value={selectedEtudiant}
                onChange={(e) => setSelectedEtudiant(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sélectionner...</option>
                {etudiants.map((e) => (
                  <option key={e.id} value={e.id}>{e.prenom} {e.nom} — {e.email}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={onSubmitInterne} disabled={!selectedEtudiant || addInterne.isPending}>Ajouter</Button>
            </div>
          </TabsContent>

          <TabsContent value="externe" className="mt-4">
            <form onSubmit={formExterne.handleSubmit(onSubmitExterne)} className="space-y-3">
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
                <div className="space-y-1"><Label>Spécialité</Label><Input {...formExterne.register('specialite')} /></div>
                <div className="space-y-1"><Label>Université</Label><Input {...formExterne.register('universite')} /></div>
              </div>
              <div className="space-y-1"><Label>Commentaire</Label><Textarea {...formExterne.register('commentaire')} rows={2} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                <Button type="submit" disabled={addExterne.isPending}>Ajouter</Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte proposition ────────────────────────────────────────────────────────

function PropositionRow({ prop, affectationId }: { prop: PropositionMembre; affectationId: string }) {
  const accepter = useAccepterProposition();
  const refuser = useRefuserProposition();
  const currentUser = useCurrentUser();
  const ext = prop.candidat_externe;
  const nom = prop.candidat_interne
    ? `${prop.candidat_interne.prenom} ${prop.candidat_interne.nom}`
    : ext ? `${ext.prenom} ${ext.nom} (externe)` : '—';

  // Invitation envoyée par l'encadrant (moi), en attente de réponse de l'étudiant
  const isMyInvitation = prop.proposeur_id === currentUser?.id && !prop.etudiant_accepte;

  return (
    <div className="flex items-center justify-between py-2 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{nom}</p>
        {isMyInvitation ? (
          <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />En attente de réponse de l'étudiant
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Proposé par {prop.proposeur.prenom} {prop.proposeur.nom}
          </p>
        )}
        {prop.candidat_interne?.email && <p className="text-xs text-muted-foreground">{prop.candidat_interne.email}</p>}
        {ext?.universite && <p className="text-xs text-muted-foreground">{ext.universite}</p>}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {isMyInvitation ? (
          <Button size="sm" variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            disabled={refuser.isPending}
            onClick={() => refuser.mutate({ affectationId, propId: prop.id })}>
            <XCircle className="h-3.5 w-3.5 mr-1" />Annuler
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline"
              className="h-7 text-xs border-green-600 text-green-700 hover:bg-green-50"
              disabled={accepter.isPending}
              onClick={() => accepter.mutate({ affectationId, propId: prop.id })}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Accepter
            </Button>
            <Button size="sm" variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              disabled={refuser.isPending}
              onClick={() => refuser.mutate({ affectationId, propId: prop.id })}>
              <XCircle className="h-3.5 w-3.5 mr-1" />Refuser
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Carte startup ────────────────────────────────────────────────────────────

function StartupCard({ startup }: { startup: StartupEquipe }) {
  const [open, setOpen] = useState(false);
  const [showAjouter, setShowAjouter] = useState(false);
  const { data: propositions = [] } = usePropositions(startup.id);
  const pending = propositions.filter((p) => p.statut === 'PENDING');

  const totalMembers = startup.startup_membres.length + startup.membres_externes.length + (startup.etudiants?.length ?? 0);
  const peutAjouter = totalMembers < 6;

  return (
    <>
      <Card className="border-orange-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Rocket className="h-4 w-4 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{startup.theme?.titre ?? 'Thème non défini'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalMembers} membre{totalMembers !== 1 ? 's' : ''} · max 6
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {pending.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
                  <Clock className="h-3 w-3" />{pending.length} proposition{pending.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {peutAjouter && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAjouter(true)}>
                  <UserPlus className="h-3.5 w-3.5" />Ajouter
                </Button>
              )}
              <button onClick={() => setOpen((v) => !v)} className="text-muted-foreground hover:text-foreground p-1">
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardHeader>

        {open && (
          <CardContent className="pt-0 space-y-4">
            {/* Membres internes */}
            {(startup.startup_membres.length > 0 || (startup.etudiants?.length ?? 0) > 0) && (
              <div className="divide-y">
                {startup.startup_membres.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {m.etudiant.prenom[0]}{m.etudiant.nom[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.etudiant.prenom} {m.etudiant.nom}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.etudiant.email}</p>
                    </div>
                    {m.etudiant.specialite && (
                      <Badge variant="outline" className="text-xs shrink-0">{m.etudiant.specialite.nom}</Badge>
                    )}
                  </div>
                ))}
                {startup.etudiants?.map((ae) => (
                  <div key={ae.etudiant.id} className="flex items-center gap-3 py-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {ae.etudiant.prenom[0]}{ae.etudiant.nom[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ae.etudiant.prenom} {ae.etudiant.nom}</p>
                      <p className="text-xs text-muted-foreground truncate">{ae.etudiant.email}</p>
                    </div>
                    {ae.etudiant.specialite && (
                      <Badge variant="outline" className="text-xs shrink-0">{ae.etudiant.specialite.nom}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Membres externes */}
            {startup.membres_externes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Membres externes</p>
                  <div className="divide-y">
                    {startup.membres_externes.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 py-2.5">
                        <div className="h-8 w-8 rounded-full bg-[#e8e8e8] flex items-center justify-center shrink-0">
                          <Globe className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.prenom} {m.nom}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                          {m.universite && <p className="text-xs text-muted-foreground">{m.universite}</p>}
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">Externe</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Propositions en attente */}
            {pending.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    Propositions en attente
                  </p>
                  <div className="divide-y">
                    {pending.map((prop) => (
                      <PropositionRow key={prop.id} prop={prop} affectationId={startup.id} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Encadrant externe */}
            {startup.theme?.encadrant_externe && (() => {
              const ext = startup.theme!.encadrant_externe as { prenom?: string; nom?: string; email?: string; institution?: string } | null;
              return ext ? (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm text-orange-700">
                    <Building2 className="h-4 w-4 text-orange-500 shrink-0" />
                    <span className="font-medium">{ext.prenom} {ext.nom}</span>
                    {ext.institution && <span className="text-xs text-muted-foreground">— {ext.institution}</span>}
                  </div>
                </>
              ) : null;
            })()}
          </CardContent>
        )}
      </Card>

      {showAjouter && <AjouterMembreDialog startup={startup} onClose={() => setShowAjouter(false)} />}
    </>
  );
}

// ─── Section équipes Startup ──────────────────────────────────────────────────

function StartupSection() {
  const { data: startups = [], isLoading } = useMesStartups();

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (startups.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Rocket className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-semibold">Équipes Startup</h2>
        <Badge variant="secondary">{startups.length}</Badge>
      </div>
      {startups.map((startup) => <StartupCard key={startup.id} startup={startup} />)}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function EtudiantsEncadres() {
  const [search, setSearch] = useState('');
  const [contactTarget, setContactTarget] = useState<EtudiantEncadre['etudiant'] | null>(null);

  const { data: etudiants = [], isLoading } = useMesEtudiants();

  // STARTUP students are displayed in StartupSection — exclude them from the classic grid
  const classiques = etudiants.filter((item) => item.affectation.theme?.type_pfe !== 'STARTUP');

  const filtered = classiques.filter((item) => {
    const q = search.toLowerCase();
    const { etudiant, affectation } = item;
    return (
      !q ||
      etudiant.nom.toLowerCase().includes(q) ||
      etudiant.prenom.toLowerCase().includes(q) ||
      etudiant.email.toLowerCase().includes(q) ||
      (affectation.theme?.titre ?? '').toLowerCase().includes(q)
    );
  });

  const groups: Array<
    | { type: 'binome'; items: [EtudiantEncadre, EtudiantEncadre] }
    | { type: 'solo'; item: EtudiantEncadre }
  > = [];
  const seenGroups = new Set<string>();
  for (const item of filtered) {
    if (seenGroups.has(item.id)) continue;
    seenGroups.add(item.id);

    // Grouper par binome_id (lien social formel) OU par affectation.id
    // (2 étudiants affectés ensemble par l'admin sans binôme formel préalable)
    const partner = filtered.find((x) => {
      if (x.id === item.id) return false;
      if (item.binome_id && x.binome_id === item.binome_id) return true;
      if (!item.binome_id && x.affectation.id === item.affectation.id) return true;
      return false;
    });

    if (partner) {
      seenGroups.add(partner.id);
      groups.push({ type: 'binome', items: [item, partner] as [EtudiantEncadre, EtudiantEncadre] });
    } else {
      groups.push({ type: 'solo', item });
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Étudiants encadrés</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {etudiants.length} étudiant{etudiants.length !== 1 ? 's' : ''} sous votre encadrement
          </p>
        </div>
        {/* Stat badge */}
        <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-2.5">
          <GraduationCap className="h-5 w-5 text-indigo-500" />
          <span className="font-semibold text-indigo-700">{classiques.length}</span>
          <span className="text-sm text-muted-foreground">encadrés (classique)</span>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher par nom, email, thème..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Équipes Startup */}
      <StartupSection />

      {classiques.length > 0 && <Separator />}

      {/* Liste classique */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 && classiques.length === 0 ? null : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">
            {search ? 'Aucun résultat' : 'Aucun étudiant encadré (classique)'}
          </h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            {search
              ? "Essayez avec d'autres termes de recherche."
              : 'Les étudiants sur thèmes classiques apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) =>
            group.type === 'binome' ? (
              <BinomeCard
                key={`binome-${group.items[0].id}-${group.items[1].id}`}
                items={group.items}
                onContact={setContactTarget}
              />
            ) : (
              <EtudiantCard
                key={group.item.id}
                item={group.item}
                onContact={setContactTarget}
              />
            )
          )}
        </div>
      )}

      {/* Popup contact */}
      {contactTarget && (
        <ContactDialog
          etudiant={contactTarget}
          onClose={() => setContactTarget(null)}
        />
      )}
    </div>
  );
}
