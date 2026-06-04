import type { Response } from 'express';
import * as xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';

// ─── Types filtres ────────────────────────────────────────────────────────────

type BaseFilters = { specialite_id?: string };
type EnseignantFilters = BaseFilters & { categorie?: string };
type ThemeFilters = BaseFilters & { type_pfe?: string; statut?: string };
type EtudiantFilters = BaseFilters & { statut?: string };
type ExportFilters = BaseFilters & {
  categorie?: string;
  type_pfe?: string;
  statut?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('fr-FR');
}

// ─── GET /stats/global ────────────────────────────────────────────────────────

export async function getGlobalStats() {
  const [
    totalEtudiants,
    totalEnseignants,
    totalThemes,
    themesValides,
    themesAffectes,
    themesSoutenus,
    themesClassiques,
    themesStartups,
    themesAffectesClassiques,
    themesAffectesStartups,
    etudiantsAvecTheme,
    themesSansEncadrant,
    themesPlanifies,
    themesAMarquer,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'ETUDIANT', is_active: true } }),
    prisma.user.count({ where: { role: 'ENSEIGNANT', is_active: true } }),
    prisma.theme.count(),
    prisma.theme.count({ where: { statut_validation: 'VALIDE' } }),
    prisma.theme.count({ where: { is_affecte: true } }),
    prisma.theme.count({ where: { is_soutenu: true } }),
    prisma.theme.count({ where: { type_pfe: 'CLASSIQUE' } }),
    prisma.theme.count({ where: { type_pfe: 'STARTUP' } }),
    prisma.theme.count({ where: { is_affecte: true, type_pfe: 'CLASSIQUE' } }),
    prisma.theme.count({ where: { is_affecte: true, type_pfe: 'STARTUP' } }),
    // Étudiants avec thème : soit via affectation_etudiants, soit via startup_membres
    prisma.user.count({
      where: {
        role: 'ETUDIANT', is_active: true,
        OR: [
          { affectations_etudiant: { some: {} } },
          { startup_membres: { some: {} } },
        ],
      },
    }),
    prisma.theme.count({
      where: { besoin_encadrant: true, encadrant_id: null, is_affecte: false },
    }),
    prisma.soutenance.count(),
    prisma.soutenance.count({
      where: { theme: { is_soutenu: false } },
    }),
  ]);

  const etudiantsSansTheme = totalEtudiants - etudiantsAvecTheme;

  const enseignantsLoad = await prisma.user.findMany({
    where: { role: 'ENSEIGNANT', is_active: true },
    select: { _count: { select: { affectations_encadrant: true } } },
  });
  const enseignantsSurcharges = enseignantsLoad.filter(e => e._count.affectations_encadrant > 2).length;
  const enseignantsSansAffectation = enseignantsLoad.filter(e => e._count.affectations_encadrant === 0).length;

  return {
    totalEtudiants,
    totalEnseignants,
    totalThemes,
    themesValides,
    themesNonValides: totalThemes - themesValides,
    themesAffectes,
    themesNonAffectes: totalThemes - themesAffectes,
    themesPlanifies,
    themesSoutenus,
    themesAMarquer,
    themesClassiques,
    themesStartups,
    themesAffectesClassiques,
    themesAffectesStartups,
    etudiantsSansTheme,
    etudiantsAvecTheme,
    enseignantsSurcharges,
    enseignantsSansAffectation,
    themesSansEncadrant,
  };
}

// ─── GET /stats/enseignants ───────────────────────────────────────────────────

const TEACHER_ROLES = ['ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'] as const;

export async function getEnseignantsStats(filters: EnseignantFilters) {
  const { specialite_id, categorie } = filters;

  const rows = await prisma.user.findMany({
    where: {
      role: { in: [...TEACHER_ROLES] },
      is_active: true,
      ...(specialite_id ? { specialite_id } : {}),
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      specialite: { select: { id: true, nom: true } },
      _count: { select: { themes_proposes: true } },
      // Affectés où le teacher est le proposeur
      themes_proposes: { where: { is_affecte: true }, select: { id: true } },
      // Affectés où le teacher est l'encadrant déclaré sur le thème
      themes_encadres: { where: { is_affecte: true }, select: { id: true } },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  const mapped = rows.map(e => {
    const nb_proposes = e._count.themes_proposes;
    // Dédoublonnage : un thème proposé ET encadré par la même personne ne compte qu'une fois
    const affectesIds = new Set([
      ...e.themes_proposes.map(t => t.id),
      ...e.themes_encadres.map(t => t.id),
    ]);
    const nb_affectes = affectesIds.size;

    const cat =
      nb_affectes > 2 ? 'SURCHARGE' :
      nb_proposes === 0 ? 'SANS_PROPOSITION' :
      nb_affectes < 2 ? 'SOUS_CHARGE' : 'NORMAL';

    return {
      id: e.id,
      nom: e.nom,
      prenom: e.prenom,
      email: e.email,
      specialite: e.specialite,
      nb_themes_proposes: nb_proposes,
      nb_themes_affectes: nb_affectes,
      categorie: cat,
    };
  });

  if (!categorie || categorie === 'all') return mapped;
  return mapped.filter(r => r.categorie === categorie.toUpperCase());
}

// ─── GET /stats/themes ────────────────────────────────────────────────────────

export async function getThemesStats(filters: ThemeFilters) {
  const { specialite_id, type_pfe, statut } = filters;

  const baseWhere = {
    ...(type_pfe ? { type_pfe: type_pfe as 'CLASSIQUE' | 'STARTUP' } : {}),
    ...(statut ? { statut_validation: statut as 'VALIDE' | 'NON_VALIDE' } : {}),
    ...(specialite_id ? { theme_specialites: { some: { specialite_id } } } : {}),
  };

  // Totaux
  const [total, valides, affectes, soutenus, classiques, startups, sansEncadrant] = await Promise.all([
    prisma.theme.count({ where: baseWhere }),
    prisma.theme.count({ where: { ...baseWhere, statut_validation: 'VALIDE' } }),
    prisma.theme.count({ where: { ...baseWhere, is_affecte: true } }),
    prisma.theme.count({ where: { ...baseWhere, is_soutenu: true } }),
    prisma.theme.count({ where: { ...baseWhere, type_pfe: 'CLASSIQUE' } }),
    prisma.theme.count({ where: { ...baseWhere, type_pfe: 'STARTUP' } }),
    prisma.theme.count({ where: { ...baseWhere, besoin_encadrant: true, encadrant_id: null, is_affecte: false } }),
  ]);

  // Répartition par type × statut
  const parTypeStatut = await prisma.theme.groupBy({
    by: ['type_pfe', 'statut_validation'],
    where: baseWhere,
    _count: { id: true },
    orderBy: { type_pfe: 'asc' },
  });

  // Répartition par spécialité
  const specialites = await prisma.specialite.findMany({
    where: { is_active: true, ...(specialite_id ? { id: specialite_id } : {}) },
    select: {
      id: true,
      nom: true,
      theme_specialites: {
        where: { theme: baseWhere },
        select: {
          theme: { select: { is_affecte: true, is_soutenu: true, statut_validation: true, type_pfe: true } },
        },
      },
    },
  });

  const parSpecialite = specialites
    .filter(s => s.theme_specialites.length > 0)
    .map(s => {
      const themes = s.theme_specialites.map(ts => ts.theme);
      return {
        specialite: { id: s.id, nom: s.nom },
        total: themes.length,
        affectes: themes.filter(t => t.is_affecte).length,
        soutenus: themes.filter(t => t.is_soutenu).length,
        valides: themes.filter(t => t.statut_validation === 'VALIDE').length,
        classiques: themes.filter(t => t.type_pfe === 'CLASSIQUE').length,
        startups: themes.filter(t => t.type_pfe === 'STARTUP').length,
      };
    });

  // Soutenus par type_pfe
  const soutenusParType = await prisma.theme.groupBy({
    by: ['type_pfe'],
    where: { ...baseWhere, is_soutenu: true },
    _count: { id: true },
  });

  // Thèmes sans encadrant (proposés par étudiants ou enseignants cherchant un encadrant)
  const themesSansEncadrant = await prisma.theme.findMany({
    where: { ...baseWhere, besoin_encadrant: true, encadrant_id: null, is_affecte: false },
    select: {
      id: true,
      titre: true,
      type_pfe: true,
      sous_types: true,
      created_at: true,
      propose_par: { select: { id: true, nom: true, prenom: true, role: true } },
      theme_specialites: { select: { specialite: { select: { id: true, nom: true } } } },
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  });

  return {
    totaux: {
      total,
      valides,
      nonValides: total - valides,
      affectes,
      nonAffectes: total - affectes,
      soutenus,
      classiques,
      startups,
      sansEncadrant,
    },
    parTypeStatut: parTypeStatut.map(g => ({
      type_pfe: g.type_pfe,
      statut_validation: g.statut_validation,
      count: g._count.id,
    })),
    soutenusParType: soutenusParType.map(g => ({ type_pfe: g.type_pfe, count: g._count.id })),
    parSpecialite,
    sansEncadrant: themesSansEncadrant,
  };
}

// ─── GET /stats/etudiants ─────────────────────────────────────────────────────

export async function getEtudiantsStats(filters: EtudiantFilters) {
  const { specialite_id, statut } = filters;

  const rows = await prisma.user.findMany({
    where: {
      role: 'ETUDIANT',
      is_active: true,
      ...(specialite_id ? { specialite_id } : {}),
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      matricule: true,
      annee_universitaire: true,
      specialite: { select: { id: true, nom: true } },
      affectations_etudiant: {
        take: 1,
        select: {
          affectation: {
            select: {
              theme: { select: { id: true, titre: true, type_pfe: true } },
              encadrant: { select: { id: true, nom: true, prenom: true } },
            },
          },
        },
      },
      startup_membres: {
        take: 1,
        include: {
          affectation: {
            select: {
              theme: { select: { id: true, titre: true, type_pfe: true } },
              encadrant: { select: { id: true, nom: true, prenom: true } },
            },
          },
        },
      },
      binomes_comme_etud1: {
        where: { statut: 'ACCEPTED' },
        take: 1,
        select: { id: true, etud2: { select: { id: true, nom: true, prenom: true } } },
      },
      binomes_comme_etud2: {
        where: { statut: 'ACCEPTED' },
        take: 1,
        select: { id: true, etud1: { select: { id: true, nom: true, prenom: true } } },
      },
      _count: { select: { themes_proposes: true, choix_themes: true } },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  const mapped = rows.map(e => {
    // Affectation via classique (affectation_etudiants) OU via STARTUP (startup_membres)
    const affectationClassique = e.affectations_etudiant[0]?.affectation ?? null;
    const affectationStartup = e.startup_membres[0]?.affectation ?? null;
    const affectation = affectationClassique ?? affectationStartup ?? null;

    const b1 = e.binomes_comme_etud1[0];
    const b2 = e.binomes_comme_etud2[0];
    const binome = b1
      ? { id: b1.id, partenaire: b1.etud2 }
      : b2
      ? { id: b2.id, partenaire: b2.etud1 }
      : null;

    const has_theme = !!affectation;
    const is_startup = affectation?.theme?.type_pfe === 'STARTUP';
    // Monôme = affecté à un thème classique sans binôme (travaille seul)
    const is_monome = has_theme && !is_startup && !binome;
    const has_encadrant = !!affectation?.encadrant;

    return {
      id: e.id,
      nom: e.nom,
      prenom: e.prenom,
      email: e.email,
      matricule: e.matricule,
      annee_universitaire: e.annee_universitaire,
      specialite: e.specialite,
      has_theme,
      is_startup,
      is_monome,
      has_encadrant,
      affectation: affectation
        ? { theme: affectation.theme, encadrant: affectation.encadrant }
        : null,
      has_binome: !!binome,
      binome,
      nb_themes_proposes: e._count.themes_proposes,
      nb_choix: e._count.choix_themes,
    };
  });

  if (!statut) return mapped;
  switch (statut) {
    case 'avec_theme':       return mapped.filter(r => r.has_theme);
    case 'sans_theme':       return mapped.filter(r => !r.has_theme);
    case 'avec_binome':      return mapped.filter(r => r.has_binome);
    case 'sans_binome':      return mapped.filter(r => !r.has_binome);
    case 'avec_proposition': return mapped.filter(r => r.nb_themes_proposes > 0);
    case 'equipe_startup':   return mapped.filter(r => r.is_startup);
    case 'monome':           return mapped.filter(r => r.is_monome);
    default: return mapped;
  }
}

// ─── GET /stats/enseignant (dashboard enseignant) ─────────────────────────────

export async function getEnseignantStats(enseignantId: string) {
  const [
    totalThemes, themesAffectes, themesValides, demandesEnAttente,
    etudiantsClassiques, etudiantsStartup,
  ] = await Promise.all([
    prisma.theme.count({ where: { propose_par_id: enseignantId } }),
    prisma.theme.count({ where: { propose_par_id: enseignantId, is_affecte: true } }),
    prisma.theme.count({ where: { propose_par_id: enseignantId, statut_validation: 'VALIDE' } }),
    prisma.themeChoix.count({ where: { theme: { encadrant_id: enseignantId }, statut: 'PENDING' } }),
    // Classiques : via affectation_etudiants
    prisma.affectationEtudiant.count({ where: { affectation: { encadrant_id: enseignantId } } }),
    // STARTUP : via startup_membres
    prisma.startupMembre.count({ where: { affectation: { encadrant_id: enseignantId } } }),
  ]);

  return {
    totalThemes,
    themesAffectes,
    themesNonAffectes: totalThemes - themesAffectes,
    themesValides,
    demandesEnAttente,
    etudiantsEncadres: etudiantsClassiques + etudiantsStartup,
  };
}

// ─── Export Excel ─────────────────────────────────────────────────────────────

async function buildEnseignantsWorkbook(filters: EnseignantFilters) {
  const data = await getEnseignantsStats(filters);
  const ws = xlsx.utils.json_to_sheet(
    data.map(e => ({
      'Nom': e.nom,
      'Prénom': e.prenom,
      'Email': e.email,
      'Spécialité': e.specialite?.nom ?? '',
      'Thèmes proposés': e.nb_themes_proposes,
      'Thèmes encadrés': e.nb_themes_affectes,
      'Catégorie': e.categorie === 'SURCHARGE' ? 'Surchargé'
        : e.categorie === 'SOUS_CHARGE' ? 'Sous-chargé'
        : e.categorie === 'SANS_PROPOSITION' ? 'Sans proposition'
        : 'Normal',
    })),
  );
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Enseignants');
  return wb;
}

async function buildEtudiantsWorkbook(filters: EtudiantFilters) {
  const data = await getEtudiantsStats(filters);
  const ws = xlsx.utils.json_to_sheet(
    data.map(e => ({
      'Nom': e.nom,
      'Prénom': e.prenom,
      'Email': e.email,
      'Matricule': e.matricule ?? '',
      'Spécialité': e.specialite?.nom ?? '',
      'Année univ.': e.annee_universitaire ?? '',
      'Thème affecté': e.affectation?.theme?.titre ?? 'Non',
      'Encadrant': e.affectation?.encadrant
        ? `${e.affectation.encadrant.prenom} ${e.affectation.encadrant.nom}`
        : '',
      'Binôme': e.binome
        ? `${e.binome.partenaire.prenom} ${e.binome.partenaire.nom}`
        : 'Non',
      'Thèmes proposés': e.nb_themes_proposes,
      'Choix soumis': e.nb_choix,
    })),
  );
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Étudiants');
  return wb;
}

// ─── Export PDF enseignants ───────────────────────────────────────────────────

async function exportEnseignantsPdf(filters: EnseignantFilters, res: Response) {
  const data = await getEnseignantsStats(filters);
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="stats_enseignants_${Date.now()}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text('Statistiques — Enseignants', { align: 'center' });
  doc.fontSize(9).font('Helvetica').fillColor('#666')
    .text(`Généré le ${fmtDate(new Date())}`, { align: 'center' });
  doc.moveDown(1);

  const categories = ['SURCHARGE', 'SOUS_CHARGE', 'SANS_PROPOSITION', 'NORMAL'];
  const catLabels: Record<string, string> = {
    SURCHARGE: 'Surchargés (> 2 thèmes affectés)',
    SOUS_CHARGE: 'Sous-chargés (< 2 thèmes affectés)',
    SANS_PROPOSITION: 'Sans proposition (< 2 thèmes proposés)',
    NORMAL: 'Normal',
  };

  for (const cat of categories) {
    const group = data.filter(e => e.categorie === cat);
    if (group.length === 0) continue;

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a').text(catLabels[cat]);
    doc.fontSize(8).font('Helvetica').fillColor('#333');
    doc.moveDown(0.3);

    const colX = [40, 180, 300, 380, 440, 490];
    const headers = ['Nom', 'Prénom', 'Spécialité', 'Proposés', 'Encadrés'];
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#555');
    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { continued: i < headers.length - 1, width: colX[i + 1] - colX[i] - 4 }));
    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.2);

    doc.font('Helvetica').fillColor('#1a1a1a');
    for (const e of group) {
      if (doc.y > 750) { doc.addPage(); }
      const y = doc.y;
      doc.fontSize(8);
      doc.text(`${e.nom}`, colX[0], y, { width: colX[1] - colX[0] - 4 });
      doc.text(`${e.prenom}`, colX[1], y, { width: colX[2] - colX[1] - 4 });
      doc.text(e.specialite?.nom ?? '—', colX[2], y, { width: colX[3] - colX[2] - 4 });
      doc.text(`${e.nb_themes_proposes}`, colX[3], y, { width: 40 });
      doc.text(`${e.nb_themes_affectes}`, colX[4], y, { width: 40 });
      doc.moveDown(0.7);
    }

    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#888').text(`${group.length} enseignant(s)`);
    doc.moveDown(0.8);
  }

  doc.end();
}

// ─── Export PDF étudiants ────────────────────────────────────────────────────

async function exportEtudiantsPdf(filters: EtudiantFilters, res: Response) {
  const data = await getEtudiantsStats(filters);
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="stats_etudiants_${Date.now()}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text('Statistiques — Étudiants', { align: 'center' });
  doc.fontSize(9).font('Helvetica').fillColor('#666')
    .text(`Généré le ${fmtDate(new Date())} · ${data.length} étudiant(s)`, { align: 'center' });
  doc.moveDown(1);

  const sections = [
    { label: 'Avec thème affecté', items: data.filter(e => e.has_theme) },
    { label: 'Sans thème affecté', items: data.filter(e => !e.has_theme) },
  ];

  for (const section of sections) {
    if (section.items.length === 0) continue;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a').text(section.label);
    doc.moveDown(0.3);

    const colX = [40, 160, 280, 370, 490];
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#555');
    ['Nom', 'Prénom', 'Spécialité', 'Thème / Encadrant'].forEach((h, i) =>
      doc.text(h, colX[i], doc.y, { width: colX[i + 1] - colX[i] - 4, continued: i < 3 }),
    );
    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.2);

    doc.font('Helvetica').fillColor('#1a1a1a');
    for (const e of section.items) {
      if (doc.y > 750) { doc.addPage(); }
      const y = doc.y;
      doc.fontSize(8);
      doc.text(e.nom, colX[0], y, { width: colX[1] - colX[0] - 4 });
      doc.text(e.prenom, colX[1], y, { width: colX[2] - colX[1] - 4 });
      doc.text(e.specialite?.nom ?? '—', colX[2], y, { width: colX[3] - colX[2] - 4 });
      const themeInfo = e.affectation?.theme?.titre
        ? `${e.affectation.theme.titre}${e.affectation.encadrant ? ` · ${e.affectation.encadrant.prenom} ${e.affectation.encadrant.nom}` : ''}`
        : '—';
      doc.text(themeInfo, colX[3], y, { width: colX[4] - colX[3] - 4 });
      doc.moveDown(0.7);
    }

    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#888').text(`${section.items.length} étudiant(s)`);
    doc.moveDown(0.8);
  }

  doc.end();
}

// ─── GET /stats/export/:section/:format ──────────────────────────────────────

export async function exportStats(
  section: string,
  format: 'excel' | 'pdf',
  filters: ExportFilters,
  res: Response,
): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);

  if (section === 'enseignants') {
    if (format === 'excel') {
      const wb = await buildEnseignantsWorkbook(filters);
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="stats_enseignants_${date}.xlsx"`);
      res.send(buf);
    } else {
      await exportEnseignantsPdf(filters, res);
    }
    return;
  }

  if (section === 'etudiants') {
    if (format === 'excel') {
      const wb = await buildEtudiantsWorkbook(filters);
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="stats_etudiants_${date}.xlsx"`);
      res.send(buf);
    } else {
      await exportEtudiantsPdf(filters, res);
    }
    return;
  }

  res.status(400).json({ success: false, message: `Section "${section}" non supportée pour l'export` });
}
