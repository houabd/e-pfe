import type { Response } from 'express';
import * as xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware/error.middleware';
import { notifyUser } from './notification.service';
import type { CreateThemeDto, ThemeFilters } from '../types';
import type { TokenPayload } from '../utils/token.utils';

// ─── Sélection commune ─────────────────────────────────────────────────────────

const THEME_INCLUDE = {
  propose_par: { select: { id: true, nom: true, prenom: true, email: true } },
  encadrant: { select: { id: true, nom: true, prenom: true, email: true } },
  theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
  session: { select: { id: true, type: true, annee_universitaire: true } },
} as const;

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getThemes(filters: ThemeFilters) {
  const {
    page = 1, limit = 20,
    specialite_id, type_pfe, statut_validation,
    is_affecte, besoin_encadrant, session_id, enseignant_id,
    annee_universitaire, search,
  } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ThemeWhereInput = {
    ...(type_pfe ? { type_pfe } : {}),
    ...(statut_validation ? { statut_validation } : {}),
    ...(is_affecte !== undefined ? { is_affecte } : {}),
    ...(besoin_encadrant !== undefined ? { besoin_encadrant } : {}),
    ...(session_id ? { session_id } : {}),
    ...(enseignant_id ? { propose_par_id: enseignant_id } : {}),
    ...(specialite_id ? { theme_specialites: { some: { specialite_id } } } : {}),
    ...(annee_universitaire ? { session: { annee_universitaire } } : {}),
    ...(search
      ? {
          OR: [
            { titre: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { mots_cles: { has: search } },
          ],
        }
      : {}),
  };

  const [total, themes] = await Promise.all([
    prisma.theme.count({ where }),
    prisma.theme.findMany({
      where,
      skip,
      take: limit,
      include: THEME_INCLUDE,
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return { data: themes, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getThemeById(id: string) {
  const theme = await prisma.theme.findUnique({
    where: { id },
    include: THEME_INCLUDE,
  });
  if (!theme) throw new NotFoundError('Thème');
  return theme;
}

export async function getMyThemes(userId: string, filters: Omit<ThemeFilters, 'enseignant_id'>) {
  return getThemes({ ...filters, enseignant_id: userId });
}

// ─── Email(s) des responsables de filière ────────────────────────────────────

export async function getRespFiliereInfo() {
  return prisma.user.findMany({
    where: { role: 'CHEF_EQUIPE', is_active: true },
    select: { id: true, nom: true, prenom: true, email: true },
    orderBy: { nom: 'asc' },
  });
}

// ─── Création ─────────────────────────────────────────────────────────────────

function validateThemeType(type_pfe: string, sous_types: string[]) {
  if (type_pfe === 'STARTUP') {
    if (sous_types.length > 0) {
      throw new BadRequestError('Un thème de type STARTUP ne peut pas avoir de sous-types');
    }
  }
  if (type_pfe === 'CLASSIQUE') {
    if (sous_types.length === 0) {
      throw new BadRequestError('Un thème CLASSIQUE doit avoir au moins un sous-type (RECHERCHE, PROFESSIONNEL ou LES_DEUX)');
    }
  }
}

export async function createTheme(dto: CreateThemeDto, user: TokenPayload) {
  const { specialite_ids, encadrant_externe, ...rest } = dto;

  validateThemeType(dto.type_pfe, dto.sous_types ?? []);

  const session = await prisma.session.findFirst({
    where: { type: 'CHOIX', is_active: true, date_debut: { lte: new Date() }, date_fin: { gte: new Date() } },
  });

  // Si besoin_encadrant → pas d'encadrant interne assignable pour l'instant
  const encadrantId = rest.besoin_encadrant ? null : (rest.encadrant_id ?? null);

  // STARTUP avec encadrant externe fourni → affectation automatique (CLAUDE.md)
  const isAffecteAuto = dto.type_pfe === 'STARTUP' && !!encadrant_externe;

  return prisma.$transaction(async (tx) => {
    const theme = await tx.theme.create({
      data: {
        ...rest,
        propose_par_id: user.userId,
        session_id: session!.id,
        encadrant_id: encadrantId,
        is_affecte: isAffecteAuto,
        encadrant_externe: encadrant_externe
          ? (encadrant_externe as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        theme_specialites: {
          create: specialite_ids.map((specialite_id) => ({ specialite_id })),
        },
      },
      include: THEME_INCLUDE,
    });

    // Crée l'affectation startup et ajoute le proposant comme premier membre
    if (isAffecteAuto) {
      await tx.affectation.create({
        data: {
          theme_id: theme.id,
          encadrant_id: null, // encadrant externe → pas d'encadrant interne
          session_id: session!.id,
          affecte_par: user.userId,
          type: 'LIBRE',
          ...(user.role === 'ETUDIANT'
            ? { startup_membres: { create: [{ etudiant_id: user.userId }] } }
            : {}),
        },
      });
    }

    return theme;
  });
}

// ─── Création Admin (sans restriction de session) ────────────────────────────

export async function createThemeAsAdmin(
  dto: CreateThemeDto,
  proposeParId: string,
  _admin: TokenPayload,
) {
  const { specialite_ids, encadrant_externe, ...rest } = dto;

  validateThemeType(dto.type_pfe, dto.sous_types ?? []);

  const proposant = await prisma.user.findUnique({ where: { id: proposeParId } });
  if (!proposant) throw new NotFoundError('Enseignant');
  if (!['ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT'].includes(proposant.role)) {
    throw new BadRequestError('L\'utilisateur spécifié ne peut pas être proposant de thème');
  }

  // Session active en priorité, sinon la plus récente
  const session = await prisma.session.findFirst({
    where: { type: 'CHOIX' },
    orderBy: [{ is_active: 'desc' }, { date_fin: 'desc' }],
  });
  if (!session) throw new BadRequestError('Aucune session de type CHOIX trouvée');

  const encadrantId = rest.besoin_encadrant ? null : (rest.encadrant_id ?? null);
  const isAffecteAuto = dto.type_pfe === 'STARTUP' && !!encadrant_externe;

  return prisma.$transaction(async (tx) => {
    const theme = await tx.theme.create({
      data: {
        ...rest,
        propose_par_id: proposeParId,
        session_id: session.id,
        encadrant_id: encadrantId,
        is_affecte: isAffecteAuto,
        encadrant_externe: encadrant_externe
          ? (encadrant_externe as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        theme_specialites: {
          create: specialite_ids.map((specialite_id) => ({ specialite_id })),
        },
      },
      include: THEME_INCLUDE,
    });

    // Affectation vide créée pour STARTUP avec encadrant externe — membres ajoutés via /equipe
    if (isAffecteAuto) {
      await tx.affectation.create({
        data: {
          theme_id: theme.id,
          encadrant_id: null,
          session_id: session.id,
          affecte_par: _admin.userId,
          type: 'LIBRE',
        },
      });
    }

    return theme;
  });
}

// ─── Modification ─────────────────────────────────────────────────────────────

export async function updateTheme(id: string, dto: Partial<CreateThemeDto>, user: TokenPayload) {
  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) throw new NotFoundError('Thème');

  const isAuthor = theme.propose_par_id === user.userId;
  const isAdmin = ['CHEF_EQUIPE', 'CHEF_DEPT'].includes(user.role);

  if (!isAuthor && !isAdmin) {
    throw new ForbiddenError('Vous ne pouvez pas modifier ce thème');
  }

  if (theme.statut_validation === 'VALIDE' && !isAdmin) {
    throw new ForbiddenError(
      'Ce thème est validé. Contactez le responsable de filière pour toute modification.',
    );
  }

  if (theme.is_affecte && !isAdmin) {
    throw new ForbiddenError('Ce thème est déjà affecté et ne peut plus être modifié.');
  }

  if (dto.type_pfe && dto.sous_types !== undefined) {
    validateThemeType(dto.type_pfe, dto.sous_types);
  }

  const { specialite_ids, encadrant_externe, encadrant_id, ...rest } = dto;

  const updateData: Prisma.ThemeUpdateInput = {
    ...rest,
    ...(encadrant_id !== undefined
      ? { encadrant: encadrant_id ? { connect: { id: encadrant_id } } : { disconnect: true } }
      : {}),
    ...(encadrant_externe !== undefined
      ? {
          encadrant_externe:
            encadrant_externe === null
              ? Prisma.JsonNull
              : (encadrant_externe as unknown as Prisma.InputJsonValue),
        }
      : {}),
    ...(specialite_ids
      ? {
          theme_specialites: {
            deleteMany: {},
            create: specialite_ids.map((sid) => ({ specialite: { connect: { id: sid } } })),
          },
        }
      : {}),
  };

  return prisma.theme.update({
    where: { id },
    data: updateData,
    include: THEME_INCLUDE,
  });
}

// ─── Suppression (CHEF_EQUIPE uniquement) ────────────────────────────────────

export async function deleteTheme(id: string) {
  const theme = await prisma.theme.findUnique({
    where: { id },
    include: { choix: true, affectation: true },
  });
  if (!theme) throw new NotFoundError('Thème');

  if (theme.is_affecte || theme.affectation) {
    throw new BadRequestError('Impossible de supprimer un thème déjà affecté');
  }

  if (theme.choix.length > 0) {
    throw new BadRequestError(
      `Impossible de supprimer : ${theme.choix.length} étudiant(s) ont choisi ce thème`,
    );
  }

  await prisma.theme.delete({ where: { id } });
}

// ─── Validation / Refus (CHEF_EQUIPE) ───────────────────────────────────────

export async function validateTheme(id: string, action: 'VALIDE' | 'REFUSE', motif?: string) {
  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) throw new NotFoundError('Thème');

  if (action === 'VALIDE' && theme.statut_validation === 'VALIDE') {
    throw new BadRequestError('Ce thème est déjà validé');
  }

  const updated = await prisma.theme.update({
    where: { id },
    data: { statut_validation: action === 'VALIDE' ? 'VALIDE' : 'NON_VALIDE' },
    include: THEME_INCLUDE,
  });

  const message =
    action === 'VALIDE'
      ? `Votre thème "${theme.titre}" a été validé.`
      : `Votre thème "${theme.titre}" a été refusé.${motif ? ` Motif : ${motif}` : ''}`;

  await notifyUser(theme.propose_par_id, 'THEME_VALIDATED', message, {
    theme_id: id,
    action,
    ...(motif ? { motif } : {}),
  });

  return updated;
}

// ─── Marquer soutenu (Technicien / Chef Dept) ────────────────────────────────

export async function markAsSoutenu(id: string) {
  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) throw new NotFoundError('Thème');
  if (!theme.is_affecte) throw new BadRequestError('Impossible de marquer soutenu un thème non affecté');
  if (theme.is_soutenu) throw new BadRequestError('Ce thème est déjà marqué soutenu');
  return prisma.theme.update({ where: { id }, data: { is_soutenu: true }, include: THEME_INCLUDE });
}

// ─── Thèmes cherchant un binôme (annonces) ───────────────────────────────────

export async function getThemesCherchandBinome(filters: {
  specialite_id?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 50, specialite_id } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ThemeWhereInput = {
    cherche_binome: true,
    statut_validation: 'VALIDE',
    is_affecte: false,
    // Uniquement les thèmes proposés par des étudiants (annonces de recherche de binôme)
    propose_par: { role: 'ETUDIANT' },
    ...(specialite_id ? { theme_specialites: { some: { specialite_id } } } : {}),
  };

  const [total, themes] = await Promise.all([
    prisma.theme.count({ where }),
    prisma.theme.findMany({
      where,
      skip,
      take: limit,
      include: {
        propose_par: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            specialite: { select: { id: true, nom: true } },
          },
        },
        theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
        session: { select: { id: true, type: true, annee_universitaire: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return { data: themes, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

// ─── Export Excel / PDF ───────────────────────────────────────────────────────

export async function exportThemes(
  format: 'excel' | 'pdf',
  filters: Omit<ThemeFilters, 'page' | 'limit'>,
  res: Response,
): Promise<void> {
  const { data: themes } = await getThemes({ ...filters, limit: 2000, page: 1 });

  const statut = (t: typeof themes[0]) => {
    if (t.is_soutenu) return 'Soutenu';
    if (t.is_affecte) return 'Affecté';
    if (t.statut_validation === 'VALIDE') return 'Validé';
    return 'En attente';
  };

  if (format === 'excel') {
    const rows = themes.map((t) => ({
      Titre: t.titre,
      Type: t.type_pfe,
      Statut: statut(t),
      'Proposé par': `${t.propose_par.prenom} ${t.propose_par.nom}`,
      Encadrant: t.encadrant ? `${t.encadrant.prenom} ${t.encadrant.nom}` : '—',
      Spécialités: t.theme_specialites.map((ts) => ts.specialite.nom).join(', '),
      'Année universitaire': t.session.annee_universitaire,
      Affecté: t.is_affecte ? 'Oui' : 'Non',
      Soutenu: t.is_soutenu ? 'Oui' : 'Non',
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 50 }, { wch: 12 }, { wch: 12 }, { wch: 22 },
      { wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
    ];
    xlsx.utils.book_append_sheet(wb, ws, 'Thèmes PFE');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="themes_pfe_${Date.now()}.xlsx"`);
    res.send(buf);
    return;
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="themes_pfe_${Date.now()}.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('Suivi des Thèmes PFE — e-PFE', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Université de Béjaïa — Département Informatique', { align: 'center' });
    doc.fontSize(9).text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${themes.length} thème(s)`, { align: 'center' });
    doc.moveDown(1.5);

    const headers = ['Titre', 'Type', 'Statut', 'Proposé par', 'Encadrant', 'Spécialités'];
    const colWidths = [200, 65, 65, 110, 110, 110];
    const startX = 40;
    let y = doc.y;

    doc.font('Helvetica-Bold').fontSize(9);
    let x = startX;
    headers.forEach((h, i) => {
      doc.rect(x, y, colWidths[i], 18).fillAndStroke('#2563eb', '#1e40af');
      doc.fillColor('white').text(h, x + 4, y + 4, { width: colWidths[i] - 8, lineBreak: false });
      x += colWidths[i];
    });

    doc.font('Helvetica').fontSize(8).fillColor('black');
    y += 18;

    themes.forEach((t, idx) => {
      if (y > 510) {
        doc.addPage({ layout: 'landscape' });
        y = 40;
      }
      const bg = idx % 2 === 0 ? '#f8fafc' : 'white';
      x = startX;
      const row = [
        t.titre,
        t.type_pfe,
        statut(t),
        `${t.propose_par.prenom} ${t.propose_par.nom}`,
        t.encadrant ? `${t.encadrant.prenom} ${t.encadrant.nom}` : '—',
        t.theme_specialites.map((ts) => ts.specialite.nom).join(', '),
      ];
      row.forEach((val, i) => {
        doc.rect(x, y, colWidths[i], 16).fillAndStroke(bg, '#e2e8f0');
        doc.fillColor('#1e293b').text(val, x + 4, y + 3, { width: colWidths[i] - 8, lineBreak: false });
        x += colWidths[i];
      });
      y += 16;
    });

    doc.end();
    return;
  }

  throw new BadRequestError('Format invalide. Utilisez "excel" ou "pdf"');
}
