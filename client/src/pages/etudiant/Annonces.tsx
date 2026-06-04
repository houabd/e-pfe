import { useState, useMemo, useRef } from 'react';
import { ThemeDetailDialog } from '@/components/themes/ThemeDetailDialog';
import { useAnnonces } from '@/hooks/useThemes';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import { useMonAffectation } from '@/hooks/useAffectations';
import type { AnnonceTheme } from '@/services/themes.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Search, Mail, User, BookOpen, Tag, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Multi-select spécialité ─────────────────────────────────────────────────

interface SpecialiteMultiSelectProps {
  specialites: { id: string; nom: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

function SpecialiteMultiSelect({ specialites, selected, onChange }: SpecialiteMultiSelectProps) {
  const label =
    selected.length === 0
      ? 'Toutes les spécialités'
      : selected.length === 1
        ? specialites.find((s) => s.id === selected[0])?.nom ?? '1 spécialité'
        : `${selected.length} spécialités`;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[200px] justify-between">
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {specialites.map((s) => (
          <DropdownMenuCheckboxItem
            key={s.id}
            checked={selected.includes(s.id)}
            onCheckedChange={() => toggle(s.id)}
          >
            {s.nom}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Popup contact ────────────────────────────────────────────────────────────

interface ContactDialogProps {
  annonce: AnnonceTheme | null;
  onClose: () => void;
}

function ContactDialog({ annonce, onClose }: ContactDialogProps) {
  const emailRef = useRef<HTMLSpanElement>(null);

  function copyEmail() {
    if (!annonce) return;
    void navigator.clipboard.writeText(annonce.propose_par.email);
  }

  return (
    <Dialog open={!!annonce} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contacter l'étudiant</DialogTitle>
        </DialogHeader>
        {annonce && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">
                  {annonce.propose_par.prenom} {annonce.propose_par.nom}
                </p>
                {annonce.propose_par.specialite && (
                  <p className="text-sm text-muted-foreground">
                    {annonce.propose_par.specialite.nom}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Thème</p>
              <p className="text-sm">{annonce.titre}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Adresse email</p>
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span ref={emailRef} className="flex-1 select-all font-mono text-sm">
                  {annonce.propose_par.email}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={copyEmail}
                >
                  Copier
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Contactez directement cet étudiant par email pour discuter d'une collaboration.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte annonce ────────────────────────────────────────────────────────────

interface AnnonceCardProps {
  annonce: AnnonceTheme;
  onContact: (a: AnnonceTheme) => void;
  onView: (id: string) => void;
}

function AnnonceCard({ annonce, onContact, onView }: AnnonceCardProps) {
  const proposant = annonce.propose_par;
  const specialites = annonce.theme_specialites.map((ts) => ts.specialite);

  return (
    <div onClick={() => onView(annonce.id)} className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md hover:border-primary/30 cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {specialites.map((s) => (
            <Badge key={s.id} variant="secondary" className="text-xs">
              {s.nom}
            </Badge>
          ))}
          <Badge variant="outline" className="text-xs">
            {annonce.type_pfe === 'CLASSIQUE' ? 'Classique' : 'Startup'}
          </Badge>
          {annonce.type_pfe === 'STARTUP' ? (
            <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
              Cherche des membres
            </Badge>
          ) : (
            <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
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

      <div>
        <h3 className="font-semibold leading-snug line-clamp-2">{annonce.titre}</h3>
        {annonce.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{annonce.description}</p>
        )}
      </div>

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

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <span>
            {proposant.prenom} {proposant.nom}
            {proposant.specialite && (
              <span className="ml-1 text-xs">· {proposant.specialite.nom}</span>
            )}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onContact(annonce); }}>
          <Mail className="mr-1.5 h-3.5 w-3.5" />
          {annonce.type_pfe === 'STARTUP' ? 'Rejoindre' : 'Contacter'}
        </Button>
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
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Annonces() {
  const [search, setSearch] = useState('');
  const [selectedSpecialites, setSelectedSpecialites] = useState<string[]>([]);
  const [contactAnnonce, setContactAnnonce] = useState<AnnonceTheme | null>(null);
  const [detailThemeId, setDetailThemeId] = useState<string | null>(null);

  const { data: affectation } = useMonAffectation();
  const isStartupMember = affectation?.theme?.type_pfe === 'STARTUP';

  const { data: annoncesResult, isLoading } = useAnnonces();
  const { data: specialites = [] } = useActiveSpecialites();

  const annonces = annoncesResult?.data ?? [];

  const filtered = useMemo(() => {
    let list = annonces;

    if (selectedSpecialites.length > 0) {
      list = list.filter((a) =>
        a.theme_specialites.some((ts) => selectedSpecialites.includes(ts.specialite.id)),
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.titre.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.mots_cles.some((mc) => mc.toLowerCase().includes(q)) ||
          `${a.propose_par.prenom} ${a.propose_par.nom}`.toLowerCase().includes(q),
      );
    }

    return list;
  }, [annonces, selectedSpecialites, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Annonces</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thèmes validés ouverts à un binôme (classique) ou à des membres d'équipe (STARTUP).
        </p>
      </div>

      {isStartupMember && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="flex items-start gap-3 pt-5 pb-5">
            <Info className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-purple-800 text-sm">
                Vous faites partie d'une équipe STARTUP
              </p>
              <p className="text-sm text-purple-700 mt-0.5">
                Les membres d'une équipe STARTUP ne peuvent pas consulter les annonces.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isStartupMember && (
        <>
      {/* Filtres */}
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
        {specialites.length > 0 && (
          <SpecialiteMultiSelect
            specialites={specialites}
            selected={selectedSpecialites}
            onChange={setSelectedSpecialites}
          />
        )}
        {(search || selectedSpecialites.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setSelectedSpecialites([]); }}
          >
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
        </p>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AnnonceSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Aucune annonce trouvée</p>
          {(search || selectedSpecialites.length > 0) && (
            <p className="mt-1 text-sm text-muted-foreground">
              Essayez de modifier vos filtres de recherche.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <AnnonceCard key={a.id} annonce={a} onContact={setContactAnnonce} onView={setDetailThemeId} />
          ))}
        </div>
      )}

      <ContactDialog annonce={contactAnnonce} onClose={() => setContactAnnonce(null)} />
      <ThemeDetailDialog themeId={detailThemeId} onClose={() => setDetailThemeId(null)} />
        </>
      )}
    </div>
  );
}
