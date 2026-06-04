import { useEffect, useMemo, useState } from 'react';
import {
  Users, Search, UserCheck, Clock, X, Check,
  Mail, BookOpen, Send, ChevronDown, Filter, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import {
  useMonBinome,
  useDemandesRecues,
  useDemandesEnvoyees,
  useDemanderBinome,
  useAcceptBinome,
  useRefuseBinome,
} from '@/hooks/useBinomes';
import { useMonAffectation } from '@/hooks/useAffectations';
import { useQuery } from '@tanstack/react-query';
import { rechercherEtudiants } from '@/services/binomes.api';
import type { EtudiantRecherche } from '@/services/binomes.api';
import { useCurrentUser } from '@/stores/authStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function Initiales({ nom, prenom, className }: { nom: string; prenom: string; className?: string }) {
  return (
    <span className={className}>
      {prenom[0]}{nom[0]}
    </span>
  );
}

// ─── Binôme actif ─────────────────────────────────────────────────────────────

function BinomeActif() {
  const user = useCurrentUser();
  const { data: binome, isLoading } = useMonBinome();

  if (isLoading) return <Skeleton className="h-28 w-full rounded-xl" />;
  if (!binome) return null;

  const partner = user?.id === binome.etud1.id ? binome.etud2 : binome.etud1;

  return (
    <Card className="border-emerald-200 bg-emerald-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-emerald-700 text-base">
          <UserCheck className="h-4 w-4" />
          Votre binôme
          <Badge className="ml-auto bg-emerald-600 hover:bg-emerald-600 text-white text-xs">Actif</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xl font-bold">
            <Initiales nom={partner.nom} prenom={partner.prenom} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-emerald-900 truncate">
              {partner.prenom} {partner.nom}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-emerald-700 truncate">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {partner.email}
            </p>
            {partner.specialite && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 mt-0.5">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                {partner.specialite.nom}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Demandes reçues ──────────────────────────────────────────────────────────

function DemandesRecues() {
  const { data: demandes = [], isLoading } = useDemandesRecues();
  const accept = useAcceptBinome();
  const refuse = useRefuseBinome();

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (demandes.length === 0) return null;

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
          <Clock className="h-4 w-4" />
          Demandes reçues
          <Badge variant="secondary" className="ml-1 text-xs">{demandes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {demandes.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
              <Initiales nom={d.etud1.nom} prenom={d.etud1.prenom} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{d.etud1.prenom} {d.etud1.nom}</p>
              <p className="text-xs text-muted-foreground truncate">{d.etud1.email}</p>
              {d.etud1.specialite && (
                <p className="text-xs text-muted-foreground">{d.etud1.specialite.nom}</p>
              )}
            </div>
            <p className="shrink-0 text-xs text-muted-foreground hidden sm:block">
              {formatDate(d.created_at)}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                disabled={refuse.isPending}
                onClick={() => refuse.mutate(d.id)}
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1">Refuser</span>
              </Button>
              <Button
                size="sm"
                className="h-8 bg-emerald-600 hover:bg-emerald-700"
                disabled={accept.isPending}
                onClick={() => accept.mutate(d.id)}
              >
                <Check className="h-3.5 w-3.5" />
                <span className="ml-1">Accepter</span>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Demandes envoyées ────────────────────────────────────────────────────────

function DemandesEnvoyees() {
  const { data: demandes = [], isLoading } = useDemandesEnvoyees();

  if (isLoading) return <Skeleton className="h-20 w-full rounded-xl" />;
  if (demandes.length === 0) return null;

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 text-base">
          <Send className="h-4 w-4" />
          Demande envoyée
          <Badge variant="secondary" className="ml-1 text-xs">{demandes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {demandes.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-semibold text-sm">
              <Initiales nom={d.etud2.nom} prenom={d.etud2.prenom} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{d.etud2.prenom} {d.etud2.nom}</p>
              <p className="text-xs text-muted-foreground truncate">{d.etud2.email}</p>
              {d.etud2.specialite && (
                <p className="text-xs text-muted-foreground">{d.etud2.specialite.nom}</p>
              )}
            </div>
            <Badge
              variant="outline"
              className="shrink-0 border-amber-300 text-amber-700 text-xs"
            >
              En attente
            </Badge>
          </div>
        ))}
        <p className="text-xs text-muted-foreground text-center pt-1">
          Attendez la réponse avant d'envoyer une nouvelle demande.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Multi-select spécialités ─────────────────────────────────────────────────

function SpecialiteMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: specialites = [] } = useActiveSpecialites();

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  }

  const label =
    selected.length === 0
      ? 'Toutes les spécialités'
      : selected.length === 1
        ? (specialites.find((s) => s.id === selected[0])?.nom ?? '1 spécialité')
        : `${selected.length} spécialités`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 justify-between min-w-[200px]">
          <span className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-2">
        {specialites.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-1.5">Aucune spécialité</p>
        )}
        {specialites.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-2.5 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
          >
            <Checkbox
              checked={selected.includes(s.id)}
              onCheckedChange={() => toggle(s.id)}
            />
            {s.nom}
          </label>
        ))}
        {selected.length > 0 && (
          <>
            <div className="border-t my-1" />
            <button
              className="w-full text-left rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              onClick={() => onChange([])}
            >
              Effacer les filtres
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Carte étudiant ───────────────────────────────────────────────────────────

function EtudiantCard({ etudiant }: { etudiant: EtudiantRecherche }) {
  const demander = useDemanderBinome();

  const statusBadge = (() => {
    if (etudiant.has_binome) {
      return (
        <Badge variant="secondary" className="text-xs shrink-0">
          Déjà en binôme
        </Badge>
      );
    }
    if (etudiant.demande_pending) {
      if (etudiant.demande_pending.direction === 'envoyee') {
        return (
          <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs shrink-0">
            Demande envoyée
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs shrink-0">
          Demande reçue
        </Badge>
      );
    }
    return null;
  })();

  const canSend = !etudiant.has_binome && !etudiant.demande_pending;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/30 transition-colors">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
        <Initiales nom={etudiant.nom} prenom={etudiant.prenom} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">
          {etudiant.prenom} {etudiant.nom}
        </p>
        <p className="text-xs text-muted-foreground truncate">{etudiant.email}</p>
        {etudiant.specialite && (
          <p className="text-xs text-muted-foreground">{etudiant.specialite.nom}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {statusBadge}
        {canSend && (
          <Button
            size="sm"
            className="h-8"
            disabled={demander.isPending}
            onClick={() => demander.mutate(etudiant.id)}
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            Demander
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Section recherche ────────────────────────────────────────────────────────

function RechercheSection() {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSpecialites, setSelectedSpecialites] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(inputValue.trim());
      if (inputValue.trim().length > 0 || selectedSpecialites.length > 0) {
        setEnabled(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, selectedSpecialites]);

  const { data: rawResults = [], isLoading, isFetching } = useQuery({
    queryKey: ['etudiants-recherche', debouncedSearch],
    queryFn: () => rechercherEtudiants(debouncedSearch || undefined),
    enabled,
    staleTime: 30_000,
  });

  const etudiants = useMemo(() => {
    if (selectedSpecialites.length === 0) return rawResults;
    return rawResults.filter(
      (e) => e.specialite && selectedSpecialites.includes(e.specialite.id),
    );
  }, [rawResults, selectedSpecialites]);

  const hasFilters = inputValue.trim().length > 0 || selectedSpecialites.length > 0;
  const isSearching = isLoading || isFetching;

  function handleSpecialiteChange(ids: string[]) {
    setSelectedSpecialites(ids);
    if (ids.length > 0 || inputValue.trim().length > 0) setEnabled(true);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4" />
          Rechercher un binôme
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barre de recherche + filtre */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Nom, prénom, email ou matricule…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-9"
            />
          </div>
          <SpecialiteMultiSelect
            selected={selectedSpecialites}
            onChange={handleSpecialiteChange}
          />
        </div>

        {/* État vide initial */}
        {!hasFilters && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Entrez un nom, email ou sélectionnez une spécialité pour rechercher.
          </p>
        )}

        {/* Chargement */}
        {isSearching && hasFilters && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[60px] w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Résultats */}
        {!isSearching && enabled && hasFilters && etudiants.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun étudiant disponible pour cette recherche.
          </p>
        )}

        {!isSearching && etudiants.length > 0 && (
          <div className="space-y-2">
            {etudiants.map((e) => (
              <EtudiantCard key={e.id} etudiant={e} />
            ))}
            {rawResults.length === 20 && selectedSpecialites.length === 0 && (
              <p className="text-center text-xs text-muted-foreground pt-1">
                Affichage limité à 20 résultats — affinez votre recherche.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function GestionBinome() {
  const { data: affectation, isLoading: loadingAff } = useMonAffectation();
  const { data: binome, isLoading: loadingBinome } = useMonBinome();
  const { data: demandesEnvoyees = [], isLoading: loadingEnvoyees } = useDemandesEnvoyees();

  const isStartupMember = affectation?.theme?.type_pfe === 'STARTUP';
  const hasBinomeActif = !!binome;
  const hasDemandePending = demandesEnvoyees.length > 0;

  if (loadingAff) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" />
          Gestion du binôme
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Recherchez un partenaire et gérez vos demandes de binôme.
        </p>
      </div>

      {/* Bannière STARTUP — bloque toute la gestion binôme */}
      {isStartupMember && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="flex items-start gap-3 pt-5 pb-5">
            <Info className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-purple-800 text-sm">
                Vous faites partie d'une équipe STARTUP
              </p>
              <p className="text-sm text-purple-700 mt-0.5">
                Les membres d'une équipe STARTUP ne peuvent pas former de binôme, envoyer
                ou accepter des demandes de binôme.
              </p>
              {affectation?.theme && (
                <p className="text-xs text-purple-600 mt-1.5 font-medium">
                  Thème : {affectation.theme.titre}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isStartupMember && (
        <>
          {/* Statut binôme actif */}
          {loadingBinome
            ? <Skeleton className="h-28 w-full rounded-xl" />
            : <BinomeActif />
          }

          {/* Demandes reçues */}
          {!hasBinomeActif && <DemandesRecues />}

          {/* Demandes envoyées */}
          {!hasBinomeActif && !loadingEnvoyees && <DemandesEnvoyees />}

          {/* Recherche — masquée si binôme actif ou demande en attente */}
          {!hasBinomeActif && !hasDemandePending && <RechercheSection />}
        </>
      )}
    </div>
  );
}
