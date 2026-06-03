import { BookOpen, Tag, Briefcase, Mail, Rocket, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/useThemes';
import type { Theme, SousTypeTheme } from '@/types';

function sousTypeLabel(st: SousTypeTheme): string {
  if (st === 'RECHERCHE') return 'Recherche';
  if (st === 'PROFESSIONNEL') return 'Professionnel';
  return 'Recherche + Professionnel';
}

interface ThemeDetailDialogProps {
  themeId: string | null;
  onClose: () => void;
  onAdd?: (theme: Theme) => void;
  addLabel?: string;
}

export function ThemeDetailDialog({
  themeId,
  onClose,
  onAdd,
  addLabel = 'Ajouter à ma sélection',
}: ThemeDetailDialogProps) {
  const { data: theme, isLoading } = useTheme(themeId ?? '');

  return (
    <Dialog open={!!themeId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading || !theme ? (
          <div className="space-y-4 p-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="space-y-2 mt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg leading-snug pr-6">{theme.titre}</DialogTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {theme.type_pfe === 'STARTUP' ? (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-xs gap-1">
                    <Rocket className="h-3 w-3" />Startup
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs gap-1">
                    <BookOpen className="h-3 w-3" />Classique
                  </Badge>
                )}
                {theme.sous_types.map((st) => (
                  <Badge key={st} variant="outline" className="text-xs">
                    {sousTypeLabel(st)}
                  </Badge>
                ))}
                {theme.theme_specialites.map((ts) => (
                  <Badge key={ts.specialite.id} variant="secondary" className="text-xs">
                    {ts.specialite.nom}
                  </Badge>
                ))}
              </div>
            </DialogHeader>

            <div className="space-y-5 py-1">
              {/* Description */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Description
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {theme.description}
                </p>
              </div>

              {/* Mots-clés */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />Mots-clés
                </p>
                {theme.mots_cles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {theme.mots_cles.map((mc) => (
                      <span key={mc} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                        {mc}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Aucun mot-clé renseigné</p>
                )}
              </div>

              {/* Encadrement */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Encadrement
                </p>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {theme.propose_par.prenom[0]}{theme.propose_par.nom[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {theme.propose_par.prenom} {theme.propose_par.nom}
                        </p>
                        {theme.propose_par.role === 'ETUDIANT' ? (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">Étudiant</span>
                        ) : (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">Enseignant</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Proposé par</p>
                    </div>
                  </div>
                  {theme.encadrant && theme.encadrant.id !== theme.propose_par.id && (
                    <div className="flex items-center gap-2 text-sm pt-1 border-t">
                      <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-indigo-600">
                          {theme.encadrant.prenom[0]}{theme.encadrant.nom[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {theme.encadrant.prenom} {theme.encadrant.nom}
                        </p>
                        <p className="text-xs text-muted-foreground">Co-encadrant</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Encadrant externe */}
              {theme.encadrant_externe && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />Encadrant externe
                  </p>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                    <p className="font-medium">
                      {theme.encadrant_externe.prenom} {theme.encadrant_externe.nom}
                    </p>
                    <p className="text-muted-foreground">{theme.encadrant_externe.institution}</p>
                    <a
                      href={`mailto:${theme.encadrant_externe.email}`}
                      className="flex items-center gap-1.5 text-primary hover:underline text-xs"
                    >
                      <Mail className="h-3 w-3" />{theme.encadrant_externe.email}
                    </a>
                  </div>
                </div>
              )}

              {/* Options */}
              {(theme.necessite_stage || theme.type_pfe === 'STARTUP') && (
                <div className="flex flex-wrap gap-2">
                  {theme.necessite_stage && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                      <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                      Nécessite un stage en entreprise
                    </div>
                  )}
                  {theme.type_pfe === 'STARTUP' && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-800">
                      <Rocket className="h-3.5 w-3.5 text-orange-500" />
                      Projet entrepreneurial — jusqu'à 6 étudiants
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose}>Fermer</Button>
              {onAdd && (
                <Button onClick={() => { onAdd(theme); onClose(); }} className="gap-2">
                  <Plus className="h-4 w-4" />{addLabel}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
