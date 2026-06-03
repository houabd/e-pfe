import { useMemo, useState } from 'react';
import {
  Bell, BookOpen, Check, ChevronDown, Filter,
  Mail, Users, X, Rocket, UserPlus, GraduationCap, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDemandesEnseignant, useAcceptChoix, useRefuseChoix } from '@/hooks/useChoix';
import { useThemes, useUpdateTheme, useThemesAwaitingConfirmation, useConfirmEncadrant, useRefuseEncadrant } from '@/hooks/useThemes';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import { useCurrentUser } from '@/stores/authStore';
import type { DemandeEnseignant } from '@/services/choix.api';
import type { Theme } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return type === 'STARTUP' ? (
    <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-xs gap-1">
      <Rocket className="h-3 w-3" />STARTUP
    </Badge>
  ) : (
    <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs gap-1">
      <BookOpen className="h-3 w-3" />CLASSIQUE
    </Badge>
  );
}

function OrdreBadge({ ordre }: { ordre: number }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
      {ordre}
    </div>
  );
}

function EtudiantInfo({
  etudiant,
  label,
}: {
  etudiant: { nom: string; prenom: string; email: string; specialite?: { nom: string } | null };
  label?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
        {etudiant.prenom[0]}{etudiant.nom[0]}
      </div>
      <div className="min-w-0">
        {label && <p className="text-xs text-muted-foreground mb-0.5">{label}</p>}
        <p className="text-sm font-medium">{etudiant.prenom} {etudiant.nom}</p>
        <a
          href={`mailto:${etudiant.email}`}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate"
        >
          <Mail className="h-3 w-3 shrink-0" />
          {etudiant.email}
        </a>
        {etudiant.specialite && (
          <Badge variant="outline" className="mt-1 text-xs">
            {etudiant.specialite.nom}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ─── Filtre spécialité ────────────────────────────────────────────────────────

function SpecialiteFilterBtn({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { data: specialites = [] } = useActiveSpecialites();
  const label = value
    ? (specialites.find((s) => s.id === value)?.nom ?? 'Filtre')
    : 'Toutes les spécialités';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 p-1.5">
        <button
          className={`w-full text-left rounded px-2.5 py-1.5 text-sm transition-colors ${
            value === null ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
          }`}
          onClick={() => onChange(null)}
        >
          Toutes les spécialités
        </button>
        <div className="border-t my-1" />
        {specialites.map((s) => (
          <button
            key={s.id}
            className={`w-full text-left rounded px-2.5 py-1.5 text-sm transition-colors ${
              value === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => onChange(s.id)}
          >
            {s.nom}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Dialog détail — Tab 1 ────────────────────────────────────────────────────

function ChoixDetailDialog({
  demande,
  onClose,
}: {
  demande: DemandeEnseignant;
  onClose: () => void;
}) {
  const accept = useAcceptChoix();
  const refuse = useRefuseChoix();

  const partner = demande.binome
    ? demande.etudiant.id === demande.binome.etud1.id
      ? demande.binome.etud2
      : demande.binome.etud1
    : null;

  async function handleAccept() {
    await accept.mutateAsync(demande.id);
    onClose();
  }

  async function handleRefuse() {
    await refuse.mutateAsync(demande.id);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">
            Demande pour « {demande.theme.titre} »
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Étudiant(s) */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              {partner ? 'Binôme candidat' : 'Étudiant candidat'}
            </p>
            <EtudiantInfo etudiant={demande.etudiant} label={partner ? 'Porteur du dossier' : undefined} />
            {partner && (
              <EtudiantInfo etudiant={partner} label="Partenaire de binôme" />
            )}
          </div>

          <Separator />

          {/* Thème */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Thème concerné
            </p>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{demande.theme.titre}</p>
              </div>
              <TypeBadge type={demande.theme.type_pfe} />
            </div>
          </div>

          <Separator />

          {/* Ordre de préférence */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <OrdreBadge ordre={demande.ordre} />
            <p className="text-sm text-muted-foreground">
              Ce thème est leur <strong>choix n°{demande.ordre}</strong> par ordre de préférence.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            disabled={refuse.isPending}
            onClick={handleRefuse}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Refuser
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={accept.isPending}
            onClick={handleAccept}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Accepter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Groupe thème — Tab 1 ─────────────────────────────────────────────────────

function ThemeGroup({
  theme,
  choices,
  onOpenDetail,
}: {
  theme: { id: string; titre: string; type_pfe: string };
  choices: DemandeEnseignant[];
  onOpenDetail: (d: DemandeEnseignant) => void;
}) {
  const accept = useAcceptChoix();
  const refuse = useRefuseChoix();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between gap-3 text-sm">
          <span className="flex-1 leading-snug">{theme.titre}</span>
          <div className="flex items-center gap-2 shrink-0">
            <TypeBadge type={theme.type_pfe} />
            <Badge variant="secondary" className="text-xs">
              {choices.length} demande{choices.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {choices.map((d, i) => {
          const partner = d.binome
            ? d.etudiant.id === d.binome.etud1.id ? d.binome.etud2 : d.binome.etud1
            : null;

          return (
            <div key={d.id}>
              {i > 0 && <Separator className="my-3" />}
              <div className="flex items-start gap-3">
                <OrdreBadge ordre={d.ordre} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Étudiant principal */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{d.etudiant.prenom} {d.etudiant.nom}</p>
                    {d.etudiant.specialite && (
                      <Badge variant="outline" className="text-xs">{d.etudiant.specialite.nom}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{d.etudiant.email}</p>

                  {/* Partenaire de binôme */}
                  {partner && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3 shrink-0" />
                      <span>Binôme avec <strong className="text-foreground">{partner.prenom} {partner.nom}</strong></span>
                      {partner.specialite && (
                        <Badge variant="outline" className="text-xs ml-1">{partner.specialite.nom}</Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => onOpenDetail(d)}
                  >
                    Détail
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50"
                    disabled={refuse.isPending}
                    onClick={() => refuse.mutate(d.id)}
                    title="Refuser"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700"
                    disabled={accept.isPending}
                    onClick={() => accept.mutate(d.id)}
                    title="Accepter"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Dialog détail — Tab 2 ────────────────────────────────────────────────────

function ThemeEncadrantDialog({
  theme,
  onClose,
}: {
  theme: Theme;
  onClose: () => void;
}) {
  const user = useCurrentUser();
  const updateTheme = useUpdateTheme();

  async function handleClaimEncadrant() {
    if (!user) return;
    await updateTheme.mutateAsync({
      id: theme.id,
      dto: { encadrant_id: user.id, besoin_encadrant: false },
    });
    onClose();
  }

  const SOUS_TYPE_LABEL: Record<string, string> = {
    RECHERCHE: 'Recherche',
    PROFESSIONNEL: 'Professionnel',
    LES_DEUX: 'Recherche & Professionnel',
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="leading-snug text-base">{theme.titre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={theme.type_pfe} />
            {theme.sous_types.map((st) => (
              <Badge key={st} variant="outline" className="text-xs">
                {SOUS_TYPE_LABEL[st] ?? st}
              </Badge>
            ))}
            {theme.necessite_stage && (
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                Stage requis
              </Badge>
            )}
          </div>

          {/* Proposant */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Proposé par
            </p>
            <EtudiantInfo etudiant={theme.propose_par} />
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Description
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {theme.description}
            </p>
          </div>

          {/* Spécialités */}
          {theme.theme_specialites.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Spécialités ciblées
              </p>
              <div className="flex flex-wrap gap-1.5">
                {theme.theme_specialites.map(({ specialite }) => (
                  <Badge key={specialite.id} variant="secondary" className="text-xs">
                    {specialite.nom}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Mots-clés */}
          {theme.mots_cles.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Mots-clés
              </p>
              <div className="flex flex-wrap gap-1.5">
                {theme.mots_cles.map((mc) => (
                  <span key={mc} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    #{mc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button
            className="gap-2"
            disabled={updateTheme.isPending}
            onClick={handleClaimEncadrant}
          >
            <UserPlus className="h-4 w-4" />
            Me positionner comme encadrant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte thème cherchant encadrant — Tab 2 ─────────────────────────────────

function ThemeEncadrantCard({
  theme,
  onOpenDetail,
}: {
  theme: Theme;
  onOpenDetail: (t: Theme) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold line-clamp-2">{theme.titre}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{theme.description}</p>
          </div>
          <TypeBadge type={theme.type_pfe} />
        </div>

        {/* Proposant */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong className="text-foreground">{theme.propose_par.prenom} {theme.propose_par.nom}</strong>
            {' — '}
            <a href={`mailto:${theme.propose_par.email}`} className="text-blue-600 hover:underline">
              {theme.propose_par.email}
            </a>
          </span>
        </div>

        {/* Spécialités */}
        {theme.theme_specialites.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {theme.theme_specialites.map(({ specialite }) => (
              <Badge key={specialite.id} variant="outline" className="text-xs">
                {specialite.nom}
              </Badge>
            ))}
          </div>
        )}

        {/* Mots-clés */}
        {theme.mots_cles.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {theme.mots_cles.slice(0, 5).map((mc) => `#${mc}`).join(' ')}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onOpenDetail(theme)}>
            Voir le détail
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dialog confirmation encadrant — Tab 3 ───────────────────────────────────

function ConfirmEncadrantDialog({
  theme,
  onClose,
}: {
  theme: Theme;
  onClose: () => void;
}) {
  const confirm = useConfirmEncadrant();
  const refuse = useRefuseEncadrant();

  const SOUS_TYPE_LABEL: Record<string, string> = {
    RECHERCHE: 'Recherche',
    PROFESSIONNEL: 'Professionnel',
    LES_DEUX: 'Recherche & Professionnel',
  };

  async function handleConfirm() {
    await confirm.mutateAsync(theme.id);
    onClose();
  }

  async function handleRefuse() {
    await refuse.mutateAsync(theme.id);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="leading-snug text-base">{theme.titre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Un étudiant vous a désigné comme encadrant pour ce thème. Confirmez votre supervision ou refusez — dans ce cas le thème sera remis en attente d'un encadrant.
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={theme.type_pfe} />
            {theme.sous_types.map((st) => (
              <Badge key={st} variant="outline" className="text-xs">
                {SOUS_TYPE_LABEL[st] ?? st}
              </Badge>
            ))}
            {theme.necessite_stage && (
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                Stage requis
              </Badge>
            )}
          </div>

          {/* Proposant */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Proposé par
            </p>
            <EtudiantInfo etudiant={theme.propose_par} />
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Description
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {theme.description}
            </p>
          </div>

          {/* Spécialités */}
          {theme.theme_specialites.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Spécialités ciblées
              </p>
              <div className="flex flex-wrap gap-1.5">
                {theme.theme_specialites.map(({ specialite }) => (
                  <Badge key={specialite.id} variant="secondary" className="text-xs">
                    {specialite.nom}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Mots-clés */}
          {theme.mots_cles.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Mots-clés
              </p>
              <div className="flex flex-wrap gap-1.5">
                {theme.mots_cles.map((mc) => (
                  <span key={mc} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    #{mc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            disabled={refuse.isPending}
            onClick={handleRefuse}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Refuser
          </Button>
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={confirm.isPending}
            onClick={handleConfirm}
          >
            <ShieldCheck className="h-4 w-4" />
            Confirmer ma supervision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte thème à confirmer — Tab 3 ─────────────────────────────────────────

function ThemeConfirmationCard({
  theme,
  onOpenDetail,
}: {
  theme: Theme;
  onOpenDetail: (t: Theme) => void;
}) {
  const confirm = useConfirmEncadrant();
  const refuse = useRefuseEncadrant();

  return (
    <Card className="hover:shadow-md transition-shadow border-amber-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold line-clamp-2">{theme.titre}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{theme.description}</p>
          </div>
          <TypeBadge type={theme.type_pfe} />
        </div>

        {/* Proposant */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong className="text-foreground">{theme.propose_par.prenom} {theme.propose_par.nom}</strong>
            {' — '}
            <a href={`mailto:${theme.propose_par.email}`} className="text-blue-600 hover:underline">
              {theme.propose_par.email}
            </a>
          </span>
        </div>

        {/* Spécialités */}
        {theme.theme_specialites.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {theme.theme_specialites.map(({ specialite }) => (
              <Badge key={specialite.id} variant="outline" className="text-xs">
                {specialite.nom}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => onOpenDetail(theme)}>
            Voir le détail
          </Button>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 border-red-200 text-red-600 hover:bg-red-50"
              disabled={refuse.isPending}
              onClick={() => refuse.mutate(theme.id)}
            >
              <X className="h-3.5 w-3.5" />
              Refuser
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={confirm.isPending}
              onClick={() => confirm.mutate(theme.id)}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Confirmer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DemandesEnAttente() {
  const [specialiteTab1, setSpecialiteTab1] = useState<string | null>(null);
  const [specialiteTab2, setSpecialiteTab2] = useState<string | null>(null);
  const [detailDemande, setDetailDemande] = useState<DemandeEnseignant | null>(null);
  const [detailTheme, setDetailTheme] = useState<Theme | null>(null);
  const [detailConfirmation, setDetailConfirmation] = useState<Theme | null>(null);

  // ── Tab 1 data ─────────────────────────────────────────────────────────────
  const { data: demandes = [], isLoading: loadingDemandes } = useDemandesEnseignant();

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { theme: { id: string; titre: string; type_pfe: string }; choices: DemandeEnseignant[] }
    >();
    for (const d of demandes) {
      if (!map.has(d.theme.id)) {
        map.set(d.theme.id, { theme: d.theme, choices: [] });
      }
      map.get(d.theme.id)!.choices.push(d);
    }
    return Array.from(map.values());
  }, [demandes]);

  const filteredGroups = useMemo(() => {
    if (!specialiteTab1) return grouped;
    return grouped
      .map((g) => ({
        ...g,
        choices: g.choices.filter((c) => {
          const etudiantMatch = c.etudiant.specialite?.id === specialiteTab1;
          const partnerMatch = c.binome
            ? c.binome.etud1.specialite?.id === specialiteTab1 ||
              c.binome.etud2.specialite?.id === specialiteTab1
            : false;
          return etudiantMatch || partnerMatch;
        }),
      }))
      .filter((g) => g.choices.length > 0);
  }, [grouped, specialiteTab1]);

  // ── Tab 2 data ─────────────────────────────────────────────────────────────
  const { data: themesResponse, isLoading: loadingThemes } = useThemes({
    besoin_encadrant: true,
    is_affecte: false,
    specialite_id: specialiteTab2 ?? undefined,
    limit: 50,
  });

  const themesCherchandEncadrant: Theme[] = (themesResponse?.data ?? []) as Theme[];

  // ── Tab 3 data ─────────────────────────────────────────────────────────────
  const { data: themesAConfirmer = [], isLoading: loadingConfirmation } = useThemesAwaitingConfirmation();

  const totalDemandes = demandes.length;
  const totalThemes = themesCherchandEncadrant.length;
  const totalConfirmation = themesAConfirmer.length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Demandes en attente
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gérez les demandes de vos thèmes et les propositions cherchant un encadrant.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="demandes" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="demandes" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Demandes d'attribution
            {totalDemandes > 0 && (
              <Badge className="bg-rose-500 text-white text-xs px-1.5 py-0 h-5 hover:bg-rose-500">
                {totalDemandes}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="encadrant" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Cherchent un encadrant
            {totalThemes > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                {totalThemes}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmation" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            À confirmer
            {totalConfirmation > 0 && (
              <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0 h-5 hover:bg-amber-500">
                {totalConfirmation}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1 : Demandes d'attribution ─── */}
        <TabsContent value="demandes" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredGroups.length} thème{filteredGroups.length !== 1 ? 's' : ''} avec des demandes
            </p>
            <SpecialiteFilterBtn value={specialiteTab1} onChange={setSpecialiteTab1} />
          </div>

          {loadingDemandes ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium">Aucune demande en attente</p>
              <p className="text-sm text-muted-foreground mt-1">
                {specialiteTab1
                  ? 'Aucune demande pour cette spécialité.'
                  : 'Les étudiants n\'ont pas encore choisi vos thèmes.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map(({ theme, choices }) => (
                <ThemeGroup
                  key={theme.id}
                  theme={theme}
                  choices={choices}
                  onOpenDetail={setDetailDemande}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2 : Thèmes cherchant encadrant ─── */}
        <TabsContent value="encadrant" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {themesCherchandEncadrant.length} thème{themesCherchandEncadrant.length !== 1 ? 's' : ''} sans encadrant
            </p>
            <SpecialiteFilterBtn value={specialiteTab2} onChange={setSpecialiteTab2} />
          </div>

          {loadingThemes ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : themesCherchandEncadrant.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium">Aucun thème ne cherche d'encadrant</p>
              <p className="text-sm text-muted-foreground mt-1">
                {specialiteTab2
                  ? 'Aucun résultat pour cette spécialité.'
                  : 'Tous les thèmes ont un encadrant assigné.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {themesCherchandEncadrant.map((theme) => (
                <ThemeEncadrantCard
                  key={theme.id}
                  theme={theme}
                  onOpenDetail={setDetailTheme}
                />
              ))}
            </div>
          )}
        </TabsContent>
        {/* ── TAB 3 : Thèmes à confirmer ─── */}
        <TabsContent value="confirmation" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {totalConfirmation} thème{totalConfirmation !== 1 ? 's' : ''} en attente de votre confirmation d'encadrement
            </p>
          </div>

          {loadingConfirmation ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : themesAConfirmer.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center">
              <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium">Aucun thème en attente de confirmation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vous n'avez pas été désigné encadrant sur des thèmes étudiants non encore confirmés.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {themesAConfirmer.map((theme) => (
                <ThemeConfirmationCard
                  key={theme.id}
                  theme={theme}
                  onOpenDetail={setDetailConfirmation}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {detailDemande && (
        <ChoixDetailDialog
          demande={detailDemande}
          onClose={() => setDetailDemande(null)}
        />
      )}
      {detailTheme && (
        <ThemeEncadrantDialog
          theme={detailTheme}
          onClose={() => setDetailTheme(null)}
        />
      )}
      {detailConfirmation && (
        <ConfirmEncadrantDialog
          theme={detailConfirmation}
          onClose={() => setDetailConfirmation(null)}
        />
      )}
    </div>
  );
}
