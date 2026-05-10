import { useState } from 'react';
import { Search, Users, Mail, GraduationCap, BookOpen, Copy, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useMesEtudiants } from '@/hooks/useStats';
import type { EtudiantEncadre } from '@/services/affectations.api';

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

// ─── Carte étudiant ──────────────────────────────────────────────────────────

function EtudiantCard({
  item,
  onContact,
}: {
  item: EtudiantEncadre;
  onContact: (e: EtudiantEncadre['etudiant']) => void;
}) {
  const { etudiant, affectation } = item;

  return (
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
              <span className="line-clamp-2">{affectation.theme.titre}</span>
            </div>

            <div className="mt-3">
              <Badge
                className={`text-xs ${
                  affectation.theme.type_pfe === 'STARTUP'
                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}
              >
                {affectation.theme.type_pfe}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="mt-4 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={() => onContact(etudiant)}
          >
            <Mail className="h-3.5 w-3.5" />
            Contacter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function EtudiantsEncadres() {
  const [search, setSearch] = useState('');
  const [contactTarget, setContactTarget] = useState<EtudiantEncadre['etudiant'] | null>(null);

  const { data: etudiants = [], isLoading } = useMesEtudiants();

  const filtered = etudiants.filter((item) => {
    const q = search.toLowerCase();
    const { etudiant, affectation } = item;
    return (
      !q ||
      etudiant.nom.toLowerCase().includes(q) ||
      etudiant.prenom.toLowerCase().includes(q) ||
      etudiant.email.toLowerCase().includes(q) ||
      affectation.theme.titre.toLowerCase().includes(q)
    );
  });

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
          <span className="font-semibold text-indigo-700">{etudiants.length}</span>
          <span className="text-sm text-muted-foreground">encadrés au total</span>
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

      {/* Liste */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg">
            {search ? 'Aucun résultat' : 'Aucun étudiant encadré'}
          </h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            {search
              ? 'Essayez avec d\'autres termes de recherche.'
              : 'Vos étudiants apparaîtront ici une fois les affectations effectuées.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <EtudiantCard
              key={item.etudiant.id}
              item={item}
              onContact={setContactTarget}
            />
          ))}
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
