import { useState, useMemo } from 'react';
import { ThemeDetailDialog } from '@/components/themes/ThemeDetailDialog';
import { useAnnonces } from '@/hooks/useThemes';
import { useDemanderBinome, useMonBinome, useDemandesEnvoyees } from '@/hooks/useBinomes';
import { useCurrentUser } from '@/stores/authStore';
import type { AnnonceTheme } from '@/services/themes.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Search, User, Tag, Info, Send, Clock, Mail, Copy, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Dialog contact ───────────────────────────────────────────────────────────

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
  prenom: string;
  nom: string;
  email: string;
}

function ContactDialog({ open, onClose, prenom, nom, email }: ContactDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Contacter {prenom} {nom}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="flex-1 text-sm font-medium break-all">{email}</span>
          <Button size="icon" variant="ghost" className="shrink-0 h-7 w-7" onClick={handleCopy}>
            {copied
              ? <Check className="h-3.5 w-3.5 text-green-600" />
              : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Envoyez un email à cet étudiant pour convenir d'un binôme.
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte annonce ────────────────────────────────────────────────────────────

interface AnnonceCardProps {
  annonce: AnnonceTheme;
  onView: (id: string) => void;
  hasBinome: boolean;
  demandeEnvoyeeIds: Set<string>;
  isPending: boolean;
  onDemander: (etudiantId: string) => void;
}

function AnnonceCard({
  annonce,
  onView,
  hasBinome,
  demandeEnvoyeeIds,
  isPending,
  onDemander,
}: AnnonceCardProps) {
  const proposant = annonce.propose_par;
  const specialites = annonce.theme_specialites.map((ts) => ts.specialite);
  const demandeEnvoyee = demandeEnvoyeeIds.has(proposant.id);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div
      onClick={() => onView(annonce.id)}
      className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md hover:border-primary/30 cursor-pointer"
    >
      <ContactDialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        prenom={proposant.prenom}
        nom={proposant.nom}
        email={proposant.email}
      />

      {/* Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {specialites.map((s) => (
            <Badge key={s.id} variant="secondary" className="text-xs">{s.nom}</Badge>
          ))}
          <Badge variant="outline" className="text-xs">
            {annonce.type_pfe === 'CLASSIQUE' ? 'Classique' : 'Startup'}
          </Badge>
          {annonce.type_pfe === 'STARTUP' ? (
            <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
              Cherche des membres
            </Badge>
          ) : (
            <Badge className="text-xs bg-[#e8e8e8] text-[#1a1a1a] border-[#e8e8e8] hover:bg-[#e8e8e8]">
              Cherche un binôme
            </Badge>
          )}
        </div>
        {annonce.session && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {annonce.session.annee_universitaire}
          </span>
        )}
      </div>

      {/* Titre + description */}
      <div>
        <h3 className="font-semibold leading-snug line-clamp-2">{annonce.titre}</h3>
        {annonce.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{annonce.description}</p>
        )}
      </div>

      {/* Mots-clés */}
      {annonce.mots_cles.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          {annonce.mots_cles.slice(0, 5).map((mc) => (
            <span key={mc} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {mc}
            </span>
          ))}
          {annonce.mots_cles.length > 5 && (
            <span className="text-xs text-muted-foreground">+{annonce.mots_cles.length - 5}</span>
          )}
        </div>
      )}

      {/* Proposant */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="flex-1 min-w-0 truncate">
          {proposant.prenom} {proposant.nom}
          {proposant.specialite && (
            <span className="ml-1 text-xs">· {proposant.specialite.nom}</span>
          )}
        </span>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 pt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => setContactOpen(true)}
        >
          <Mail className="mr-1.5 h-3.5 w-3.5" />
          Contacter
        </Button>

        {!hasBinome && (
          demandeEnvoyee ? (
            <Badge
              variant="outline"
              className="border-amber-300 text-amber-700 text-xs gap-1 pointer-events-none px-3 py-1.5"
            >
              <Clock className="h-3 w-3" />
              En attente
            </Badge>
          ) : (
            <Button
              size="sm"
              className="flex-1"
              disabled={isPending}
              onClick={() => onDemander(proposant.id)}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {annonce.type_pfe === 'STARTUP' ? 'Rejoindre' : 'Demander'}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function AnnonceSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-1 h-4 w-full" />
      <Skeleton className="mb-4 h-4 w-5/6" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Annonces() {
  const [search, setSearch] = useState('');
  const [detailThemeId, setDetailThemeId] = useState<string | null>(null);

  const user = useCurrentUser();
  const specialiteId = user?.specialite?.id;

  const { data: annoncesResult, isLoading } = useAnnonces(
    specialiteId ? { specialite_id: specialiteId } : undefined,
  );
  const { data: binome } = useMonBinome();
  const { data: demandesEnvoyees = [] } = useDemandesEnvoyees();
  const demander = useDemanderBinome();

  const hasBinome = !!binome;
  const demandeEnvoyeeIds = useMemo(
    () => new Set(demandesEnvoyees.map((d) => d.etud2.id)),
    [demandesEnvoyees],
  );

  const annonces = annoncesResult?.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return annonces;
    const q = search.toLowerCase();
    return annonces.filter(
      (a) =>
        a.titre.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.mots_cles.some((mc) => mc.toLowerCase().includes(q)) ||
        `${a.propose_par.prenom} ${a.propose_par.nom}`.toLowerCase().includes(q),
    );
  }, [annonces, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Annonces</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thèmes validés de votre spécialité ouverts à un binôme ou à des membres d'équipe (STARTUP).
        </p>
      </div>

      {hasBinome && (
        <Card className="border-[#e8e8e8] bg-[#f7f7f7]">
          <CardContent className="flex items-start gap-3 pt-5 pb-5">
            <Info className="h-5 w-5 text-[#1a1a1a] mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-[#1a1a1a] text-sm">Vous avez déjà un binôme</p>
              <p className="text-sm text-[#1a1a1a] mt-0.5">
                Vous pouvez toujours contacter les étudiants, mais vous ne pouvez plus envoyer de demande de binôme.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recherche */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher par titre, mots-clés, étudiant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Compteur */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {filtered.length === annonces.length
            ? `${annonces.length} annonce${annonces.length > 1 ? 's' : ''}`
            : `${filtered.length} sur ${annonces.length} annonce${annonces.length > 1 ? 's' : ''}`}
          {specialiteId && user?.specialite && (
            <span className="ml-2 text-xs text-primary/70">· {user.specialite.nom}</span>
          )}
        </p>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <AnnonceSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Aucune annonce trouvée</p>
          {search && (
            <p className="mt-1 text-sm text-muted-foreground">Essayez de modifier votre recherche.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <AnnonceCard
              key={a.id}
              annonce={a}
              onView={setDetailThemeId}
              hasBinome={hasBinome}
              demandeEnvoyeeIds={demandeEnvoyeeIds}
              isPending={demander.isPending}
              onDemander={(etudiantId) => demander.mutate(etudiantId)}
            />
          ))}
        </div>
      )}

      <ThemeDetailDialog themeId={detailThemeId} onClose={() => setDetailThemeId(null)} />
    </div>
  );
}
