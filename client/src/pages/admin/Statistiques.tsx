import { useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Users, GraduationCap, BookOpen, CheckCircle2, Layers, Award,
  AlertTriangle, TrendingUp, Download, FileSpreadsheet, FileText,
  ArrowUpDown, ArrowUp, ArrowDown, UserX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  useGlobalStats, useEnseignantsStatsAdmin, useEtudiantsStatsAdmin,
  useThemesStats, useExportStats,
} from '@/hooks/useStats';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import type { EnseignantStatRow, EtudiantStatRow } from '@/services/stats.api';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  blue: '#3b82f6', green: '#22c55e', orange: '#f97316',
  red: '#ef4444', purple: '#8b5cf6', amber: '#f59e0b', teal: '#14b8a6',
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function pct(v: number, t: number) { return t > 0 ? Math.round((v / t) * 100) : 0; }

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color = 'bg-primary/10 text-primary', loading,
}: {
  icon: React.ElementType; label: string; value: number; sub?: string;
  color?: string; loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          {loading ? <Skeleton className="h-8 w-16" /> : (
            <p className="text-3xl font-bold">{value.toLocaleString('fr-FR')}</p>
          )}
          {sub && !loading && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton générique ───────────────────────────────────────────────────────

function ChartSkeleton({ h = 220 }: { h?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height: h }} />;
}

// ─── Tab Global ───────────────────────────────────────────────────────────────

function GlobalTab({ specialiteId }: { specialiteId: string }) {
  const { data, isLoading } = useGlobalStats();
  const { data: td, isLoading: tlLoading } = useThemesStats(
    specialiteId ? { specialite_id: specialiteId } : undefined,
  );

  const kpis = [
    { icon: GraduationCap, label: 'Étudiants', value: data?.totalEtudiants ?? 0, sub: `${data?.etudiantsSansTheme ?? 0} sans thème`, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
    { icon: AlertTriangle, label: 'Sans thème', value: data?.etudiantsSansTheme ?? 0, sub: `${pct(data?.etudiantsSansTheme ?? 0, data?.totalEtudiants ?? 0)}% des étudiants`, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' },
    { icon: Users, label: 'Enseignants', value: data?.totalEnseignants ?? 0, sub: `${data?.enseignantsSurcharges ?? 0} surchargés`, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
    { icon: UserX, label: 'Sans affectation', value: data?.enseignantsSansAffectation ?? 0, sub: 'encadrent 0 étudiant', color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' },
    { icon: BookOpen, label: 'Thèmes', value: data?.totalThemes ?? 0, sub: undefined, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' },
    { icon: CheckCircle2, label: 'Validés', value: data?.themesValides ?? 0, sub: `${pct(data?.themesValides ?? 0, data?.totalThemes ?? 0)}% du total`, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
    { icon: Layers, label: 'Affectés', value: data?.themesAffectes ?? 0, sub: `${pct(data?.themesAffectes ?? 0, data?.totalThemes ?? 0)}% du total`, color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400' },
    { icon: Award, label: 'Soutenus', value: data?.themesSoutenus ?? 0, sub: `${pct(data?.themesSoutenus ?? 0, data?.themesAffectes ?? 0)}% des affectés`, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' },
  ];

  const pieThemes = data ? [
    { name: 'Validés', value: data.themesValides, fill: C.green },
    { name: 'Non validés', value: data.themesNonValides, fill: C.orange },
  ] : [];

  const pieEtudiants = data ? [
    { name: 'Avec thème', value: data.etudiantsAvecTheme, fill: C.blue },
    { name: 'Sans thème', value: data.etudiantsSansTheme, fill: C.amber },
  ] : [];

  const barTypes = data ? [
    { name: 'Classiques', total: data.themesClassiques, affectes: Math.round(data.themesAffectes * data.themesClassiques / (data.totalThemes || 1)) },
    { name: 'Startups', total: data.themesStartups, affectes: Math.round(data.themesAffectes * data.themesStartups / (data.totalThemes || 1)) },
  ] : [];

  const barSpecialite = (td?.parSpecialite ?? []).map(s => ({
    name: s.specialite.nom.length > 12 ? s.specialite.nom.slice(0, 12) + '…' : s.specialite.nom,
    Total: s.total,
    Affectés: s.affectes,
    Soutenus: s.soutenus,
  }));

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(k => <KpiCard key={k.label} {...k} loading={isLoading} />)}
      </div>

      {/* Progression globale */}
      {data && (
        <Card className="bg-muted/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Progression globale</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Taux de validation', v: data.themesValides, t: data.totalThemes, color: 'bg-emerald-500' },
              { label: 'Taux d\'affectation', v: data.themesAffectes, t: data.totalThemes, color: 'bg-blue-500' },
              { label: 'Taux de soutenance', v: data.themesSoutenus, t: data.themesAffectes, color: 'bg-purple-500' },
              { label: 'Étudiants avec thème', v: data.etudiantsAvecTheme, t: data.totalEtudiants, color: 'bg-teal-500' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 text-xs text-muted-foreground">{b.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct(b.v, b.t)}%` }} />
                </div>
                <span className="w-10 text-right text-xs font-semibold">{pct(b.v, b.t)}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pie — validation thèmes */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Validation des thèmes</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieThemes} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieThemes.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, '']} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie — étudiants */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Affectation étudiants</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieEtudiants} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieEtudiants.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, '']} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar — classiques vs startups */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Classiques vs Startups</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barTypes} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total" fill={C.blue} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="affectes" name="Affectés" fill={C.green} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar — par spécialité */}
      {barSpecialite.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Thèmes par spécialité</CardTitle></CardHeader>
          <CardContent>
            {tlLoading ? <ChartSkeleton h={240} /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barSpecialite} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="Total" fill={C.blue} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Affectés" fill={C.green} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Soutenus" fill={C.purple} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab Enseignants ──────────────────────────────────────────────────────────

type ESort = 'nom' | 'proposes' | 'affectes';
type Dir = 'asc' | 'desc';

const CAT_LABELS: Record<string, string> = {
  SURCHARGE: 'Surchargé', SOUS_CHARGE: 'Sous-chargé',
  SANS_PROPOSITION: 'Sans proposition', NORMAL: 'Normal',
};
const CAT_COLOR: Record<string, string> = {
  SURCHARGE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  SOUS_CHARGE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  SANS_PROPOSITION: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  NORMAL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

function EnseignantsTab({ specialiteId }: { specialiteId: string }) {
  const [categorie, setCategorie] = useState('all');
  const [sort, setSort] = useState<ESort>('affectes');
  const [dir, setDir] = useState<Dir>('desc');

  const filters = { ...(specialiteId ? { specialite_id: specialiteId } : {}), categorie };
  const { data = [], isLoading } = useEnseignantsStatsAdmin(filters);
  const { exportSection, isExporting } = useExportStats();

  const toggleSort = (col: ESort) => {
    if (sort === col) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setDir('desc'); }
  };

  const sorted = [...data].sort((a, b) => {
    let c = 0;
    if (sort === 'nom') c = `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`, 'fr');
    else if (sort === 'proposes') c = a.nb_themes_proposes - b.nb_themes_proposes;
    else c = a.nb_themes_affectes - b.nb_themes_affectes;
    return dir === 'asc' ? c : -c;
  });

  const counts = {
    SURCHARGE: data.filter(e => e.categorie === 'SURCHARGE').length,
    SOUS_CHARGE: data.filter(e => e.categorie === 'SOUS_CHARGE').length,
    SANS_PROPOSITION: data.filter(e => e.categorie === 'SANS_PROPOSITION').length,
    NORMAL: data.filter(e => e.categorie === 'NORMAL').length,
  };

  const barData = [...data]
    .sort((a, b) => b.nb_themes_affectes - a.nb_themes_affectes)
    .slice(0, 10)
    .map(e => ({ name: `${e.prenom.slice(0, 1)}. ${e.nom}`, Affectés: e.nb_themes_affectes, Proposés: e.nb_themes_proposes }));

  function SortIcon({ col }: { col: ESort }) {
    if (sort !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return dir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  }

  const exportFilters: Record<string, string | undefined> = {
    ...(specialiteId ? { specialite_id: specialiteId } : {}),
    ...(categorie !== 'all' ? { categorie } : {}),
  };

  return (
    <div className="space-y-6">
      {/* Compteurs par catégorie */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['SURCHARGE', 'SOUS_CHARGE', 'SANS_PROPOSITION', 'NORMAL'] as const).map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategorie(categorie === cat ? 'all' : cat)}
            className={`rounded-lg border p-4 text-left transition-all hover:shadow-sm ${categorie === cat ? 'ring-2 ring-primary' : ''}`}
          >
            <p className="text-2xl font-bold">{isLoading ? '…' : counts[cat]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{CAT_LABELS[cat]}</p>
          </button>
        ))}
      </div>

      {/* Bar chart top 10 */}
      {!isLoading && barData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 10 — Thèmes encadrés</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="Proposés" fill={C.blue} radius={[0, 3, 3, 0]} />
                <Bar dataKey="Affectés" fill={C.green} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filtres + exports */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={categorie} onValueChange={setCategorie}>
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue placeholder="Toutes catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              <SelectItem value="SURCHARGE">Surchargés</SelectItem>
              <SelectItem value="SOUS_CHARGE">Sous-chargés</SelectItem>
              <SelectItem value="SANS_PROPOSITION">Sans proposition</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{data.length} résultat(s)</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}
            onClick={() => exportSection('enseignants', 'excel', exportFilters)}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}
            onClick={() => exportSection('enseignants', 'pdf', exportFilters)}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun enseignant</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8">#</th>
                    <th className="px-4 py-2.5 text-left">
                      <button type="button" onClick={() => toggleSort('nom')} className="flex items-center gap-1 hover:text-foreground font-medium">
                        Enseignant <SortIcon col="nom" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">Spécialité</th>
                    <th className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => toggleSort('proposes')} className="flex items-center gap-1 ml-auto hover:text-foreground font-medium">
                        Proposés <SortIcon col="proposes" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => toggleSort('affectes')} className="flex items-center gap-1 ml-auto hover:text-foreground font-medium">
                        Encadrés <SortIcon col="affectes" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((e: EnseignantStatRow, idx) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{e.prenom} {e.nom}</p>
                        <p className="text-xs text-muted-foreground">{e.email}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{e.specialite?.nom ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right"><Badge variant="outline" className="text-xs">{e.nb_themes_proposes}</Badge></td>
                      <td className="px-4 py-2.5 text-right"><Badge variant="secondary" className="text-xs">{e.nb_themes_affectes}</Badge></td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CAT_COLOR[e.categorie]}`}>
                          {CAT_LABELS[e.categorie]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab Étudiants ────────────────────────────────────────────────────────────

type EtuSort = 'nom' | 'affecte' | 'choix';

function EtudiantsTab({ specialiteId }: { specialiteId: string }) {
  const [statut, setStatut] = useState('');
  const [sort, setSort] = useState<EtuSort>('nom');
  const [dir, setDir] = useState<Dir>('asc');

  const filters = { ...(specialiteId ? { specialite_id: specialiteId } : {}), ...(statut ? { statut } : {}) };
  const { data = [], isLoading } = useEtudiantsStatsAdmin(filters);
  const { exportSection, isExporting } = useExportStats();

  const allData = useEtudiantsStatsAdmin(specialiteId ? { specialite_id: specialiteId } : {}).data ?? [];

  const toggleSort = (col: EtuSort) => {
    if (sort === col) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setDir('asc'); }
  };

  const sorted = [...data].sort((a, b) => {
    let c = 0;
    if (sort === 'nom') c = `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`, 'fr');
    else if (sort === 'choix') c = a.nb_choix - b.nb_choix;
    else c = (a.has_theme ? 1 : 0) - (b.has_theme ? 1 : 0);
    return dir === 'asc' ? c : -c;
  });

  const avecTheme = allData.filter(e => e.has_theme).length;
  const sansTheme = allData.length - avecTheme;
  const avecBinome = allData.filter(e => e.has_binome).length;
  const avecProposition = allData.filter(e => e.nb_themes_proposes > 0).length;

  const pieData = [
    { name: 'Avec thème', value: avecTheme, fill: C.blue },
    { name: 'Sans thème', value: sansTheme, fill: C.amber },
  ];
  const pieBinome = [
    { name: 'Avec binôme', value: avecBinome, fill: C.teal },
    { name: 'Sans binôme', value: allData.length - avecBinome, fill: C.orange },
  ];

  function SortIcon({ col }: { col: EtuSort }) {
    if (sort !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return dir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  }

  const exportFilters: Record<string, string | undefined> = {
    ...(specialiteId ? { specialite_id: specialiteId } : {}),
    ...(statut ? { statut } : {}),
  };

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Affectation</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton h={180} /> : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, '']} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Binômes</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton h={180} /> : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieBinome} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieBinome.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, '']} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Résumé</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: 'Total étudiants', value: allData.length, color: 'text-foreground' },
              { label: 'Avec thème', value: avecTheme, color: 'text-blue-600' },
              { label: 'Sans thème', value: sansTheme, color: 'text-amber-600' },
              { label: 'Avec binôme', value: avecBinome, color: 'text-teal-600' },
              { label: 'Ont proposé', value: avecProposition, color: 'text-purple-600' },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={`font-semibold ${r.color}`}>{r.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Filtres + exports */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={statut || 'all'} onValueChange={v => setStatut(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Tous les étudiants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="avec_theme">Avec thème</SelectItem>
              <SelectItem value="sans_theme">Sans thème</SelectItem>
              <SelectItem value="avec_binome">Avec binôme</SelectItem>
              <SelectItem value="sans_binome">Sans binôme</SelectItem>
              <SelectItem value="avec_proposition">Ont proposé</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{data.length} résultat(s)</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}
            onClick={() => exportSection('etudiants', 'excel', exportFilters)}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}
            onClick={() => exportSection('etudiants', 'pdf', exportFilters)}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun étudiant</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8">#</th>
                    <th className="px-4 py-2.5 text-left">
                      <button type="button" onClick={() => toggleSort('nom')} className="flex items-center gap-1 hover:text-foreground font-medium">
                        Étudiant <SortIcon col="nom" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Thème affecté</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground hidden sm:table-cell">Binôme</th>
                    <th className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => toggleSort('choix')} className="flex items-center gap-1 ml-auto hover:text-foreground font-medium">
                        Choix <SortIcon col="choix" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((e: EtudiantStatRow, idx) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{e.prenom} {e.nom}</p>
                        <p className="text-xs text-muted-foreground">{e.specialite?.nom ?? '—'}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell max-w-xs">
                        <p className="truncate">{e.affectation?.theme?.titre ?? '—'}</p>
                        {e.affectation?.encadrant && (
                          <p className="text-[11px] truncate">{e.affectation.encadrant.prenom} {e.affectation.encadrant.nom}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                        {e.has_binome
                          ? <span className="text-xs text-teal-600">{e.binome?.partenaire.prenom} {e.binome?.partenaire.nom}</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right"><Badge variant="outline" className="text-xs">{e.nb_choix}</Badge></td>
                      <td className="px-4 py-2.5 text-right">
                        {e.has_theme
                          ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Affecté</span>
                          : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Sans thème</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab Thèmes ───────────────────────────────────────────────────────────────

function ThemesTab({ specialiteId }: { specialiteId: string }) {
  const [typePfe, setTypePfe] = useState('');
  const [statut, setStatut] = useState('');

  const filters = {
    ...(specialiteId ? { specialite_id: specialiteId } : {}),
    ...(typePfe ? { type_pfe: typePfe } : {}),
    ...(statut ? { statut } : {}),
  };
  const { data, isLoading } = useThemesStats(filters);

  const barSpecialite = (data?.parSpecialite ?? []).map(s => ({
    name: s.specialite.nom.length > 12 ? s.specialite.nom.slice(0, 12) + '…' : s.specialite.nom,
    Total: s.total, Affectés: s.affectes, Soutenus: s.soutenus, Validés: s.valides,
  }));

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <Select value={typePfe || 'all'} onValueChange={v => setTypePfe(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Tous types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="CLASSIQUE">Classique</SelectItem>
            <SelectItem value="STARTUP">Startup</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statut || 'all'} onValueChange={v => setStatut(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Toutes validations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="VALIDE">Validés</SelectItem>
            <SelectItem value="NON_VALIDE">Non validés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compteurs */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : data && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: data.totaux.total, color: 'text-foreground' },
            { label: 'Validés', value: data.totaux.valides, color: 'text-emerald-600' },
            { label: 'Affectés', value: data.totaux.affectes, color: 'text-blue-600' },
            { label: 'Soutenus', value: data.totaux.soutenus, color: 'text-purple-600' },
            { label: 'Sans encadrant', value: data.totaux.sansEncadrant, color: 'text-amber-600' },
          ].map(c => (
            <Card key={c.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Répartition type × statut */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Table type × statut */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Répartition type × validation</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Validation</th>
                    <th className="text-right px-4 py-2 font-medium">Nombre</th>
                  </tr>
                </thead>
                <tbody>
                  {data.parTypeStatut.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs">{r.type_pfe === 'CLASSIQUE' ? 'Classique' : 'Startup'}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={r.statut_validation === 'VALIDE' ? 'default' : 'secondary'} className="text-xs">
                          {r.statut_validation === 'VALIDE' ? 'Validé' : 'Non validé'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Bar chart par spécialité */}
          {barSpecialite.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Par spécialité</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barSpecialite} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} />
                    <Bar dataKey="Total" fill={C.blue} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Validés" fill={C.green} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Affectés" fill={C.teal} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Thèmes sans encadrant */}
      {!isLoading && data && data.sansEncadrant.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Thèmes sans encadrant ({data.sansEncadrant.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.sansEncadrant.map(t => (
                <div key={t.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-medium text-sm flex-1 min-w-0">{t.titre}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{t.type_pfe === 'CLASSIQUE' ? 'Classique' : 'Startup'}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>Proposé par : <span className="font-medium text-foreground">{t.propose_par.prenom} {t.propose_par.nom}</span></span>
                    {t.theme_specialites.map(ts => (
                      <Badge key={ts.specialite.id} variant="secondary" className="text-[10px]">{ts.specialite.nom}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Statistiques() {
  const [specialiteId, setSpecialiteId] = useState('');
  const { data: specialites = [] } = useActiveSpecialites();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Statistiques</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tableau de bord de la session en cours</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={specialiteId || 'all'} onValueChange={v => setSpecialiteId(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-52 h-9 text-sm">
              <SelectValue placeholder="Toutes les spécialités" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les spécialités</SelectItem>
              {specialites.map(s => <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>)}
            </SelectContent>
          </Select>
          {specialiteId && (
            <Button variant="ghost" size="sm" onClick={() => setSpecialiteId('')}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global">Vue globale</TabsTrigger>
          <TabsTrigger value="enseignants" className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Enseignants
          </TabsTrigger>
          <TabsTrigger value="etudiants" className="flex items-center gap-1">
            <GraduationCap className="h-3.5 w-3.5" /> Étudiants
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" /> Thèmes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-6">
          <GlobalTab specialiteId={specialiteId} />
        </TabsContent>
        <TabsContent value="enseignants" className="mt-6">
          <EnseignantsTab specialiteId={specialiteId} />
        </TabsContent>
        <TabsContent value="etudiants" className="mt-6">
          <EtudiantsTab specialiteId={specialiteId} />
        </TabsContent>
        <TabsContent value="themes" className="mt-6">
          <ThemesTab specialiteId={specialiteId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
