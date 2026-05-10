import { useState, useRef } from 'react';
import { Plus, Trash2, GraduationCap, Users, BookOpen, Info, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useSpecialites, useCreateSpecialite, useToggleSpecialite, useDeleteSpecialite } from '@/hooks/useSpecialites';
import type { Specialite } from '@/services/specialites.api';

// ─── Carte spécialité ─────────────────────────────────────────────────────────

function SpecialiteCard({
  specialite,
  onToggle,
  onDelete,
  isToggling,
}: {
  specialite: Specialite;
  onToggle: (s: Specialite) => void;
  onDelete: (s: Specialite) => void;
  isToggling: boolean;
}) {
  return (
    <Card className={`group transition-all ${!specialite.is_active ? 'opacity-60' : 'hover:shadow-md'}`}>
      <CardContent className="p-4 flex items-center gap-4">
        {/* Icône */}
        <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${specialite.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
          <GraduationCap className={`size-5 ${specialite.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{specialite.nom}</p>
            <Badge variant={specialite.is_active ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0">
              {specialite.is_active ? 'Active' : 'Désactivée'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3" />
              {specialite.nb_utilisateurs} utilisateur(s)
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <BookOpen className="size-3" />
              {specialite.nb_themes} thème(s)
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 text-xs gap-1.5 ${specialite.is_active ? 'text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800' : 'text-green-700 hover:bg-green-50 hover:text-green-800'}`}
            onClick={() => onToggle(specialite)}
            disabled={isToggling}
            aria-label={specialite.is_active ? `Désactiver ${specialite.nom}` : `Activer ${specialite.nom}`}
          >
            {isToggling ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : specialite.is_active ? (
              <ToggleLeft className="size-3.5" />
            ) : (
              <ToggleRight className="size-3.5" />
            )}
            {specialite.is_active ? 'Désactiver' : 'Activer'}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(specialite)}
            aria-label={`Supprimer ${specialite.nom}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Squelettes ───────────────────────────────────────────────────────────────

function SpecialiteSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function GestionSpecialites() {
  const [nom, setNom] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Specialite | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: specialites = [], isLoading } = useSpecialites();
  const createMutation = useCreateSpecialite();
  const toggleMutation = useToggleSpecialite();
  const deleteMutation = useDeleteSpecialite();

  const actives = specialites.filter((s) => s.is_active);
  const inactives = specialites.filter((s) => !s.is_active);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nom.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed, {
      onSuccess: () => { setNom(''); inputRef.current?.focus(); },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Spécialités</h2>
        <p className="text-muted-foreground mt-1">
          {isLoading ? '…' : `${actives.length} active(s) · ${inactives.length} désactivée(s)`}
        </p>
      </div>

      {/* Bannière propagation */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Les spécialités <strong>actives</strong> apparaissent dans les formulaires de thèmes et les profils.
          Une spécialité désactivée disparaît des nouveaux formulaires mais conserve ses données historiques.
        </p>
      </div>

      {/* Formulaire d'ajout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="size-4" />
            Ajouter une spécialité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="nom-specialite" className="sr-only">Nom de la spécialité</Label>
              <Input
                id="nom-specialite"
                ref={inputRef}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex : Réseaux et Télécommunications"
                maxLength={100}
                autoComplete="off"
                disabled={createMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={!nom.trim() || createMutation.isPending} className="shrink-0">
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Ajouter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Liste */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SpecialiteSkeleton key={i} />)
        ) : specialites.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap className="size-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucune spécialité configurée</p>
            <p className="text-xs mt-1">Ajoutez la première spécialité via le formulaire ci-dessus.</p>
          </div>
        ) : (
          <>
            {actives.map((s) => (
              <SpecialiteCard
                key={s.id}
                specialite={s}
                onToggle={(sp) => toggleMutation.mutate(sp.id)}
                onDelete={setDeleteTarget}
                isToggling={toggleMutation.isPending && toggleMutation.variables === s.id}
              />
            ))}
            {inactives.length > 0 && (
              <>
                {actives.length > 0 && <div className="border-t my-3" />}
                <p className="text-xs text-muted-foreground px-1 mb-2">Désactivées</p>
                {inactives.map((s) => (
                  <SpecialiteCard
                    key={s.id}
                    specialite={s}
                    onToggle={(sp) => toggleMutation.mutate(sp.id)}
                    onDelete={setDeleteTarget}
                    isToggling={toggleMutation.isPending && toggleMutation.variables === s.id}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Dialog suppression */}
      {deleteTarget && (
        <Dialog open onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Supprimer la spécialité</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p>
                    Voulez-vous supprimer définitivement <strong>&ldquo;{deleteTarget.nom}&rdquo;</strong> ?
                  </p>
                  {(deleteTarget.nb_utilisateurs > 0 || deleteTarget.nb_themes > 0) && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                      <Info className="size-4 text-yellow-600 shrink-0 mt-0.5" />
                      <div className="text-yellow-800 dark:text-yellow-300 space-y-1">
                        {deleteTarget.nb_utilisateurs > 0 && (
                          <p>{deleteTarget.nb_utilisateurs} utilisateur(s) associé(s)</p>
                        )}
                        {deleteTarget.nb_themes > 0 && (
                          <p>{deleteTarget.nb_themes} thème(s) associé(s)</p>
                        )}
                        <p className="font-medium">Désactivez-la plutôt que la supprimer.</p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
