import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, CalendarDays, Clock, CheckCircle2, XCircle,
  Loader2, Edit2, PowerOff, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSessions, useCreateSession, useUpdateSession, useCloseSession } from '@/hooks/useSession';
import type { Session } from '@/types';
import type { CreateSessionPayload } from '@/services/sessions.api';

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function getCurrentAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

function sessionStatus(s: Session): 'active' | 'upcoming' | 'closed' {
  const now = new Date();
  const debut = new Date(s.date_debut);
  const fin = new Date(s.date_fin);
  if (!s.is_active) return 'closed';
  if (now < debut) return 'upcoming';
  if (now >= debut && now <= fin) return 'active';
  return 'closed';
}

const STATUS_CONFIG = {
  active: { label: 'En cours', variant: 'success' as const, icon: <CheckCircle2 className="size-3" /> },
  upcoming: { label: 'Planifiée', variant: 'info' as const, icon: <Clock className="size-3" /> },
  closed: { label: 'Clôturée', variant: 'secondary' as const, icon: <XCircle className="size-3" /> },
};

const TYPE_CONFIG = {
  CHOIX: { label: 'Choix', color: 'bg-[#009474]', light: 'bg-[#e8e8e8] text-[#1a1a1a] dark:bg-gray-900/30 dark:text-[#00b08a]' },
  AFFECTATION: { label: 'Affectation', color: 'bg-orange-500', light: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
};

// ─── Timeline académique ───────────────────────────────────────────────────────

const MONTHS = ['Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû'];

function AcademicTimeline({ sessions, anneeUniv }: { sessions: Session[]; anneeUniv: string }) {
  const [startYear] = anneeUniv.split('-').map(Number);
  const yearStart = new Date(startYear, 8, 1); // 1er sept
  const yearEnd = new Date(startYear + 1, 7, 31); // 31 août
  const totalDays = daysBetween(yearStart, yearEnd) || 365;
  const now = new Date();
  const todayOffset = Math.min(100, Math.max(0, (daysBetween(yearStart, now) / totalDays) * 100));
  const showToday = now >= yearStart && now <= yearEnd;

  const filtered = sessions.filter((s) => s.annee_universitaire === anneeUniv);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          Calendrier académique {anneeUniv}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mois */}
        <div className="relative">
          <div className="grid grid-cols-12 mb-1">
            {MONTHS.map((m) => (
              <div key={m} className="text-center text-[10px] text-muted-foreground font-medium px-0.5">{m}</div>
            ))}
          </div>

          {/* Zone de la timeline */}
          <div className="relative h-24 bg-muted/30 rounded-md border overflow-hidden">
            {/* Séparateurs de mois */}
            {MONTHS.slice(1).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-border/50"
                style={{ left: `${((i + 1) / 12) * 100}%` }}
              />
            ))}

            {/* Barres de sessions */}
            {filtered.map((s) => {
              const debut = new Date(s.date_debut);
              const fin = new Date(s.date_fin);
              const left = Math.max(0, (daysBetween(yearStart, debut) / totalDays) * 100);
              const width = Math.min(100 - left, (daysBetween(debut, fin) / totalDays) * 100);
              const status = sessionStatus(s);
              const typeConf = TYPE_CONFIG[s.type];
              const top = s.type === 'CHOIX' ? 'top-3' : 'top-12';

              return (
                <div
                  key={s.id}
                  className={`absolute h-8 rounded flex items-center px-2 ${top} ${typeConf.color} ${status === 'closed' ? 'opacity-40' : 'opacity-90'} transition-opacity`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                  title={`${typeConf.label} : ${formatDate(s.date_debut)} → ${formatDate(s.date_fin)}`}
                >
                  <span className="text-white text-[9px] font-semibold truncate">
                    {typeConf.label}
                  </span>
                </div>
              );
            })}

            {/* Marqueur aujourd'hui */}
            {showToday && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{ left: `${todayOffset}%` }}
              >
                <div className="absolute -top-0.5 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
                <span className="absolute top-1 -translate-x-1/2 text-[9px] text-red-600 font-bold whitespace-nowrap">
                  Auj.
                </span>
              </div>
            )}
          </div>

          {/* Légende */}
          <div className="flex items-center gap-4 mt-2">
            {Object.entries(TYPE_CONFIG).map(([type, conf]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-3 h-2 rounded-sm ${conf.color}`} />
                <span className="text-xs text-muted-foreground">{conf.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-0.5 h-3 bg-red-500" />
              <span className="text-xs text-muted-foreground">Aujourd&apos;hui</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Formulaire session ───────────────────────────────────────────────────────

const sessionSchema = z.object({
  type: z.enum(['CHOIX', 'AFFECTATION']),
  date_debut: z.string().min(1, 'Date de début requise'),
  date_fin: z.string().min(1, 'Date de fin requise'),
  annee_universitaire: z.string().regex(/^\d{4}-\d{4}$/, 'Format requis : 2025-2026'),
}).refine((d) => new Date(d.date_fin) > new Date(d.date_debut), {
  message: 'La date de fin doit être après la date de début',
  path: ['date_fin'],
}).refine((d) => new Date(d.date_fin) >= new Date(new Date().toDateString()), {
  message: 'La date de fin est déjà passée',
  path: ['date_fin'],
});

type SessionForm = z.infer<typeof sessionSchema>;

function SessionDialog({
  open,
  onOpenChange,
  editSession,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editSession?: Session;
}) {
  const createMutation = useCreateSession();
  const updateMutation = useUpdateSession();
  const isEdit = !!editSession;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { annee_universitaire: getCurrentAcademicYear(), type: 'CHOIX' },
  });

  useEffect(() => {
    if (editSession) {
      reset({
        type: editSession.type,
        date_debut: editSession.date_debut.slice(0, 10),
        date_fin: editSession.date_fin.slice(0, 10),
        annee_universitaire: editSession.annee_universitaire,
      });
    } else {
      reset({ annee_universitaire: getCurrentAcademicYear(), type: 'CHOIX' });
    }
  }, [editSession, reset, open]);

  const onSubmit = (data: SessionForm) => {
    const payload: CreateSessionPayload = {
      ...data,
      date_debut: new Date(data.date_debut).toISOString(),
      date_fin: new Date(data.date_fin).toISOString(),
    };
    if (isEdit) {
      updateMutation.mutate({ id: editSession.id, dto: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }

  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const typeValue = watch('type');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la session' : 'Créer une session'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifiez les dates ou le statut de la session.'
              : 'Définissez le type, la période et l\'année universitaire.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Type de session <span className="text-destructive" aria-hidden>*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {(['CHOIX', 'AFFECTATION'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('type', t)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                    typeValue === t
                      ? t === 'CHOIX'
                        ? 'border-[#009474] bg-[#f7f7f7] text-[#1a1a1a] dark:bg-gray-900/20 dark:text-[#00b08a]'
                        : 'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mb-1.5 ${t === 'CHOIX' ? 'bg-[#009474]' : 'bg-orange-500'}`} />
                  {TYPE_CONFIG[t].label}
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    {t === 'CHOIX' ? 'Choix libres — étudiants' : 'Affectation administrative'}
                  </p>
                </button>
              ))}
            </div>
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date_debut">Date de début <span className="text-destructive" aria-hidden>*</span></Label>
              <Input id="date_debut" type="date" aria-invalid={!!errors.date_debut} {...register('date_debut')} />
              {errors.date_debut && <p className="text-xs text-destructive">{errors.date_debut.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_fin">Date de fin <span className="text-destructive" aria-hidden>*</span></Label>
              <Input id="date_fin" type="date" aria-invalid={!!errors.date_fin} {...register('date_fin')} />
              {errors.date_fin && <p className="text-xs text-destructive">{errors.date_fin.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annee_univ">Année universitaire <span className="text-destructive" aria-hidden>*</span></Label>
            <Input
              id="annee_univ"
              placeholder="2025-2026"
              aria-invalid={!!errors.annee_universitaire}
              {...register('annee_universitaire')}
            />
            {errors.annee_universitaire && (
              <p className="text-xs text-destructive">{errors.annee_universitaire.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer la session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte session ────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onEdit,
  onClose,
  isClosing,
}: {
  session: Session;
  onEdit: () => void;
  onClose: () => void;
  isClosing: boolean;
}) {
  const status = sessionStatus(session);
  const statusConf = STATUS_CONFIG[status];
  const typeConf = TYPE_CONFIG[session.type];
  const debut = new Date(session.date_debut);
  const fin = new Date(session.date_fin);
  const duration = daysBetween(debut, fin);

  return (
    <Card className={`transition-all ${status === 'closed' ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Indicateur type */}
          <div className={`w-1 self-stretch rounded-full ${typeConf.color} shrink-0`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${typeConf.light}`}>
                {TYPE_CONFIG[session.type].label}
              </span>
              <Badge variant={statusConf.variant} className="gap-1">
                {statusConf.icon}
                {statusConf.label}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">{session.annee_universitaire}</span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-3.5 shrink-0" />
              <span>
                {formatDate(session.date_debut)}
                <span className="mx-1.5 text-muted-foreground/40">→</span>
                {formatDate(session.date_fin)}
              </span>
              <span className="text-muted-foreground/60">·</span>
              <span>{duration} jour(s)</span>
            </div>

            {status === 'active' && (() => {
              const now = new Date();
              const elapsed = daysBetween(debut, now);
              const pct = Math.min(100, Math.round((elapsed / duration) * 100));
              return (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progression</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${typeConf.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Actions */}
          {status !== 'closed' && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={onEdit}
                aria-label="Modifier la session"
              >
                <Edit2 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={onClose}
                disabled={isClosing}
                aria-label="Clôturer la session"
              >
                {isClosing ? <Loader2 className="size-3.5 animate-spin" /> : <PowerOff className="size-3.5" />}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function GestionSessions() {
  const [showCreate, setShowCreate] = useState(false);
  const [editSession, setEditSession] = useState<Session | undefined>();
  const [closeTarget, setCloseTarget] = useState<Session | null>(null);
  const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());

  const { data: sessions = [], isLoading } = useSessions();
  const closeMutation = useCloseSession();

  const academicYears = [...new Set(sessions.map((s) => s.annee_universitaire))].sort().reverse();
  if (!academicYears.includes(selectedYear)) academicYears.unshift(selectedYear);

  const sessionsByYear = sessions.filter((s) => s.annee_universitaire === selectedYear);
  const activeSession = sessions.find((s) => sessionStatus(s) === 'active');

  const handleCloseConfirm = () => {
    if (!closeTarget) return;
    closeMutation.mutate(closeTarget.id, { onSuccess: () => setCloseTarget(null) });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sessions</h2>
          <p className="text-muted-foreground mt-1">
            Gestion des périodes de choix et d&apos;affectation des thèmes
          </p>
        </div>
        <Button onClick={() => { setEditSession(undefined); setShowCreate(true); }}>
          <Plus className="size-4" />
          Créer une session
        </Button>
      </div>

      {/* Bannière session active */}
      {activeSession && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${
          activeSession.type === 'CHOIX'
            ? 'bg-[#f7f7f7] border-[#e8e8e8] dark:bg-gray-900/20 dark:border-gray-700'
            : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
        }`}>
          <div className={`size-2 rounded-full animate-pulse ${activeSession.type === 'CHOIX' ? 'bg-[#009474]' : 'bg-orange-500'}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${activeSession.type === 'CHOIX' ? 'text-[#1a1a1a] dark:text-[#00b08a]' : 'text-orange-800 dark:text-orange-300'}`}>
              Session {TYPE_CONFIG[activeSession.type].label} en cours — {activeSession.annee_universitaire}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(activeSession.date_debut)} → {formatDate(activeSession.date_fin)}
            </p>
          </div>
        </div>
      )}

      {/* Sélecteur d'année */}
      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Année affichée</Label>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <Card><CardContent className="p-4"><Skeleton className="h-28 w-full" /></CardContent></Card>
      ) : (
        <AcademicTimeline sessions={sessions} anneeUniv={selectedYear} />
      )}

      {/* Liste */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Sessions {selectedYear}
        </h3>
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : sessionsByYear.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <CalendarDays className="size-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucune session pour {selectedYear}</p>
            <p className="text-xs mt-1">Créez une session via le bouton en haut à droite.</p>
          </div>
        ) : (
          sessionsByYear.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onEdit={() => { setEditSession(s); setShowCreate(true); }}
              onClose={() => setCloseTarget(s)}
              isClosing={closeMutation.isPending && closeMutation.variables === s.id}
            />
          ))
        )}
      </div>

      {/* Info middleware */}
      <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground">
        <Info className="size-3.5 mt-0.5 shrink-0" />
        <p>
          Le middleware <code className="bg-muted px-1 rounded">requireActiveSession</code> bloque automatiquement
          les routes de proposition et choix de thèmes en dehors des sessions actives.
        </p>
      </div>

      <Separator />

      {/* Dialog création / modification */}
      <SessionDialog
        open={showCreate}
        onOpenChange={(v) => { setShowCreate(v); if (!v) setEditSession(undefined); }}
        editSession={editSession}
      />

      {/* Dialog confirmation clôture */}
      {closeTarget && (
        <Dialog open onOpenChange={(v) => !v && setCloseTarget(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Clôturer la session</DialogTitle>
              <DialogDescription>
                La session <strong>{TYPE_CONFIG[closeTarget.type].label}</strong> de{' '}
                <strong>{closeTarget.annee_universitaire}</strong> sera immédiatement clôturée.
                Les étudiants ne pourront plus soumettre de choix.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloseTarget(null)}>Annuler</Button>
              <Button variant="destructive" onClick={handleCloseConfirm} disabled={closeMutation.isPending}>
                {closeMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Clôturer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
