import { useState } from 'react';
import {
  BookOpen, Rocket, GraduationCap, Download, ChevronDown,
  ChevronUp, Mail, Hash, Search, Filter, CheckCircle2, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useHistoriqueEncadrement, useExportHistoriqueExcel, useExportHistoriquePDF } from '@/hooks/useAffectations';
import type { ThemeEncadre } from '@/services/affectations.api';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<ThemeEncadre['mon_role'], string> = {
  PROPOSANT: 'Proposant',
  ENCADRANT: 'Encadrant',
  CO_ENCADRANT: 'Co-encadrant',
};

const ROLE_COLORS: Record<ThemeEncadre['mon_role'], string> = {
  PROPOSANT: 'bg-violet-100 text-violet-700 border-violet-200',
  ENCADRANT: 'bg-blue-100 text-blue-700 border-blue-200',
  CO_ENCADRANT: 'bg-teal-100 text-teal-700 border-teal-200',
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Carte thème ──────────────────────────────────────────────────────────────

function ThemeCard({ theme }: { theme: ThemeEncadre }) {
  const [open, setOpen] = useState(false);
  const specialites = theme.theme_specialites.map((ts) => ts.specialite.nom).join(', ');

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <CardHeader className="py-3 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="mt-0.5 shrink-0">
                {theme.type_pfe === 'STARTUP'
                  ? <Rocket className="size-4 text-violet-500" />
                  : <BookOpen className="size-4 text-blue-500" />}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-sm leading-snug truncate">{theme.titre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{specialites}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded border',
                ROLE_COLORS[theme.mon_role],
              )}>
                {ROLE_LABELS[theme.mon_role]}
              </span>
              {theme.is_soutenu
                ? <CheckCircle2 className="size-4 text-green-500" />
                : <Clock className="size-4 text-muted-foreground" />}
              {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>
      </button>

      {open && (
        <>
          <Separator />
          <CardContent className="py-3 px-4 space-y-3">
            {/* Métadonnées */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{theme.type_pfe}</Badge>
              {theme.sous_types.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
              <Badge variant="outline" className={theme.is_soutenu ? 'text-green-600 border-green-300' : ''}>
                {theme.is_soutenu ? 'Soutenu' : 'Non soutenu'}
              </Badge>
            </div>

            {/* Étudiants */}
            {theme.etudiants.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucun étudiant associé</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Étudiants encadrés ({theme.etudiants.length})
                </p>
                {theme.etudiants.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#e8e8e8] bg-[#f7f7f7] px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GraduationCap className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{e.prenom} {e.nom}</span>
                      {e.specialite && (
                        <span className="text-xs text-muted-foreground shrink-0">— {e.specialite.nom}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                      {e.matricule && (
                        <span className="flex items-center gap-1">
                          <Hash className="size-3" />{e.matricule}
                        </span>
                      )}
                      <a
                        href={`mailto:${e.email}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <Mail className="size-3" />{e.email}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HistoriqueEncadrement() {
  const [annee, setAnnee] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtreAnnee = annee === 'all' ? undefined : annee;
  const { data: themes = [], isLoading } = useHistoriqueEncadrement(filtreAnnee);
  const exportExcel = useExportHistoriqueExcel();
  const exportPDF = useExportHistoriquePDF();

  // Années disponibles (depuis les données chargées sans filtre pour avoir toutes les options)
  const { data: allThemes = [] } = useHistoriqueEncadrement(undefined);
  const annees = [...new Set(allThemes.map((t) => t.session.annee_universitaire))].sort((a, b) => b.localeCompare(a));

  const filtered = themes.filter((t) =>
    t.titre.toLowerCase().includes(search.toLowerCase()) ||
    t.etudiants.some(
      (e) =>
        `${e.prenom} ${e.nom}`.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  const totalEtudiants = new Set(filtered.flatMap((t) => t.etudiants.map((e) => e.id))).size;

  const isExporting = exportExcel.isPending || exportPDF.isPending;

  function handleExportExcel() {
    exportExcel.mutate(filtreAnnee, {
      onSuccess: (blob) => downloadBlob(blob, `historique_encadrement_${annee}.xlsx`),
    });
  }

  function handleExportPDF() {
    exportPDF.mutate(filtreAnnee, {
      onSuccess: (blob) => downloadBlob(blob, `historique_encadrement_${annee}.pdf`),
    });
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Historique d'encadrement</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tous les thèmes que vous avez encadrés au fil des années
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={handleExportExcel}
            disabled={isExporting || filtered.length === 0}
          >
            <Download className="size-4" />
            {exportExcel.isPending ? 'Export…' : 'Excel'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={handleExportPDF}
            disabled={isExporting || filtered.length === 0}
          >
            <Download className="size-4" />
            {exportPDF.isPending ? 'Export…' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-primary">{filtered.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Thèmes encadrés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-[#009474]">{totalEtudiants}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Étudiants encadrés</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-amber-600">
                {filtered.filter((t) => t.is_soutenu).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Soutenus</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un thème, étudiant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={annee} onValueChange={setAnnee}>
          <SelectTrigger className="h-8 w-52 text-sm">
            <Filter className="size-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Toutes les années" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les années</SelectItem>
            {annees.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {search ? 'Aucun résultat pour cette recherche' : 'Aucun thème encadré pour le moment'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Grouper par année */}
          {(annee === 'all'
            ? [...new Set(filtered.map((t) => t.session.annee_universitaire))].sort((a, b) => b.localeCompare(a))
            : [annee]
          ).map((a) => {
            const themesAnnee = filtered.filter((t) => t.session.annee_universitaire === a);
            return (
              <div key={a} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {a}
                  </span>
                  <span className="text-xs text-muted-foreground">({themesAnnee.length} thème{themesAnnee.length > 1 ? 's' : ''})</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {themesAnnee.map((t) => (
                  <ThemeCard key={t.id} theme={t} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
