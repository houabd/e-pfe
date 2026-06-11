import type { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware/error.middleware';
import { notifyUser } from './notification.service';
import type { CreateThemeDto, ThemeFilters } from '../types';
import type { TokenPayload } from '../utils/token.utils';

// ─── Sélection commune ─────────────────────────────────────────────────────────

const THEME_INCLUDE = {
  propose_par: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
  encadrant: { select: { id: true, nom: true, prenom: true, email: true } },
  co_encadrant: { select: { id: true, nom: true, prenom: true, email: true } },
  theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
  session: { select: { id: true, type: true, annee_universitaire: true } },
} as const;

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getThemes(filters: ThemeFilters) {
  const {
    page = 1, limit = 20,
    specialite_id, etudiant_specialite_id, type_pfe, statut_validation,
    is_affecte, besoin_encadrant, session_id, enseignant_id,
    annee_universitaire, search,
  } = filters;
  const skip = (page - 1) * limit;

  // Conditions composées (plusieurs OR) groupées dans un AND pour éviter les conflits
  const andConditions: Prisma.ThemeWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { titre: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { mots_cles: { has: search } },
      ],
    });
  }

  if (etudiant_specialite_id) {
    // Thèmes visibles par cet étudiant : sans spécialité définie OU spécialité correspondante
    andConditions.push({
      OR: [
        { theme_specialites: { none: {} } },
        { theme_specialites: { some: { specialite_id: etudiant_specialite_id } } },
      ],
    });
  }

  // Masquer les thèmes proposés par enseignants dont le co-encadrant n'a pas encore confirmé
  andConditions.push({
    OR: [
      { propose_par: { role: 'ETUDIANT' } },
      { encadrant_valide: true },
    ],
  });

  const where: Prisma.ThemeWhereInput = {
    ...(type_pfe ? { type_pfe } : {}),
    ...(statut_validation ? { statut_validation } : {}),
    ...(is_affecte !== undefined ? { is_affecte } : {}),
    ...(besoin_encadrant !== undefined ? { besoin_encadrant } : {}),
    ...(session_id ? { session_id } : {}),
    ...(enseignant_id ? { propose_par_id: enseignant_id } : {}),
    ...(specialite_id ? { theme_specialites: { some: { specialite_id } } } : {}),
    ...(annee_universitaire ? { session: { annee_universitaire } } : {}),
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
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

const ETUDIANT_SELECT_DETAIL = {
  id: true, nom: true, prenom: true, email: true,
  matricule: true, specialite: { select: { id: true, nom: true } },
} as const;

export async function getThemeById(id: string) {
  const theme = await prisma.theme.findUnique({
    where: { id },
    include: {
      ...THEME_INCLUDE,
      affectation: {
        include: {
          etudiants: { include: { etudiant: { select: ETUDIANT_SELECT_DETAIL } } },
          startup_membres: { include: { etudiant: { select: ETUDIANT_SELECT_DETAIL } } },
        },
      },
    },
  });
  if (!theme) throw new NotFoundError('Thème');
  return theme;
}

export async function getMyThemes(userId: string, filters: Omit<ThemeFilters, 'enseignant_id'>) {
  const {
    page = 1, limit = 20,
    specialite_id, type_pfe, statut_validation,
    is_affecte, besoin_encadrant, session_id,
    annee_universitaire, search,
  } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ThemeWhereInput = {
    OR: [
      { propose_par_id: userId },
      { encadrant_id: userId },
      { co_encadrant_id: userId },
    ],
    ...(type_pfe ? { type_pfe } : {}),
    ...(statut_validation ? { statut_validation } : {}),
    ...(is_affecte !== undefined ? { is_affecte } : {}),
    ...(besoin_encadrant !== undefined ? { besoin_encadrant } : {}),
    ...(session_id ? { session_id } : {}),
    ...(specialite_id ? { theme_specialites: { some: { specialite_id } } } : {}),
    ...(annee_universitaire ? { session: { annee_universitaire } } : {}),
    ...(search
      ? {
          AND: [{
            OR: [
              { titre: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
              { mots_cles: { has: search } },
            ],
          }],
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

const TEACHER_ROLES = ['ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'];

async function assertTitreUnique(titre: string, excludeId?: string) {
  const existing = await prisma.theme.findFirst({
    where: {
      titre: { equals: titre, mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new BadRequestError(`Un thème avec le titre "${titre}" existe déjà`);
  }
}

export async function createTheme(dto: CreateThemeDto, user: TokenPayload) {
  const { specialite_ids, encadrant_externe, ...rest } = dto;

  validateThemeType(dto.type_pfe, dto.sous_types ?? []);
  await assertTitreUnique(dto.titre);

  // Logique encadrant : enseignant = proposant toujours encadrant principal
  const isTeacher = TEACHER_ROLES.includes(user.role);

  // Les enseignants peuvent proposer dans n'importe quelle session active (CHOIX ou AFFECTATION)
  // Les étudiants uniquement pendant la session CHOIX
  const sessionWhere = isTeacher
    ? { is_active: true, date_debut: { lte: new Date() }, date_fin: { gte: new Date() } }
    : { type: 'CHOIX' as const, is_active: true, date_debut: { lte: new Date() }, date_fin: { gte: new Date() } };

  const session = await prisma.session.findFirst({ where: sessionWhere });

  if (!session) {
    throw new BadRequestError(
      isTeacher
        ? 'Aucune session active. Impossible de proposer un thème.'
        : 'La session de choix des thèmes n\'est pas ouverte.',
    );
  }
  let encadrantId: string | null;
  let coEncadrantId: string | null;
  let encadrantValide: boolean;

  if (isTeacher) {
    encadrantId = user.userId;
    coEncadrantId = rest.encadrant_id ?? null;
    encadrantValide = !coEncadrantId;
  } else {
    // Étudiant
    encadrantId = rest.besoin_encadrant ? null : (rest.encadrant_id ?? null);
    coEncadrantId = null;
    encadrantValide = !!encadrantId ? false : true;
  }

  // STARTUP avec encadrant externe fourni → affectation automatique (CLAUDE.md)
  const isAffecteAuto = dto.type_pfe === 'STARTUP' && !!encadrant_externe;

  // Si étudiant avec binôme actif → le partenaire rejoint l'équipe STARTUP automatiquement
  let binomePartnerId: string | null = null;
  if (isAffecteAuto && user.role === 'ETUDIANT') {
    const binomeActif = await prisma.binome.findFirst({
      where: {
        OR: [{ etud1_id: user.userId }, { etud2_id: user.userId }],
        statut: 'ACCEPTED',
      },
      select: { etud1_id: true, etud2_id: true },
    });
    if (binomeActif) {
      binomePartnerId = binomeActif.etud1_id === user.userId
        ? binomeActif.etud2_id
        : binomeActif.etud1_id;
    }
  }

  return prisma.$transaction(async (tx) => {
    const theme = await tx.theme.create({
      data: {
        ...rest,
        propose_par_id: user.userId,
        session_id: session!.id,
        encadrant_id: encadrantId,
        co_encadrant_id: coEncadrantId,
        encadrant_valide: encadrantValide,
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

    // Crée l'affectation startup et ajoute le proposant (+ son binôme si applicable) comme membres
    if (isAffecteAuto) {
      const startupMembresData = [
        { etudiant_id: user.userId },
        ...(binomePartnerId ? [{ etudiant_id: binomePartnerId }] : []),
      ];
      await tx.affectation.create({
        data: {
          theme_id: theme.id,
          encadrant_id: null, // encadrant externe → pas d'encadrant interne
          session_id: session!.id,
          affecte_par: user.userId,
          type: 'LIBRE',
          ...(user.role === 'ETUDIANT'
            ? { startup_membres: { create: startupMembresData } }
            : {}),
        },
      });
    }

    return theme;
  }).then(async (theme) => {
    // Notifier l'encadrant désigné par l'étudiant pour qu'il confirme
    if (!isTeacher && !encadrantValide && encadrantId) {
      const etudiant = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { nom: true, prenom: true },
      });
      const who = etudiant ? `${etudiant.prenom} ${etudiant.nom}` : 'Un étudiant';
      await notifyUser(
        encadrantId,
        'ENCADRANT_CONFIRM_REQUEST',
        `${who} vous désigne comme encadrant pour le thème "${theme.titre}". Veuillez confirmer ou refuser.`,
        { theme_id: theme.id },
      );
    }
    // Notifier le co-encadrant désigné par l'enseignant pour qu'il confirme
    if (isTeacher && coEncadrantId) {
      const enseignant = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { nom: true, prenom: true },
      });
      const whoEns = enseignant ? `${enseignant.prenom} ${enseignant.nom}` : 'Un enseignant';
      await notifyUser(
        coEncadrantId,
        'ENCADRANT_CONFIRM_REQUEST',
        `${whoEns} vous a désigné co-encadrant du thème "${theme.titre}".`,
        { theme_id: theme.id },
      );
    }
    // Notifier le partenaire de binôme ajouté à l'équipe STARTUP
    if (binomePartnerId) {
      await notifyUser(
        binomePartnerId,
        'STARTUP_MEMBRE_AJOUTE',
        `Votre binôme vous a ajouté(e) à l'équipe STARTUP "${theme.titre}".`,
        { theme_id: theme.id },
      );
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
  await assertTitreUnique(dto.titre);

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

  // Proposant est toujours l'encadrant principal ; encadrant_id du DTO devient co-encadrant
  const encadrantId = proposeParId;
  const coEncadrantId = rest.encadrant_id ?? null;
  const isAffecteAuto = dto.type_pfe === 'STARTUP' && !!encadrant_externe;

  return prisma.$transaction(async (tx) => {
    const theme = await tx.theme.create({
      data: {
        ...rest,
        propose_par_id: proposeParId,
        session_id: session.id,
        encadrant_id: encadrantId,
        co_encadrant_id: coEncadrantId,
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

  if (!isAuthor) {
    throw new ForbiddenError('Vous ne pouvez pas modifier ce thème');
  }

  const needsPermission = theme.statut_validation === 'VALIDE' || theme.is_affecte;
  if (needsPermission && !theme.modification_autorisee) {
    throw new ForbiddenError(
      'Ce thème est validé ou affecté. Soumettez une demande de modification.',
    );
  }

  if (dto.type_pfe && dto.sous_types !== undefined) {
    validateThemeType(dto.type_pfe, dto.sous_types);
  }
  if (dto.titre !== undefined) {
    await assertTitreUnique(dto.titre, id);
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

  const updated = await prisma.theme.update({
    where: { id },
    data: {
      ...updateData,
      // Consommer le droit de modification après usage
      ...(theme.modification_autorisee ? { modification_autorisee: false } : {}),
    },
    include: THEME_INCLUDE,
  });

  return updated;
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

// ─── Confirmation encadrant (pour thèmes proposés par étudiants) ────────────

export async function getThemesAwaitingMyConfirmation(encadrantId: string) {
  return prisma.theme.findMany({
    where: {
      encadrant_id: encadrantId,
      encadrant_valide: false,
      propose_par: { role: 'ETUDIANT' },
    },
    include: THEME_INCLUDE,
    orderBy: { created_at: 'desc' },
  });
}

export async function confirmEncadrant(themeId: string, encadrantId: string) {
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    include: { propose_par: { select: { role: true } } },
  });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.encadrant_id !== encadrantId) throw new ForbiddenError('Vous n\'êtes pas l\'encadrant désigné pour ce thème');
  if (theme.encadrant_valide) throw new BadRequestError('Ce thème est déjà confirmé');

  const proposerIsEtudiant = theme.propose_par.role === 'ETUDIANT';

  let partnerId: string | null = null;

  const updated = await prisma.$transaction(async (tx) => {
    const themeUpdate = await tx.theme.update({
      where: { id: themeId },
      data: {
        encadrant_valide: true,
        ...(proposerIsEtudiant ? { is_affecte: true } : {}),
      },
      include: THEME_INCLUDE,
    });

    if (proposerIsEtudiant) {
      const existing = await tx.affectation.findFirst({ where: { theme_id: themeId } });
      if (!existing) {
        const binomeActif = await tx.binome.findFirst({
          where: {
            OR: [{ etud1_id: theme.propose_par_id }, { etud2_id: theme.propose_par_id }],
            statut: 'ACCEPTED',
          },
          select: { id: true, etud1_id: true, etud2_id: true },
        });
        const binomeId = binomeActif?.id ?? null;
        partnerId = binomeActif
          ? (binomeActif.etud1_id === theme.propose_par_id ? binomeActif.etud2_id : binomeActif.etud1_id)
          : null;

        const affectation = await tx.affectation.create({
          data: {
            theme_id: themeId,
            encadrant_id: encadrantId,
            session_id: theme.session_id,
            affecte_par: encadrantId,
            type: 'LIBRE',
          },
        });

        if (theme.type_pfe === 'STARTUP') {
          const membres = [theme.propose_par_id, ...(partnerId ? [partnerId] : [])];
          await tx.startupMembre.createMany({
            data: membres.map((etudiant_id) => ({ affectation_id: affectation.id, etudiant_id })),
          });
        } else {
          await tx.affectationEtudiant.create({
            data: { affectation_id: affectation.id, etudiant_id: theme.propose_par_id, binome_id: binomeId },
          });
          if (partnerId) {
            await tx.affectationEtudiant.create({
              data: { affectation_id: affectation.id, etudiant_id: partnerId, binome_id: binomeId },
            });
          }
        }
      }
    }

    return themeUpdate;
  });

  const msg = proposerIsEtudiant
    ? `L'encadrant a confirmé sa supervision pour votre thème "${theme.titre}" — vous êtes maintenant affecté.`
    : `L'encadrant a confirmé sa supervision pour votre thème "${theme.titre}".`;

  await notifyUser(theme.propose_par_id, 'ENCADRANT_CONFIRM_RESPONSE', msg, { theme_id: themeId, confirmed: true });

  if (partnerId) {
    await notifyUser(
      partnerId,
      'ENCADRANT_CONFIRM_RESPONSE',
      `L'encadrant a confirmé sa supervision pour le thème "${theme.titre}" de votre binôme — vous êtes maintenant affecté.`,
      { theme_id: themeId, confirmed: true },
    );
  }

  return updated;
}

export async function refuseEncadrant(themeId: string, encadrantId: string) {
  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.encadrant_id !== encadrantId) throw new ForbiddenError('Vous n\'êtes pas l\'encadrant désigné pour ce thème');
  if (theme.encadrant_valide) throw new BadRequestError('Ce thème est déjà confirmé');

  // Retirer l'encadrant → thème cherche maintenant un encadrant
  const updated = await prisma.theme.update({
    where: { id: themeId },
    data: { encadrant_id: null, encadrant_valide: true, besoin_encadrant: true },
    include: THEME_INCLUDE,
  });

  await notifyUser(
    theme.propose_par_id,
    'ENCADRANT_CONFIRM_RESPONSE',
    `L'encadrant a refusé de superviser votre thème "${theme.titre}". Votre thème cherche maintenant un encadrant.`,
    { theme_id: themeId, confirmed: false },
  );

  return updated;
}

// ─── Co-encadrant (confirmation / refus par l'enseignant désigné) ────────────

export async function getThemesAwaitingCoEncadrantConfirmation(userId: string) {
  return prisma.theme.findMany({
    where: { co_encadrant_id: userId, encadrant_valide: false },
    include: THEME_INCLUDE,
    orderBy: { created_at: 'desc' },
  });
}

export async function confirmCoEncadrant(themeId: string, coEncadrantId: string) {
  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.co_encadrant_id !== coEncadrantId) throw new ForbiddenError("Vous n'êtes pas le co-encadrant désigné pour ce thème");
  if (theme.encadrant_valide) throw new BadRequestError('Ce thème est déjà confirmé');

  const updated = await prisma.theme.update({
    where: { id: themeId },
    data: { encadrant_valide: true },
    include: THEME_INCLUDE,
  });

  if (theme.encadrant_id) {
    const coEnc = updated.co_encadrant;
    await notifyUser(
      theme.encadrant_id,
      'ENCADRANT_CONFIRM_RESPONSE',
      `${coEnc ? `${coEnc.prenom} ${coEnc.nom}` : 'Le co-encadrant'} a accepté de co-encadrer le thème "${theme.titre}".`,
      { theme_id: theme.id },
    );
  }
  return updated;
}

export async function refuseCoEncadrant(themeId: string, coEncadrantId: string) {
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    include: { co_encadrant: { select: { prenom: true, nom: true } } },
  });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.co_encadrant_id !== coEncadrantId) throw new ForbiddenError("Vous n'êtes pas le co-encadrant désigné pour ce thème");
  if (theme.encadrant_valide) throw new BadRequestError('Ce thème est déjà confirmé');

  const updated = await prisma.theme.update({
    where: { id: themeId },
    data: { co_encadrant_id: null, encadrant_valide: true },
    include: THEME_INCLUDE,
  });

  if (theme.encadrant_id) {
    const coEnc = theme.co_encadrant;
    await notifyUser(
      theme.encadrant_id,
      'ENCADRANT_CONFIRM_RESPONSE',
      `${coEnc ? `${coEnc.prenom} ${coEnc.nom}` : 'Le co-encadrant'} a refusé de co-encadrer le thème "${theme.titre}".`,
      { theme_id: theme.id },
    );
  }
  return updated;
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

export async function markAsSoutenu(themeId: string, isSoutenu: boolean) {
  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme) throw new NotFoundError('Thème');

  const soutenance = await prisma.soutenance.findFirst({ where: { theme_id: themeId } });
  if (!soutenance) {
    throw new BadRequestError('Ce thème n\'a pas de soutenance planifiée.');
  }

  const updated = await prisma.theme.update({
    where: { id: themeId },
    data: { is_soutenu: isSoutenu },
    include: THEME_INCLUDE,
  });

  if (isSoutenu) {
    const affectation = await prisma.affectation.findFirst({
      where: { theme_id: themeId },
      include: { etudiants: { select: { etudiant_id: true } } },
    });
    const msg = `Félicitations ! Votre soutenance du thème "${theme.titre}" a été validée et enregistrée.`;
    for (const ae of affectation?.etudiants ?? []) {
      await notifyUser(ae.etudiant_id, 'THEME_SOUTENU', msg, { theme_id: themeId });
    }
  }

  return updated;
}

// ─── Demandes de modification ─────────────────────────────────────────────────

export async function demanderModification(themeId: string, demandeurId: string, motif: string) {
  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.propose_par_id !== demandeurId) {
    throw new ForbiddenError("Vous n'êtes pas le proposant de ce thème");
  }
  if (theme.statut_validation !== 'VALIDE' && !theme.is_affecte) {
    throw new BadRequestError('Le thème n\'est pas encore validé — vous pouvez le modifier directement.');
  }
  if (theme.modification_autorisee) {
    throw new BadRequestError('Vous avez déjà une autorisation de modification en cours.');
  }

  const existingPending = await prisma.demandeModificationTheme.findFirst({
    where: { theme_id: themeId, statut: 'PENDING' },
  });
  if (existingPending) {
    throw new BadRequestError('Une demande est déjà en attente pour ce thème.');
  }

  const demande = await prisma.demandeModificationTheme.create({
    data: { theme_id: themeId, demandeur_id: demandeurId, motif },
    include: { theme: { select: { id: true, titre: true } }, demandeur: { select: { id: true, nom: true, prenom: true } } },
  });

  // Notifier CHEF_DEPT et CHEF_EQUIPE
  const admins = await prisma.user.findMany({
    where: { role: { in: ['CHEF_DEPT', 'CHEF_EQUIPE'] }, is_active: true },
    select: { id: true },
  });
  const who = `${demande.demandeur.prenom} ${demande.demandeur.nom}`;
  for (const admin of admins) {
    await notifyUser(admin.id, 'MODIFICATION_DEMANDE',
      `${who} demande l'autorisation de modifier le thème "${demande.theme.titre}"`,
      { theme_id: themeId, demande_id: demande.id });
  }

  return demande;
}

export async function getDemandesModification(filters: { statut?: 'PENDING' | 'ACCEPTED' | 'REFUSED' }) {
  return prisma.demandeModificationTheme.findMany({
    where: filters.statut ? { statut: filters.statut } : {},
    include: {
      theme: {
        select: {
          id: true, titre: true, type_pfe: true, statut_validation: true, is_affecte: true,
          theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
        },
      },
      demandeur: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function traiterDemandeModification(
  demandeId: string,
  _adminId: string,
  decision: 'ACCEPTED' | 'REFUSED',
  commentaire?: string,
) {
  const demande = await prisma.demandeModificationTheme.findUnique({
    where: { id: demandeId },
    include: { theme: { select: { id: true, titre: true } }, demandeur: { select: { id: true } } },
  });
  if (!demande) throw new NotFoundError('Demande');
  if (demande.statut !== 'PENDING') throw new BadRequestError('Cette demande a déjà été traitée.');

  await prisma.$transaction(async (tx) => {
    await tx.demandeModificationTheme.update({
      where: { id: demandeId },
      data: { statut: decision, commentaire_admin: commentaire ?? null },
    });
    if (decision === 'ACCEPTED') {
      await tx.theme.update({
        where: { id: demande.theme_id },
        data: { modification_autorisee: true },
      });
    }
  });

  const message = decision === 'ACCEPTED'
    ? `Votre demande de modification pour "${demande.theme.titre}" a été acceptée. Vous pouvez maintenant modifier votre thème.`
    : `Votre demande de modification pour "${demande.theme.titre}" a été refusée.${commentaire ? ` Motif : ${commentaire}` : ''}`;

  await notifyUser(demande.demandeur.id,
    decision === 'ACCEPTED' ? 'MODIFICATION_ACCEPTEE' : 'MODIFICATION_REFUSEE',
    message,
    { theme_id: demande.theme_id, demande_id: demandeId });

  return { message: decision === 'ACCEPTED' ? 'Demande acceptée' : 'Demande refusée' };
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

// ─── Thèmes cherchant un encadrant (annonces enseignants) ────────────────────

export async function getThemesNeedingEncadrant(filters: {
  specialite_id?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 50, specialite_id } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ThemeWhereInput = {
    besoin_encadrant: true,
    statut_validation: 'VALIDE',
    is_affecte: false,
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

export async function postulerEncadrant(themeId: string, enseignantId: string) {
  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme) throw new NotFoundError('Thème introuvable');
  if (!theme.besoin_encadrant) throw new BadRequestError('Ce thème ne cherche pas d\'encadrant');
  if (theme.statut_validation !== 'VALIDE') throw new BadRequestError('Ce thème n\'est pas encore validé');

  let partnerId: string | null = null;

  const updated = await prisma.$transaction(async (tx) => {
    const themeUpdate = await tx.theme.update({
      where: { id: themeId },
      data: { encadrant_id: enseignantId, besoin_encadrant: false, encadrant_valide: true, is_affecte: true },
      include: THEME_INCLUDE,
    });

    const existing = await tx.affectation.findFirst({ where: { theme_id: themeId } });
    if (!existing) {
      const binomeActif = await tx.binome.findFirst({
        where: {
          OR: [{ etud1_id: theme.propose_par_id }, { etud2_id: theme.propose_par_id }],
          statut: 'ACCEPTED',
        },
        select: { id: true, etud1_id: true, etud2_id: true },
      });
      const binomeId = binomeActif?.id ?? null;
      partnerId = binomeActif
        ? (binomeActif.etud1_id === theme.propose_par_id ? binomeActif.etud2_id : binomeActif.etud1_id)
        : null;

      const affectation = await tx.affectation.create({
        data: {
          theme_id: themeId,
          encadrant_id: enseignantId,
          session_id: theme.session_id,
          affecte_par: enseignantId,
          type: 'LIBRE',
        },
      });

      if (theme.type_pfe === 'STARTUP') {
        const membres = [theme.propose_par_id, ...(partnerId ? [partnerId] : [])];
        await tx.startupMembre.createMany({
          data: membres.map((etudiant_id) => ({ affectation_id: affectation.id, etudiant_id })),
        });
      } else {
        await tx.affectationEtudiant.create({
          data: { affectation_id: affectation.id, etudiant_id: theme.propose_par_id, binome_id: binomeId },
        });
        if (partnerId) {
          await tx.affectationEtudiant.create({
            data: { affectation_id: affectation.id, etudiant_id: partnerId, binome_id: binomeId },
          });
        }
      }
    }

    return themeUpdate;
  });

  const enseignant = await prisma.user.findUnique({ where: { id: enseignantId }, select: { nom: true, prenom: true } });
  const nomEnseignant = enseignant ? `${enseignant.prenom} ${enseignant.nom}` : 'Un enseignant';

  await notifyUser(
    theme.propose_par_id,
    'ENCADRANT_CONFIRM_RESPONSE',
    `${nomEnseignant} a accepté d'encadrer votre thème "${theme.titre}" — vous êtes maintenant affecté.`,
    { theme_id: themeId, confirmed: true },
  );

  if (partnerId) {
    await notifyUser(
      partnerId,
      'ENCADRANT_CONFIRM_RESPONSE',
      `${nomEnseignant} a accepté d'encadrer le thème "${theme.titre}" de votre binôme — vous êtes maintenant affecté.`,
      { theme_id: themeId, confirmed: true },
    );
  }

  return updated;
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
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Thèmes PFE');

    ws.columns = [
      { header: 'Titre',               key: 'titre',       width: 55 },
      { header: 'Type',                key: 'type',        width: 13 },
      { header: 'Statut',              key: 'statut',      width: 13 },
      { header: 'Proposé par',         key: 'propose_par', width: 24 },
      { header: 'Encadrant',           key: 'encadrant',   width: 24 },
      { header: 'Spécialités',         key: 'specialites', width: 30 },
      { header: 'Année universitaire', key: 'annee',       width: 20 },
      { header: 'Affecté',             key: 'affecte',     width: 10 },
      { header: 'Soutenu',             key: 'soutenu',     width: 10 },
    ];

    // Style de l'en-tête
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1E40AF' } },
        bottom: { style: 'thin', color: { argb: 'FF1E40AF' } },
        left: { style: 'thin', color: { argb: 'FF1E40AF' } },
        right: { style: 'thin', color: { argb: 'FF1E40AF' } },
      };
    });
    headerRow.height = 22;

    themes.forEach((t, idx) => {
      const row = ws.addRow({
        titre:       t.titre,
        type:        t.type_pfe,
        statut:      statut(t),
        propose_par: `${t.propose_par.prenom} ${t.propose_par.nom}`,
        encadrant:   t.encadrant ? `${t.encadrant.prenom} ${t.encadrant.nom}` : '—',
        specialites: t.theme_specialites.map((ts) => ts.specialite.nom).join(', '),
        annee:       t.session.annee_universitaire,
        affecte:     t.is_affecte ? 'Oui' : 'Non',
        soutenu:     t.is_soutenu ? 'Oui' : 'Non',
      });

      const bg: ExcelJS.Fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: idx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' },
      };
      const border: Partial<ExcelJS.Borders> = {
        top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      row.eachCell((cell) => {
        cell.fill = bg;
        cell.border = border;
        cell.alignment = { vertical: 'top', wrapText: false };
      });

      // wrapText uniquement sur la colonne Titre
      const titreCell = row.getCell('titre');
      titreCell.alignment = { vertical: 'top', wrapText: true };
      // Calibri 11pt dans une colonne de 55 unités ≈ 38 caractères par ligne
      // 20pt par ligne pour inclure l'interligne
      const estimatedLines = Math.ceil(t.titre.length / 38);
      row.height = Math.max(20, estimatedLines * 20);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="themes_pfe_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    return;
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="themes_pfe_${Date.now()}.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('Suivi des Thèmes PFE — e-PFC', { align: 'center' });
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
