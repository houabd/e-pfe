import { BookOpen, Tag, Briefcase, Mail, Rocket, Plus, UserCheck, Users, GraduationCap } from 'lucide-react';
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

function Avatar({ initials, color = 'primary' }: { initials: string; color?: 'primary' | 'indigo' | 'violet' | 'teal' }) {
  const cls = {
    primary: 'bg-primary/10 text-primary',
    indigo:  'bg-indigo-100 text-indigo-600',
    violet:  'bg-violet-100 text-violet-700',
    teal:    'bg-[#e8e8e8] text-[#0a5e37]',
  }[color];
  return (
    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${cls}`}>
      <span className="text-xs font-bold">{initials}</span>
    </div>
  );
}

function PersonRow({
  prenom, nom, label, badge, color = 'primary',
}: { prenom: string; nom: string; label: string; badge?: React.ReactNode; color?: 'primary' | 'indigo' | 'violet' | 'teal' }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar initials={`${prenom[0]}${nom[0]}`} color={color} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">{prenom} {nom}</p>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function EtudiantsAffectesSection({ theme }: { theme: Theme }) {
  if (!theme.affectation) return null;
  const membres = theme.type_pfe === 'STARTUP'
    ? theme.affectation.startup_membres
    : theme.affectation.etudiants;
  if (membres.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <GraduationCap className="h-3.5 w-3.5" />
        Étudiant{membres.length > 1 ? 's' : ''} affecté{membres.length > 1 ? 's' : ''}
      </p>
      <div className="rounded-lg border divide-y bg-card">
        {membres.map((m) => (
          <div key={m.id} className="px-4">
            <PersonRow
              prenom={m.etudiant.prenom}
              nom={m.etudiant.nom}
              label={m.etudiant.specialite ? m.etudiant.specialite.nom : m.etudiant.email}
              color="violet"
              badge={
                <>
                  {m.etudiant.matricule && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {m.etudiant.matricule}
                    </span>
                  )}
                  {m.etudiant.id === theme.propose_par.id && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                      proposant
                    </span>
                  )}
                </>
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
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
            <DialogHeader className="pr-8">
              <DialogTitle className="text-lg leading-snug break-all">
                {theme.titre}
              </DialogTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {theme.type_pfe === 'STARTUP' ? (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-xs gap-1">
                    <Rocket className="h-3 w-3" />Startup
                  </Badge>
                ) : (
                  <Badge className="bg-[#e8e8e8] text-[#1a1a1a] border-[#e8e8e8] hover:bg-[#e8e8e8] text-xs gap-1">
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
              {theme.mots_cles.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />Mots-clés
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {theme.mots_cles.map((mc) => (
                      <span key={mc} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                        {mc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Encadrement (enseignants uniquement) ── */}
              <EncadrementSection theme={theme} />

              {/* ── Étudiant proposant (seulement si non affecté) ── */}
              {theme.propose_par.role === 'ETUDIANT' && !theme.is_affecte && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />Proposant
                  </p>
                  <div className="rounded-lg border bg-card">
                    <div className="px-4">
                      <PersonRow
                        prenom={theme.propose_par.prenom}
                        nom={theme.propose_par.nom}
                        label="Étudiant proposant"
                        color="violet"
                        badge={
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                            Étudiant
                          </span>
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Étudiants affectés */}
              <EtudiantsAffectesSection theme={theme} />

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
                    <div className="flex items-center gap-1.5 rounded-lg border border-[#e8e8e8] bg-[#f7f7f7] px-3 py-1.5 text-xs text-amber-800">
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

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
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

function EncadrementSection({ theme }: { theme: Theme }) {
  const proposantIsTeacher = theme.propose_par.role !== 'ETUDIANT';
  // For teacher-proposed: encadrant_valide=false means co-encadrant pending
  // For student-proposed: encadrant_valide=false means designated encadrant pending
  const coEncPending = proposantIsTeacher && !theme.encadrant_valide && !!theme.co_encadrant;
  const encadrantPending = !proposantIsTeacher && !theme.encadrant_valide;

  const hasAnyTeacher =
    proposantIsTeacher ||
    (!!theme.encadrant && theme.encadrant.id !== theme.propose_par.id) ||
    !!theme.co_encadrant ||
    theme.besoin_encadrant;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" />Encadrement
      </p>
      <div className="rounded-lg border divide-y bg-card">
        {/* Encadrant principal = proposant enseignant */}
        {proposantIsTeacher && (
          <div className="px-4">
            <PersonRow
              prenom={theme.propose_par.prenom}
              nom={theme.propose_par.nom}
              label="Encadrant principal"
              color="primary"
              badge={
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                  Enseignant
                </span>
              }
            />
          </div>
        )}

        {/* Encadrant désigné (thème proposé par un étudiant) */}
        {theme.encadrant && theme.encadrant.id !== theme.propose_par.id && (
          <div className="px-4">
            <PersonRow
              prenom={theme.encadrant.prenom}
              nom={theme.encadrant.nom}
              label={
                encadrantPending
                  ? 'Encadrant (en attente de confirmation)'
                  : 'Encadrant'
              }
              color="indigo"
              badge={<UserCheck className="h-3.5 w-3.5 text-indigo-500" />}
            />
          </div>
        )}

        {/* Besoin encadrant */}
        {theme.besoin_encadrant && (
          <div className="px-4 py-3">
            <p className="text-xs text-amber-700 bg-[#f7f7f7] border border-[#e8e8e8] rounded-md px-3 py-2">
              Ce thème recherche un encadrant
            </p>
          </div>
        )}

        {/* Co-encadrant */}
        {theme.co_encadrant && (
          <div className="px-4">
            <PersonRow
              prenom={theme.co_encadrant.prenom}
              nom={theme.co_encadrant.nom}
              label={coEncPending ? 'Co-encadrant (en attente de confirmation)' : 'Co-encadrant'}
              color="teal"
            />
          </div>
        )}

        {/* Aucun enseignant désigné */}
        {!hasAnyTeacher && (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground italic">Aucun encadrant désigné pour l'instant</p>
          </div>
        )}
      </div>
    </div>
  );
}
