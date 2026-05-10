import { useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  GraduationCap, Users, BookOpen, CheckCircle2, Layers, Award,
  AlertTriangle, FileSpreadsheet, FileText, ArrowUpDown, ArrowUp, ArrowDown,
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
import { useCurrentUser } from '@/stores/authStore';
import type { EnseignantStatRow, EtudiantStatRow } from '@/services/stats.api';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  blue: '#3b82f6', green: '#22c55e', orange: '#f97316',
  amber: '#f59e0b', purple: '#8b5cf6', teal: '#14b8a6',
};

function pct(v: number, t: number) { return t > 0 ? Math.round((v / t) * 100) : 0; }

function ChartSkeleton({ h = 200 }: { h?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height: h }} />;
}

type Dir = 'asc' | 'desc';

// ─── Vue d'ensemble ───────────────────────────────────────────────────────────

function OverviewCards({ specialiteId }: { specialiteId: string }) {
  const { data: global } = useGlobalStats();
  const { data: themes, isLoading } = useThemesStats({ specialite_id: specialiteId });
  const { data: etudiants } = useEtudiantsStatsAdmin({ specialite_id: specialiteId });
  const { data: enseignants } = useEnseignantsStatsAdmin({ specialite_id: specialiteId });

  const t = themes?.totaux;
  const totalEtu = etudiants?.length ?? 0;
  const avecTheme = etudiants?.filter(e => e.has_theme).length ?? 0;
  const totalEns = enseignants?.length ?? 0;

  const kpis = [
    { icon: GraduationCap, label: 'Étudiants', value: totalEtu, sub: `${totalEtu - avecTheme} sans thème`, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' },
    { icon: Users, label: 'Enseignants', value: totalEns, sub: `${enseignants?.filter(e => e.categorie === 'SURCHARGE').length ?? 0} surchargés`, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
    { icon: BookOpen, label: 'Thèmes', value: t?.total ?? 0, sub: `${t?.classiques ?? 0} classiques · ${t?.startups ?? 0} startups`, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' },
    { icon: CheckCircle2, label: 'Validés', value: t?.valides ?? 0, sub: `${pct(t?.valides ?? 0, t?.total ?? 0)}% du total`, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
    { icon: Layers, label: 'Affectés', value: t?.affectes ?? 0, sub: `${pct(t?.affectes ?? 0, t?.total ?? 0)}% du total`, color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400' },
    { icon: Award, label: 'Soutenus', value: t?.soutenus ?? 0, sub: `${pct(t?.soutenus ?? 0, t?.affectes ?? 0)}% des affectés`, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' },
  ];

  const pieThemes = t ? [
    { name: 'Validés', value: t.valides, fill: C.green },
    { name: 'Non validés', value: t.nonValides, fill: C.orange },
  ] : [];

  const pieEtu = [
    { name: 'Avec thème', value: avecTheme, fill: C.blue },
    { name: 'Sans thème', value: totalEtu - avecTheme, fill: C.amber },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className={`flex h-8 w-8 mb-2 items-center justify-center rounded-lg ${k.color}`}>
                <k.icon className="h-4 w-4" />
              </div>
              {isLoading ? <Skeleton className="h-7 w-12 mb-1" /> : (
                <p className="text-2xl font-bold">{k.value}</p>
              )}
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
              {k.sub && !isLoading && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{k.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Validation des thèmes</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieThemes} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {pieThemes.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, '']} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Affectation étudiants</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieEtu} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {pieEtu.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, '']} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {global && (
        <Card className="bg-muted/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Taux — ma spécialité</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Validation', v: t?.valides ?? 0, total: t?.total ?? 0, color: 'bg-emerald-500' },
              { label: 'Affectation', v: t?.affectes ?? 0, total: t?.total ?? 0, color: 'bg-blue-500' },
              { label: 'Soutenance', v: t?.soutenus ?? 0, total: t?.affectes ?? 0, color: 'bg-purple-500' },
              { label: 'Étudiants avec thème', v: avecTheme, total: totalEtu, color: 'bg-teal-500' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 text-xs text-muted-foreground">{b.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct(b.v, b.total)}%` }} />
                </div>
                <span className="w-10 text-right text-xs font-semibold">{pct(b.v, b.total)}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Enseignants ──────────────────────────────────────────────────────────────

type ESort = 'nom' | 'proposes' | 'affectes';
const CAT_LABELS: Record<string, string> = { SURCHARGE: 'Surchargé', SOUS_CHARGE: 'Sous-chargé', SANS_PROPOSITION: 'Sans proposition', NORMAL: 'Normal' };
const CAT_COLOR: Record<string, string> = {
  SURCHARGE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  SOUS_CHARGE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  SANS_PROPOSITION: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  NORMAL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

function EnseignantsTab({ specialiteId }: { specialiteId: string }) {
  const [sort, setSort] = useState<ESort>('affectes');
  const [dir, setDir] = useState<Dir>('desc');
  const { data = [], isLoading } = useEnseignantsStatsAdmin({ specialite_id: specialiteId });
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

  const barData = [...data]
    .sort((a, b) => b.nb_themes_affectes - a.nb_themes_affectes)
    .slice(0, 8)
    .map(e => ({ name: `${e.prenom.slice(0, 1)}. ${e.nom}`, Proposés: e.nb_themes_proposes, Encadrés: e.nb_themes_affectes }));

  function SortIcon({ col }: { col: ESort }) {
    if (sort !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return dir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  }

  return (
    <div className="space-y-6">
      {!isLoading && barData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Charge par enseignant</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="Proposés" fill={C.blue} radius={[0, 3, 3, 0]} />
                <Bar dataKey="Encadrés" fill={C.green} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary">{data.length} enseignant(s)</Badge>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}
            onClick={() => exportSection('enseignants', 'excel', { specialite_id: specialiteId })}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}
            onClick={() => exportSection('enseignants', 'pdf', { specialite_id: specialiteId })}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-10">Aucun enseignant dans cette spécialité</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left">
                      <button type="button" onClick={() => toggleSort('nom')} className="flex items-center gap-1 hover:text-foreground font-medium text-muted-foreground">
                        Enseignant <SortIcon col="nom" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => toggleSort('proposes')} className="flex items-center gap-1 ml-auto hover:text-foreground font-medium text-muted-foreground">
                        Proposés <SortIcon col="proposes" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => toggleSort('affectes')} className="flex items-center gap-1 ml-auto hover:text-foreground font-medium text-muted-foreground">
                        Encadrés <SortIcon col="affectes" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((e: EnseignantStatRow, i) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{e.prenom} {e.nom}</p>
                        <p className="text-xs text-muted-foreground">{e.email}</p>
                      </td>
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

// ─── Étudiants ────────────────────────────────────────────────────────────────

type EtuSort = 'nom' | 'affecte' | 'choix';

function EtudiantsTab({ specialiteId }: { specialiteId: string }) {
  const [statut, setStatut] = useState('');
  const [sort, setSort] = useState<EtuSort>('nom');
  const [dir, setDir] = useState<Dir>('asc');

  const filters = { specialite_id: specialiteId, ...(statut ? { statut } : {}) };
  const { data = [], isLoading } = useEtudiantsStatsAdmin(filters);
  const { exportSection, isExporting } = useExportStats();

  const allData = useEtudiantsStatsAdmin({ specialite_id: specialiteId }).data ?? [];
  const avecTheme = allData.filter(e => e.has_theme).length;
  const sansTheme = allData.length - avecTheme;

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

  const pieData = [
    { name: 'Avec thème', value: avecTheme, fill: C.blue },
    { name: 'Sans thème', value: sansTheme, fill: C.amber },
  ];

  function SortIcon({ col }: { col: EtuSort }) {
    if (sort !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return dir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          <CardHeader className="pb-1"><CardTitle className="text-sm">Résumé</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-3">
            {[
              { label: 'Total', value: allData.length, color: 'text-foreground' },
              { label: 'Avec thème', value: avecTheme, color: 'text-blue-600' },
              { label: 'Sans thème', value: sansTheme, color: 'text-amber-600' },
              { label: 'Avec binôme', value: allData.filter(e => e.has_binome).length, color: 'text-teal-600' },
              { label: 'Ont proposé', value: allData.filter(e => e.nb_themes_proposes > 0).length, color: 'text-purple-600' },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={`font-semibold ${r.color}`}>{r.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={statut || 'all'} onValueChange={v => setStatut(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
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
            onClick={() => exportSection('etudiants', 'excel', { specialite_id: specialiteId, ...(statut ? { statut } : {}) })}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}
            onClick={() => exportSection('etudiants', 'pdf', { specialite_id: specialiteId, ...(statut ? { statut } : {}) })}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-10">Aucun étudiant</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left">
                      <button type="button" onClick={() => toggleSort('nom')} className="flex items-center gap-1 hover:text-foreground font-medium text-muted-foreground">
                        Étudiant <SortIcon col="nom" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Thème</th>
                    <th className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => toggleSort('choix')} className="flex items-center gap-1 ml-auto hover:text-foreground font-medium text-muted-foreground">
                        Choix <SortIcon col="choix" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((e: EtudiantStatRow) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{e.prenom} {e.nom}</p>
                        {e.matricule && <p className="text-xs text-muted-foreground font-mono">{e.matricule}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                        <p className="truncate max-w-xs">{e.affectation?.theme?.titre ?? '—'}</p>
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

// ─── Thèmes ───────────────────────────────────────────────────────────────────

function ThemesTab({ specialiteId }: { specialiteId: string }) {
  const { data, isLoading } = useThemesStats({ specialite_id: specialiteId });
  const t = data?.totaux;

  const barData = data?.parTypeStatut
    ? [
        {
          name: 'Classique', Validés: data.parTypeStatut.find(r => r.type_pfe === 'CLASSIQUE' && r.statut_validation === 'VALIDE')?.count ?? 0,
          'Non validés': data.parTypeStatut.find(r => r.type_pfe === 'CLASSIQUE' && r.statut_validation === 'NON_VALIDE')?.count ?? 0,
        },
        {
          name: 'Startup', Validés: data.parTypeStatut.find(r => r.type_pfe === 'STARTUP' && r.statut_validation === 'VALIDE')?.count ?? 0,
          'Non validés': data.parTypeStatut.find(r => r.type_pfe === 'STARTUP' && r.statut_validation === 'NON_VALIDE')?.count ?? 0,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : t && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: t.total, color: 'text-foreground' },
            { label: 'Validés', value: t.valides, color: 'text-emerald-600' },
            { label: 'Affectés', value: t.affectes, color: 'text-blue-600' },
            { label: 'Soutenus', value: t.soutenus, color: 'text-purple-600' },
            { label: 'Sans encadrant', value: t.sansEncadrant, color: 'text-amber-600' },
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

      {!isLoading && barData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Classique vs Startup — validation</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="Validés" fill={C.green} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Non validés" fill={C.orange} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {!isLoading && data && data.sansEncadrant.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Sans encadrant ({data.sansEncadrant.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.sansEncadrant.map(t => (
                <div key={t.id} className="px-4 py-3 hover:bg-muted/30">
                  <p className="font-medium text-sm">{t.titre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.propose_par.prenom} {t.propose_par.nom} · {t.type_pfe === 'CLASSIQUE' ? 'Classique' : 'Startup'}
                  </p>
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

export default function StatsSpecialite() {
  const user = useCurrentUser();
  const specialiteId = user?.specialite?.id ?? '';
  const specialiteNom = user?.specialite?.nom ?? 'ma spécialité';

  if (!specialiteId) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Statistiques</h2>
        <p className="text-muted-foreground">Aucune spécialité associée à votre compte.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Statistiques</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Spécialité : <span className="font-semibold text-foreground">{specialiteNom}</span>
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
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

        <TabsContent value="overview" className="mt-6">
          <OverviewCards specialiteId={specialiteId} />
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
