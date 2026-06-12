import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '../middleware/error.middleware';
import { notifyUser } from './notification.service';
import type { CreateAffectationDto, ConfirmerAutoDto } from '../types';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';

// ─── Sélection commune ────────────────────────────────────────────────────────

const AFFECTATION_INCLUDE = {
  theme: {
    include: { theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } } },
  },
  encadrant: { select: { id: true, nom: true, prenom: true, email: true } },
  etudiants: {
    include: {
      etudiant: { select: { id: true, nom: true, prenom: true, email: true, matricule: true } },
    },
  },
} as const;

const STARTUP_INCLUDE = {
  theme: {
    select: {
      id: true, titre: true, type_pfe: true, encadrant_externe: true,
      theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
    },
  },
  encadrant: { select: { id: true, nom: true, prenom: true, email: true } },
  startup_membres: {
    include: {
      etudiant: {
        select: {
          id: true, nom: true, prenom: true, email: true, matricule: true,
          specialite: { select: { id: true, nom: true } },
        },
      },
    },
    orderBy: { id: 'asc' as const },
  },
  membres_externes: { orderBy: { created_at: 'asc' as const } },
  etudiants: {
    include: {
      etudiant: {
        select: {
          id: true, nom: true, prenom: true, email: true, matricule: true,
          specialite: { select: { id: true, nom: true } },
        },
      },
    },
  },
} as const;

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getAffectations(filters: {
  session_id?: string;
  specialite_id?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20, session_id, specialite_id } = filters;
  const skip = (page - 1) * limit;

  const where = {
    ...(session_id ? { session_id } : {}),
    ...(specialite_id ? { theme: { theme_specialites: { some: { specialite_id } } } } : {}),
  };

  const [total, affectations] = await Promise.all([
    prisma.affectation.count({ where }),
    prisma.affectation.findMany({ where, skip, take: limit, include: AFFECTATION_INCLUDE, orderBy: { created_at: 'desc' } }),
  ]);

  return { data: affectations, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getMonAffectation(etudiantId: string) {
  const affEtudiant = await prisma.affectationEtudiant.findFirst({
    where: { etudiant_id: etudiantId },
    select: {
      affectation: {
        select: {
          id: true,
          type: true,
          theme: { select: { id: true, titre: true, type_pfe: true } },
          encadrant: { select: { id: true, nom: true, prenom: true } },
          _count: { select: { etudiants: true } },
          etudiants: {
            select: {
              etudiant: { select: { id: true, nom: true, prenom: true, email: true, specialite: { select: { id: true, nom: true } } } },
            },
          },
        },
      },
    },
  });
  if (affEtudiant) {
    const { _count, etudiants, ...rest } = affEtudiant.affectation;
    const coequipiers = etudiants
      .filter((e) => e.etudiant.id !== etudiantId)
      .map((e) => e.etudiant);
    return { ...rest, nb_coequipiers: _count.etudiants, coequipiers };
  }

  const startup = await prisma.startupMembre.findFirst({
    where: { etudiant_id: etudiantId },
    select: {
      affectation: {
        select: {
          id: true,
          type: true,
          theme: { select: { id: true, titre: true, type_pfe: true } },
          encadrant: { select: { id: true, nom: true, prenom: true } },
        },
      },
    },
  });
  return startup ? startup.affectation : null;
}

export async function getMesEtudiants(enseignantId: string) {
  // Étape 1 : récupérer tous les IDs d'affectation liées à cet enseignant
  // (encadrant direct, ou via le thème : proposant / encadrant / co-encadrant)
  const [directAff, themeAff] = await Promise.all([
    prisma.affectation.findMany({
      where: { encadrant_id: enseignantId },
      select: { id: true },
    }),
    prisma.theme.findMany({
      where: {
        OR: [
          { propose_par_id: enseignantId },
          { encadrant_id: enseignantId },
          { co_encadrant_id: enseignantId },
        ],
        affectation: { isNot: null },
      },
      select: { affectation: { select: { id: true } } },
    }),
  ]);

  const affIds = new Set<string>([
    ...directAff.map((a) => a.id),
    ...themeAff.flatMap((t) => (t.affectation ? [t.affectation.id] : [])),
  ]);

  if (affIds.size === 0) return [];

  const affIdsArr = [...affIds];

  // Étape 2 : récupérer les étudiants de ces affectations
  const [classiques, startupMembres] = await Promise.all([
    prisma.affectationEtudiant.findMany({
      where: { affectation_id: { in: affIdsArr } },
      select: {
        id: true,
        binome_id: true,
        etudiant_id: true,
        etudiant: {
          select: {
            id: true, nom: true, prenom: true, email: true, matricule: true,
            specialite: { select: { id: true, nom: true } },
          },
        },
        affectation: {
          select: { id: true, theme: { select: { id: true, titre: true, type_pfe: true } } },
        },
      },
      orderBy: [{ affectation: { theme: { titre: 'asc' } } }],
    }),
    prisma.startupMembre.findMany({
      where: { affectation_id: { in: affIdsArr } },
      select: {
        id: true,
        etudiant_id: true,
        etudiant: {
          select: {
            id: true, nom: true, prenom: true, email: true, matricule: true,
            specialite: { select: { id: true, nom: true } },
          },
        },
        affectation: {
          select: { id: true, theme: { select: { id: true, titre: true, type_pfe: true } } },
        },
      },
      orderBy: [{ affectation: { theme: { titre: 'asc' } } }],
    }),
  ]);

  // Fusion avec déduplication par etudiant_id
  const seen = new Set<string>();
  return [...classiques, ...startupMembres].filter((r) => {
    if (seen.has(r.etudiant_id)) return false;
    seen.add(r.etudiant_id);
    return true;
  });
}

// ─── Enseignants disponibles ─────────────────────────────────────────────────

export async function getEnseignantsDisponibles(filters: { specialite_id?: string }) {
  const THEME_DISPO_SELECT = {
    id: true, titre: true, type_pfe: true,
    theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
  } as const;

  const enseignants = await prisma.user.findMany({
    where: {
      role: { in: ['ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'] as import('@prisma/client').Role[] },
      is_active: true,
      ...(filters.specialite_id ? { specialite_id: filters.specialite_id } : {}),
    },
    select: {
      id: true, nom: true, prenom: true, email: true,
      specialite: { select: { id: true, nom: true } },
      // Compter uniquement les thèmes VALIDE proposés (pas les NON_VALIDE)
      _count: {
        select: {
          themes_proposes: { where: { statut_validation: 'VALIDE' } },
        },
      },
      // Thèmes où l'enseignant est encadrant_id : disponibles et confirmation acceptée
      themes_encadres: {
        where: { is_affecte: false, statut_validation: 'VALIDE', encadrant_valide: true },
        select: THEME_DISPO_SELECT,
      },
      // Thèmes que l'enseignant a proposés mais où encadrant_id est null ou différent
      themes_proposes: {
        where: { is_affecte: false, statut_validation: 'VALIDE', encadrant_id: null },
        select: THEME_DISPO_SELECT,
      },
      affectations_encadrant: { select: { id: true } },
    },
    orderBy: [{ nom: 'asc' }],
  });

  return enseignants
    .map(({ _count, affectations_encadrant, themes_encadres, themes_proposes, ...e }) => {
      const nb_affectations = affectations_encadrant.length;

      // Fusionner les deux listes sans doublon (un thème peut apparaître dans les deux)
      const seenIds = new Set<string>();
      const themesDispos = [...themes_encadres, ...themes_proposes].filter((t) => {
        if (seenIds.has(t.id)) return false;
        seenIds.add(t.id);
        return true;
      });

      return {
        ...e,
        nb_affectations,
        themes_encadres: themesDispos,
        sans_proposition: _count.themes_proposes === 0,
      };
    })
    .filter((e) => e.nb_affectations < 2);
}

// ─── Étudiants sans thème ─────────────────────────────────────────────────────

export async function getEtudiantsSansTheme(filters: { specialite_id?: string }) {
  const etudiants = await prisma.user.findMany({
    where: {
      role: 'ETUDIANT',
      is_active: true,
      ...(filters.specialite_id ? { specialite_id: filters.specialite_id } : {}),
      // Pas d'affectation formelle
      affectations_etudiant: { none: {} },
      startup_membres: { none: {} },
      // Pas de thème proposé avec encadrant confirmé (thème en cours de validation ou affecté)
      themes_proposes: {
        none: {
          encadrant_id: { not: null },
          encadrant_valide: true,
        },
      },
    },
    select: {
      id: true, nom: true, prenom: true, email: true, matricule: true,
      specialite: { select: { id: true, nom: true } },
      binomes_comme_etud1: {
        where: { statut: 'ACCEPTED' },
        select: { id: true, etud2: { select: { id: true, nom: true, prenom: true } } },
        take: 1,
      },
      binomes_comme_etud2: {
        where: { statut: 'ACCEPTED' },
        select: { id: true, etud1: { select: { id: true, nom: true, prenom: true } } },
        take: 1,
      },
      themes_proposes: {
        where: { besoin_encadrant: true, statut_validation: 'VALIDE', is_affecte: false, encadrant_id: null },
        select: {
          id: true, titre: true, type_pfe: true,
          theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
        },
      },
    },
    orderBy: [{ specialite: { nom: 'asc' } }, { nom: 'asc' }],
  });

  const mapped = etudiants.map(({ binomes_comme_etud1, binomes_comme_etud2, themes_proposes, ...e }) => {
    const b1 = binomes_comme_etud1[0];
    const b2 = binomes_comme_etud2[0];
    return {
      ...e,
      themes_valides: themes_proposes,
      binome: b1
        ? { id: b1.id, partenaire: b1.etud2 }
        : b2
          ? { id: b2.id, partenaire: b2.etud1 }
          : null,
    };
  });

  // Exclude students whose active binôme partner is already formally affecté
  const partnerIds = mapped
    .map((e) => e.binome?.partenaire.id)
    .filter((id): id is string => id !== undefined);

  if (partnerIds.length === 0) return mapped;

  const affectedPartners = await prisma.user.findMany({
    where: {
      id: { in: partnerIds },
      OR: [
        { affectations_etudiant: { some: {} } },
        { startup_membres: { some: {} } },
      ],
    },
    select: { id: true },
  });

  const affectedSet = new Set(affectedPartners.map((p) => p.id));
  return mapped.filter((e) => !e.binome || !affectedSet.has(e.binome.partenaire.id));
}

// ─── Création (manuelle) ──────────────────────────────────────────────────────

export async function createAffectation(
  dto: CreateAffectationDto,
  affectePar: string,
  type: 'LIBRE' | 'AUTO' = 'LIBRE',
) {
  // Résoudre l'encadrant (obligatoire)
  const encadrant = await prisma.user.findUnique({
    where: { id: dto.encadrant_id },
    select: { id: true, nom: true, prenom: true },
  });
  if (!encadrant) throw new NotFoundError('Encadrant');

  // Résoudre le thème (optionnel — peut être défini plus tard par l'enseignant)
  let resolvedThemeId = dto.theme_id;

  // Auto-résolution : thème validé besoin_encadrant de l'étudiant, puis thème de l'enseignant
  if (!resolvedThemeId) {
    const etudiantTheme = await prisma.theme.findFirst({
      where: {
        propose_par_id: { in: dto.etudiant_ids },
        besoin_encadrant: true,
        statut_validation: 'VALIDE',
        is_affecte: false,
      },
      select: { id: true },
    });
    if (etudiantTheme) {
      resolvedThemeId = etudiantTheme.id;
    } else {
      const encadrantTheme = await prisma.theme.findFirst({
        where: {
          encadrant_id: dto.encadrant_id,
          statut_validation: 'VALIDE',
          is_affecte: false,
          besoin_encadrant: false,
        },
        select: { id: true },
      });
      if (encadrantTheme) resolvedThemeId = encadrantTheme.id;
    }
  }

  let theme: { id: string; titre: string; is_affecte: boolean; encadrant_id: string | null } | null = null;
  if (resolvedThemeId) {
    theme = await prisma.theme.findUnique({ where: { id: resolvedThemeId } });
    if (!theme) throw new NotFoundError('Thème');
    if (theme.is_affecte) throw new BadRequestError('Ce thème est déjà affecté');
  }

  // Auto-inclure le partenaire de binôme si un seul étudiant soumis
  let effectiveEtudiantIds = [...dto.etudiant_ids];
  let effectiveBinomeId = dto.binome_id;

  if (effectiveEtudiantIds.length === 1 && !effectiveBinomeId) {
    const student = await prisma.user.findUnique({
      where: { id: effectiveEtudiantIds[0] },
      select: {
        binomes_comme_etud1: {
          where: { statut: 'ACCEPTED' },
          select: { id: true, etud2_id: true },
          take: 1,
        },
        binomes_comme_etud2: {
          where: { statut: 'ACCEPTED' },
          select: { id: true, etud1_id: true },
          take: 1,
        },
      },
    });

    const b1 = student?.binomes_comme_etud1[0];
    const b2 = student?.binomes_comme_etud2[0];
    const binome = b1 ?? b2;

    if (binome) {
      const partnerId = b1 ? b1.etud2_id : b2!.etud1_id;
      const [partnerAffecte, partnerStartup] = await Promise.all([
        prisma.affectationEtudiant.findFirst({ where: { etudiant_id: partnerId } }),
        prisma.startupMembre.findFirst({ where: { etudiant_id: partnerId } }),
      ]);
      if (!partnerAffecte && !partnerStartup) {
        effectiveEtudiantIds = [effectiveEtudiantIds[0], partnerId];
        effectiveBinomeId = binome.id;
      }
    }
  }

  // Vérifier la capacité de l'encadrant (max 2 thèmes encadrés)
  const currentAffectationCount = await prisma.affectation.count({
    where: { encadrant_id: dto.encadrant_id },
  });
  if (currentAffectationCount >= 2) {
    throw new BadRequestError('Cet enseignant a atteint sa capacité maximale (2 thèmes encadrés)');
  }

  // Vérifier que les étudiants existent et ne sont pas déjà affectés
  const etudiants = await prisma.user.findMany({
    where: { id: { in: effectiveEtudiantIds }, role: 'ETUDIANT', is_active: true },
    include: { affectations_etudiant: { take: 1 }, startup_membres: { take: 1 } },
  });

  if (etudiants.length !== effectiveEtudiantIds.length) {
    throw new BadRequestError('Un ou plusieurs étudiants sont introuvables');
  }

  const dejaAffectes = etudiants.filter(
    (e) => e.affectations_etudiant.length > 0 || e.startup_membres.length > 0,
  );
  if (dejaAffectes.length > 0) {
    const noms = dejaAffectes.map((e) => `${e.prenom} ${e.nom}`).join(', ');
    throw new BadRequestError(`Déjà affecté(s) : ${noms}`);
  }

  const session = await prisma.session.findFirst({
    where: { is_active: true, type: 'AFFECTATION' },
    orderBy: { date_debut: 'desc' },
  });
  if (!session) throw new BadRequestError("Les affectations ne sont autorisées que pendant la session d'affectation");

  const affectation = await prisma.$transaction(async (tx) => {
    const a = await tx.affectation.create({
      data: {
        theme_id: resolvedThemeId ?? null,
        encadrant_id: dto.encadrant_id,
        session_id: session.id,
        affecte_par: affectePar,
        type,
        etudiants: {
          create: effectiveEtudiantIds.map((etudiant_id) => ({
            etudiant_id,
            binome_id: effectiveBinomeId ?? null,
          })),
        },
      },
      include: AFFECTATION_INCLUDE,
    });

    // Marquer le thème comme affecté si fourni
    if (theme) {
      await tx.theme.update({
        where: { id: theme.id },
        data: {
          is_affecte: true,
          ...(theme.encadrant_id ? {} : { encadrant_id: dto.encadrant_id, besoin_encadrant: false }),
        },
      });
    }

    // Supprimer les choix PENDING des étudiants maintenant affectés
    await tx.themeChoix.deleteMany({
      where: { etudiant_id: { in: effectiveEtudiantIds }, statut: 'PENDING' },
    });

    // Désactiver les propositions "cherche encadrant" (maintenant orphelines)
    await tx.theme.updateMany({
      where: {
        propose_par_id: { in: effectiveEtudiantIds },
        besoin_encadrant: true,
        is_affecte: false,
      },
      data: { is_affecte: true, besoin_encadrant: false },
    });

    // Retirer les annonces "cherche binôme"
    await tx.theme.updateMany({
      where: { propose_par_id: { in: effectiveEtudiantIds }, cherche_binome: true },
      data: { cherche_binome: false },
    });

    return a;
  });

  // Notifications
  const encadrantNom = `${encadrant.prenom} ${encadrant.nom}`;
  const meta = { affectation_id: affectation.id, ...(theme ? { theme_id: theme.id } : {}) };

  await notifyUser(
    dto.encadrant_id,
    'AFFECTATION',
    theme
      ? `Vous avez été désigné encadrant du thème "${theme.titre}"`
      : `Des étudiants vous ont été affectés — définissez leur thème dans votre espace`,
    meta,
  );

  for (const etudiantId of effectiveEtudiantIds) {
    await notifyUser(
      etudiantId,
      'AFFECTATION',
      theme
        ? `Vous avez été affecté au thème "${theme.titre}" encadré par ${encadrantNom}`
        : `Vous avez été affecté à ${encadrantNom} — le thème sera défini prochainement`,
      meta,
    );
  }

  return affectation;
}

// ─── Définir / modifier le thème d'une affectation existante ─────────────────

export async function updateAffectationTheme(
  affectationId: string,
  theme_id: string,
  encadrantId: string,
) {
  const affectation = await prisma.affectation.findUnique({
    where: { id: affectationId },
    select: { id: true, encadrant_id: true, theme_id: true, etudiants: { select: { etudiant_id: true } } },
  });
  if (!affectation) throw new NotFoundError('Affectation');
  if (affectation.encadrant_id !== encadrantId) throw new ForbiddenError('Vous ne pouvez modifier que vos propres affectations');
  if (affectation.theme_id) throw new BadRequestError('Un thème est déjà défini pour cette affectation');

  const theme = await prisma.theme.findUnique({ where: { id: theme_id } });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.statut_validation !== 'VALIDE') throw new BadRequestError('Ce thème n\'est pas encore validé');
  if (theme.is_affecte) throw new BadRequestError('Ce thème est déjà affecté');

  const updated = await prisma.$transaction(async (tx) => {
    const a = await tx.affectation.update({
      where: { id: affectationId },
      data: { theme_id },
      include: AFFECTATION_INCLUDE,
    });
    await tx.theme.update({
      where: { id: theme_id },
      data: {
        is_affecte: true,
        ...(theme.encadrant_id ? {} : { encadrant_id: encadrantId, besoin_encadrant: false }),
      },
    });
    return a;
  });

  // Notifier les étudiants
  for (const { etudiant_id } of affectation.etudiants) {
    await notifyUser(
      etudiant_id,
      'AFFECTATION',
      `Votre thème a été défini : "${theme.titre}"`,
      { affectation_id: affectationId, theme_id },
    );
  }

  return updated;
}

// ─── Algorithme de suggestion (aucune écriture en BD) ─────────────────────────

type EtudiantRow = {
  id: string; nom: string; prenom: string; email: string;
  specialite_id: string | null;
  specialite: { id: string; nom: string } | null;
  binomes_comme_etud1: { id: string; etud2_id: string; etud2: { id: string; nom: string; prenom: string } }[];
  binomes_comme_etud2: { id: string; etud1_id: string; etud1: { id: string; nom: string; prenom: string } }[];
};

type ThemeRow = Awaited<ReturnType<typeof fetchThemesDisponibles>>[0];

async function fetchThemesDisponibles() {
  return prisma.theme.findMany({
    where: { statut_validation: 'VALIDE', is_affecte: false, encadrant_id: { not: null } },
    include: {
      theme_specialites: { select: { specialite_id: true, specialite: { select: { id: true, nom: true } } } },
      encadrant: { select: { id: true, nom: true, prenom: true, email: true } },
    },
    orderBy: { created_at: 'asc' },
  });
}

export async function affectationAutomatique() {
  const session = await prisma.session.findFirst({
    where: { is_active: true, type: 'AFFECTATION' },
    orderBy: { date_debut: 'desc' },
  });
  if (!session) throw new BadRequestError("Les affectations ne sont autorisées que pendant la session d'affectation");

  const [themesRaw, etudiants] = await Promise.all([
    fetchThemesDisponibles(),
    prisma.user.findMany({
      where: {
        role: 'ETUDIANT',
        is_active: true,
        affectations_etudiant: { none: {} },
        startup_membres: { none: {} },
      },
      select: {
        id: true, nom: true, prenom: true, email: true,
        specialite_id: true,
        specialite: { select: { id: true, nom: true } },
        binomes_comme_etud1: {
          where: { statut: 'ACCEPTED' },
          select: { id: true, etud2_id: true, etud2: { select: { id: true, nom: true, prenom: true } } },
          take: 1,
        },
        binomes_comme_etud2: {
          where: { statut: 'ACCEPTED' },
          select: { id: true, etud1_id: true, etud1: { select: { id: true, nom: true, prenom: true } } },
          take: 1,
        },
      },
    }) as Promise<EtudiantRow[]>,
  ]);

  // Compter les affectations (thèmes) déjà encadrées par enseignant (max 2 thèmes)
  const encadrantIds = [...new Set(themesRaw.map((t) => t.encadrant_id!))];
  const existingAffectations = await prisma.affectation.findMany({
    where: { encadrant_id: { in: encadrantIds } },
    select: { encadrant_id: true },
  });
  const countByEncadrant = new Map<string, number>();
  for (const r of existingAffectations) {
    const encId = r.encadrant_id!;
    countByEncadrant.set(encId, (countByEncadrant.get(encId) ?? 0) + 1);
  }

  // Compteur mutable pendant l'algorithme (affectations existantes + suggestions en cours)
  const algoCount = new Map<string, number>(countByEncadrant);
  const assignedStudents = new Set<string>();
  const assignedThemes = new Set<string>();

  type Suggestion = {
    theme_id: string;
    theme_titre: string;
    theme_type_pfe: string;
    specialites: { id: string; nom: string }[];
    encadrant: { id: string; nom: string; prenom: string; email: string };
    etudiant_ids: string[];
    binome_id?: string;
    etudiants: { id: string; nom: string; prenom: string; email: string; specialite: { id: string; nom: string } | null }[];
  };

  const suggestions: Suggestion[] = [];
  const etudiantMap = new Map(etudiants.map((e) => [e.id, e]));

  function findTheme(specialiteId: string): ThemeRow | null {
    return (
      themesRaw.find(
        (t) =>
          !assignedThemes.has(t.id) &&
          t.encadrant_id !== null &&
          (algoCount.get(t.encadrant_id) ?? 0) < 2 &&
          t.theme_specialites.some((ts) => ts.specialite_id === specialiteId),
      ) ?? null
    );
  }

  function pushSuggestion(theme: ThemeRow, etudiantIds: string[], binomeId?: string) {
    const studentRows = etudiantIds.map((id) => etudiantMap.get(id)!);
    suggestions.push({
      theme_id: theme.id,
      theme_titre: theme.titre,
      theme_type_pfe: theme.type_pfe,
      specialites: theme.theme_specialites.map((ts) => ts.specialite),
      encadrant: theme.encadrant!,
      etudiant_ids: etudiantIds,
      binome_id: binomeId,
      etudiants: studentRows.map((e) => ({
        id: e.id, nom: e.nom, prenom: e.prenom, email: e.email, specialite: e.specialite,
      })),
    });
    assignedThemes.add(theme.id);
    // Incrémenter de 1 par thème suggéré (pas par nombre d'étudiants)
    algoCount.set(theme.encadrant_id!, (algoCount.get(theme.encadrant_id!) ?? 0) + 1);
    etudiantIds.forEach((id) => assignedStudents.add(id));
  }

  // Passe 1 : binômes en priorité (cherchent un thème avec 2 places libres)
  for (const etudiant of etudiants) {
    if (assignedStudents.has(etudiant.id)) continue;
    if (!etudiant.specialite_id) continue;

    const b1 = etudiant.binomes_comme_etud1[0];
    const b2 = etudiant.binomes_comme_etud2[0];
    const binome = b1 ?? b2;
    if (!binome) continue;

    const partnerId = b1 ? b1.etud2_id : b2!.etud1_id;
    if (assignedStudents.has(partnerId)) continue;
    if (!etudiantMap.has(partnerId)) continue;

    const theme = findTheme(etudiant.specialite_id);
    if (!theme) continue;

    pushSuggestion(theme, [etudiant.id, partnerId], binome.id);
  }

  // Passe 2 : étudiants seuls
  for (const etudiant of etudiants) {
    if (assignedStudents.has(etudiant.id)) continue;
    if (!etudiant.specialite_id) continue;

    const theme = findTheme(etudiant.specialite_id);
    if (!theme) continue;

    pushSuggestion(theme, [etudiant.id]);
  }

  const nonAffectes = etudiants
    .filter((e) => !assignedStudents.has(e.id))
    .map((e) => ({ id: e.id, nom: e.nom, prenom: e.prenom, email: e.email, specialite: e.specialite }));

  return {
    suggestions,
    non_affectes: nonAffectes,
    stats: {
      total_suggestions: suggestions.length,
      etudiants_affectes: assignedStudents.size,
      etudiants_non_affectes: nonAffectes.length,
      themes_utilises: assignedThemes.size,
    },
  };
}

// ─── Confirmation des suggestions auto ───────────────────────────────────────

export async function confirmerAffectationsAuto(
  dto: ConfirmerAutoDto,
  affectePar: string,
) {
  const session = await prisma.session.findFirst({
    where: { is_active: true, type: 'AFFECTATION' },
    orderBy: { date_debut: 'desc' },
  });
  if (!session) throw new BadRequestError("Les affectations ne sont autorisées que pendant la session d'affectation");

  const results: string[] = [];
  const errors: { theme_id: string; message: string }[] = [];

  for (const s of dto.suggestions) {
    try {
      const affectation = await createAffectation(s, affectePar, 'AUTO');
      results.push(affectation.id);
    } catch (err: unknown) {
      errors.push({
        theme_id: s.theme_id,
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  }

  return {
    created: results.length,
    errors,
    total: dto.suggestions.length,
  };
}

// ─── Startup : création d'équipe ─────────────────────────────────────────────

export async function createStartupAffectation(
  dto: { theme_id: string; etudiant_ids: string[]; role_equipes?: Record<string, string> },
  affectePar: string,
) {
  const theme = await prisma.theme.findUnique({ where: { id: dto.theme_id } });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.type_pfe !== 'STARTUP') throw new BadRequestError("Ce thème n'est pas de type STARTUP");
  if (theme.is_affecte) throw new BadRequestError('Ce thème est déjà affecté');
  if (dto.etudiant_ids.length === 0) throw new BadRequestError('Au moins un étudiant requis');
  if (dto.etudiant_ids.length > 6) throw new BadRequestError("Maximum 6 membres pour une équipe STARTUP");

  const etudiants = await prisma.user.findMany({
    where: { id: { in: dto.etudiant_ids }, role: 'ETUDIANT', is_active: true },
    include: { affectations_etudiant: { take: 1 }, startup_membres: { take: 1 } },
  });

  if (etudiants.length !== dto.etudiant_ids.length) {
    throw new BadRequestError('Un ou plusieurs étudiants introuvables');
  }

  const dejaAffectes = etudiants.filter(
    (e) => e.affectations_etudiant.length > 0 || e.startup_membres.length > 0,
  );
  if (dejaAffectes.length > 0) {
    const noms = dejaAffectes.map((e) => `${e.prenom} ${e.nom}`).join(', ');
    throw new BadRequestError(`Déjà affecté(s) : ${noms}`);
  }

  const session = await prisma.session.findFirst({
    where: { is_active: true, type: 'AFFECTATION' },
    orderBy: { date_debut: 'desc' },
  });
  if (!session) throw new BadRequestError("Les affectations ne sont autorisées que pendant la session d'affectation");

  const affectation = await prisma.$transaction(async (tx) => {
    const a = await tx.affectation.create({
      data: {
        theme_id: dto.theme_id,
        encadrant_id: theme.encadrant_id ?? null, // null si encadrant externe
        session_id: session.id,
        affecte_par: affectePar,
        type: 'LIBRE',
        startup_membres: {
          create: dto.etudiant_ids.map((etudiant_id) => ({
            etudiant_id,
            role_equipe: dto.role_equipes?.[etudiant_id] ?? null,
          })),
        },
      },
      include: STARTUP_INCLUDE,
    });

    await tx.theme.update({ where: { id: dto.theme_id }, data: { is_affecte: true } });

    // Nettoyer les données des membres de l'équipe maintenant affectés
    await tx.themeChoix.deleteMany({
      where: { etudiant_id: { in: dto.etudiant_ids }, statut: 'PENDING' },
    });
    await tx.theme.updateMany({
      where: {
        propose_par_id: { in: dto.etudiant_ids },
        besoin_encadrant: true,
        is_affecte: false,
      },
      data: { is_affecte: true, besoin_encadrant: false },
    });
    await tx.theme.updateMany({
      where: { propose_par_id: { in: dto.etudiant_ids }, cherche_binome: true },
      data: { cherche_binome: false },
    });

    return a;
  });

  // Notifications
  if (theme.encadrant_id) {
    await notifyUser(
      theme.encadrant_id,
      'AFFECTATION',
      `Vous encadrez la startup "${theme.titre}"`,
      { theme_id: theme.id, affectation_id: affectation.id },
    );
  }

  for (const etudiantId of dto.etudiant_ids) {
    await notifyUser(
      etudiantId,
      'AFFECTATION',
      `Vous êtes membre de l'équipe startup "${theme.titre}"`,
      { theme_id: theme.id, affectation_id: affectation.id },
    );
  }

  return affectation;
}

// ─── Startup : consultation équipe ────────────────────────────────────────────

export async function getStartupEquipe(affectationId: string) {
  const affectation = await prisma.affectation.findUnique({
    where: { id: affectationId },
    include: STARTUP_INCLUDE,
  });
  if (!affectation) throw new NotFoundError('Affectation');
  return affectation;
}

// ─── Startup : ajout d'un membre interne ─────────────────────────────────────

async function assertEncadrantOrAdmin(affectationEncadrantId: string | null, appelantId: string) {
  if (affectationEncadrantId === appelantId) return;
  const appelant = await prisma.user.findUnique({ where: { id: appelantId }, select: { role: true } });
  if (!appelant || !['CHEF_DEPT', 'CHEF_EQUIPE'].includes(appelant.role)) {
    throw new ForbiddenError("Seul l'encadrant ou un administrateur peut effectuer cette action");
  }
}

export async function addStartupMembre(
  affectationId: string,
  etudiantId: string,
  appelantId: string,
  roleEquipe?: string,
) {
  const affectation = await prisma.affectation.findUnique({
    where: { id: affectationId },
    include: {
      theme: { select: { id: true, titre: true, type_pfe: true } },
      startup_membres: true,
      membres_externes: true,
      etudiants: { select: { etudiant_id: true } },
    },
  });
  if (!affectation) throw new NotFoundError('Affectation');
  if (!affectation.theme || affectation.theme.type_pfe !== 'STARTUP') {
    throw new BadRequestError("Cette affectation n'est pas de type STARTUP");
  }
  await assertEncadrantOrAdmin(affectation.encadrant_id, appelantId);

  const totalMembers = affectation.startup_membres.length + affectation.membres_externes.length + affectation.etudiants.length;
  if (totalMembers >= 6) throw new BadRequestError("L'équipe STARTUP a atteint le maximum de 6 membres");
  if (affectation.startup_membres.some((m) => m.etudiant_id === etudiantId)) {
    throw new BadRequestError("Cet étudiant est déjà membre de l'équipe");
  }

  const etudiant = await prisma.user.findUnique({
    where: { id: etudiantId },
    include: { affectations_etudiant: { take: 1 }, startup_membres: { take: 1 } },
  });
  if (!etudiant || etudiant.role !== 'ETUDIANT' || !etudiant.is_active) throw new NotFoundError('Étudiant');
  if (etudiant.affectations_etudiant.length > 0 || etudiant.startup_membres.length > 0) {
    throw new BadRequestError('Cet étudiant est déjà affecté à un autre thème');
  }

  // Vérifier pas déjà une invitation en attente
  const existingInvitation = await prisma.propositionMembre.findFirst({
    where: { affectation_id: affectationId, candidat_interne_id: etudiantId, statut: 'PENDING' },
  });
  if (existingInvitation) throw new BadRequestError("Une invitation est déjà en attente pour cet étudiant");

  const proposition = await prisma.propositionMembre.create({
    data: {
      affectation_id: affectationId,
      proposeur_id: appelantId,
      candidat_interne_id: etudiantId,
      etudiant_accepte: false,
    },
    include: {
      candidat_interne: { select: { id: true, nom: true, prenom: true, email: true, specialite: { select: { id: true, nom: true } } } },
      proposeur: { select: { id: true, nom: true, prenom: true } },
    },
  });

  const themeTitre = affectation.theme.titre;
  const appelant = await prisma.user.findUnique({ where: { id: appelantId }, select: { nom: true, prenom: true } });
  const who = appelant ? `${appelant.prenom} ${appelant.nom}` : "L'encadrant";

  await notifyUser(etudiantId, 'STARTUP_INVITATION',
    `${who} vous invite à rejoindre l'équipe STARTUP "${themeTitre}"`,
    { affectation_id: affectationId, proposition_id: proposition.id });

  return { type: 'INVITATION' as const, proposition };
}

// ─── Startup : ajout d'un membre externe ─────────────────────────────────────

export async function addMembreExterne(
  affectationId: string,
  dto: { nom: string; prenom: string; email: string; specialite?: string; universite?: string; commentaire?: string },
  appelantId: string,
) {
  const affectation = await prisma.affectation.findUnique({
    where: { id: affectationId },
    include: {
      theme: { select: { id: true, titre: true, type_pfe: true } },
      startup_membres: true,
      membres_externes: true,
      etudiants: { select: { etudiant_id: true } },
    },
  });
  if (!affectation) throw new NotFoundError('Affectation');
  if (!affectation.theme || affectation.theme.type_pfe !== 'STARTUP') {
    throw new BadRequestError("Cette affectation n'est pas de type STARTUP");
  }
  await assertEncadrantOrAdmin(affectation.encadrant_id, appelantId);

  const totalMembers = affectation.startup_membres.length + affectation.membres_externes.length + affectation.etudiants.length;
  if (totalMembers >= 6) throw new BadRequestError("L'équipe STARTUP a atteint le maximum de 6 membres");

  const membre = await prisma.membreExterne.create({ data: { affectation_id: affectationId, ...dto } });

  const meta = { theme_id: affectation.theme.id, affectation_id: affectationId };
  for (const m of affectation.startup_membres) {
    await notifyUser(m.etudiant_id, 'STARTUP_MEMBRE_AJOUTE',
      `${dto.prenom} ${dto.nom} (externe) a rejoint l'équipe startup "${affectation.theme.titre}"`, meta);
  }

  return membre;
}

// ─── Startup : ajout membre via thème (find-or-create affectation) ───────────

export async function addStartupMembreFromTheme(
  themeId: string,
  etudiantId: string,
  appelantId: string,
) {
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    include: { affectation: { select: { id: true, encadrant_id: true } } },
  });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.type_pfe !== 'STARTUP') throw new BadRequestError("Ce thème n'est pas de type STARTUP");
  if (theme.statut_validation !== 'VALIDE') throw new BadRequestError("Le thème doit être validé avant d'ajouter des membres");

  const isProposeur = theme.propose_par_id === appelantId;
  const isEncadrant = theme.encadrant_id === appelantId;
  if (!isProposeur && !isEncadrant) {
    const appelant = await prisma.user.findUnique({ where: { id: appelantId }, select: { role: true } });
    if (!appelant || !['CHEF_DEPT', 'CHEF_EQUIPE'].includes(appelant.role)) {
      throw new ForbiddenError("Seul l'encadrant ou le proposeur du thème peut ajouter des membres");
    }
  }

  let affectationId: string;
  if (theme.affectation) {
    affectationId = theme.affectation.id;
  } else {
    const session = await prisma.session.findFirst({ where: { is_active: true } });
    if (!session) throw new BadRequestError('Aucune session active');
    const newAff = await prisma.affectation.create({
      data: {
        theme_id: themeId,
        encadrant_id: appelantId,
        session_id: session.id,
        affecte_par: appelantId,
        type: 'LIBRE',
      },
    });
    affectationId = newAff.id;
  }

  return addStartupMembre(affectationId, etudiantId, appelantId);
}

// ─── Startup : équipes encadrées par un enseignant ───────────────────────────

export async function getMesStartups(enseignantId: string) {
  return prisma.affectation.findMany({
    where: {
      OR: [
        { encadrant_id: enseignantId },
        { theme: { propose_par_id: enseignantId } },
        { theme: { encadrant_id: enseignantId } },
      ],
      theme: { type_pfe: 'STARTUP' },
    },
    include: STARTUP_INCLUDE,
    orderBy: { created_at: 'desc' },
  });
}

// ─── Startup : propositions de membres ───────────────────────────────────────

export async function getPropositions(affectationId: string, userId: string) {
  const affectation = await prisma.affectation.findUnique({
    where: { id: affectationId },
    include: {
      startup_membres: { select: { etudiant_id: true } },
      etudiants: { select: { etudiant_id: true } },
    },
  });
  if (!affectation) throw new NotFoundError('Affectation');

  const isEncadrant = affectation.encadrant_id === userId;
  const isMember = affectation.startup_membres.some((m) => m.etudiant_id === userId)
    || affectation.etudiants.some((e) => e.etudiant_id === userId);
  if (!isEncadrant && !isMember) throw new ForbiddenError('Accès refusé');

  return prisma.propositionMembre.findMany({
    where: isEncadrant
      ? {
          affectation_id: affectationId,
          statut: 'PENDING',
          OR: [
            { etudiant_accepte: true },                              // propositions membres à valider
            { proposeur_id: userId, etudiant_accepte: false },       // invitations envoyées en attente
          ],
        }
      : { affectation_id: affectationId, proposeur_id: userId },
    include: {
      proposeur: { select: { id: true, nom: true, prenom: true } },
      candidat_interne: {
        select: { id: true, nom: true, prenom: true, email: true, specialite: { select: { id: true, nom: true } } },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function proposerMembre(
  affectationId: string,
  dto: {
    candidat_interne_id?: string;
    candidat_externe?: { nom: string; prenom: string; email: string; specialite?: string; universite?: string; commentaire?: string };
  },
  proposeurId: string,
) {
  if (!dto.candidat_interne_id && !dto.candidat_externe) {
    throw new BadRequestError('Candidat interne ou externe requis');
  }

  const affectation = await prisma.affectation.findUnique({
    where: { id: affectationId },
    include: {
      theme: { select: { id: true, titre: true } },
      startup_membres: true,
      membres_externes: true,
      etudiants: { select: { etudiant_id: true } },
    },
  });
  if (!affectation) throw new NotFoundError('Affectation');

  const isMemberStartup = affectation.startup_membres.some((m) => m.etudiant_id === proposeurId);
  const isMemberAff = affectation.etudiants.some((e) => e.etudiant_id === proposeurId);
  if (!isMemberStartup && !isMemberAff) throw new ForbiddenError("Vous n'êtes pas membre de cette équipe");

  const totalMembers = affectation.startup_membres.length + affectation.membres_externes.length + affectation.etudiants.length;
  if (totalMembers >= 6) throw new BadRequestError("L'équipe STARTUP a atteint le maximum de 6 membres");

  if (dto.candidat_interne_id) {
    if (affectation.startup_membres.some((m) => m.etudiant_id === dto.candidat_interne_id)) {
      throw new BadRequestError("Cet étudiant est déjà membre de l'équipe");
    }
    const existing = await prisma.propositionMembre.findFirst({
      where: { affectation_id: affectationId, candidat_interne_id: dto.candidat_interne_id, statut: 'PENDING' },
    });
    if (existing) throw new BadRequestError('Une proposition est déjà en attente pour cet étudiant');
  }

  const proposition = await prisma.propositionMembre.create({
    data: {
      affectation_id: affectationId,
      proposeur_id: proposeurId,
      candidat_interne_id: dto.candidat_interne_id ?? null,
      candidat_externe: dto.candidat_externe
        ? (dto.candidat_externe as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      // L'étudiant interne doit d'abord accepter — l'encadrant sera notifié après
      etudiant_accepte: !dto.candidat_interne_id, // externes → pas d'étape étudiant
    },
    include: {
      proposeur: { select: { id: true, nom: true, prenom: true } },
      candidat_interne: { select: { id: true, nom: true, prenom: true, email: true, specialite: { select: { id: true, nom: true } } } },
    },
  });

  const themeTitre = affectation.theme?.titre ?? '';

  if (dto.candidat_interne_id) {
    // Notifier l'ÉTUDIANT proposé (pas l'enseignant) — il doit d'abord accepter
    const proposeur = await prisma.user.findUnique({ where: { id: proposeurId }, select: { nom: true, prenom: true } });
    const who = proposeur ? `${proposeur.prenom} ${proposeur.nom}` : 'Un membre';
    await notifyUser(dto.candidat_interne_id, 'STARTUP_INVITATION',
      `${who} vous invite à rejoindre l'équipe STARTUP "${themeTitre}"`,
      { affectation_id: affectationId, proposition_id: proposition.id });
  } else if (dto.candidat_externe && affectation.encadrant_id) {
    // Candidat externe : pas d'étape étudiant, notifier directement l'encadrant
    const proposeur = await prisma.user.findUnique({ where: { id: proposeurId }, select: { nom: true, prenom: true } });
    const who = proposeur ? `${proposeur.prenom} ${proposeur.nom}` : 'Un membre';
    const ext = dto.candidat_externe;
    await notifyUser(affectation.encadrant_id, 'STARTUP_PROPOSITION',
      `${who} propose d'ajouter ${ext.prenom} ${ext.nom} (externe) à l'équipe "${themeTitre}"`,
      { affectation_id: affectationId, proposition_id: proposition.id });
  }

  return proposition;
}

export async function getMesInvitationsStartup(etudiantId: string) {
  return prisma.propositionMembre.findMany({
    where: {
      candidat_interne_id: etudiantId,
      statut: 'PENDING',
      etudiant_accepte: false,
    },
    include: {
      affectation: {
        select: {
          id: true,
          theme: { select: { id: true, titre: true, type_pfe: true } },
          encadrant: { select: { id: true, nom: true, prenom: true } },
        },
      },
      proposeur: { select: { id: true, nom: true, prenom: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function etudiantAccepteProposition(propId: string, etudiantId: string) {
  const prop = await prisma.propositionMembre.findUnique({
    where: { id: propId },
    include: {
      affectation: {
        include: {
          theme: { select: { id: true, titre: true } },
          startup_membres: true,
          membres_externes: true,
          etudiants: { select: { etudiant_id: true } },
        },
      },
      proposeur: { select: { id: true, nom: true, prenom: true } },
    },
  });
  if (!prop) throw new NotFoundError('Invitation');
  if (prop.candidat_interne_id !== etudiantId) throw new ForbiddenError('Cette invitation ne vous est pas adressée');
  if (prop.statut !== 'PENDING') throw new BadRequestError('Cette invitation a déjà été traitée');
  if (prop.etudiant_accepte) throw new BadRequestError('Vous avez déjà accepté cette invitation');

  const totalMembers = prop.affectation.startup_membres.length + prop.affectation.membres_externes.length + prop.affectation.etudiants.length;
  if (totalMembers >= 6) throw new BadRequestError("L'équipe STARTUP a atteint le maximum de 6 membres");

  const themeTitre = prop.affectation.theme?.titre ?? '';
  const affectationId = prop.affectation_id;
  const meta = { affectation_id: affectationId, proposition_id: propId };

  if (!prop.affectation.encadrant_id) {
    // Encadrant externe → l'étudiant s'auto-accepte, devient membre directement
    const etudiant = await prisma.user.findUnique({
      where: { id: etudiantId },
      include: { affectations_etudiant: { take: 1 }, startup_membres: { take: 1 } },
    });
    if (!etudiant || etudiant.affectations_etudiant.length > 0 || etudiant.startup_membres.length > 0) {
      throw new BadRequestError('Vous êtes déjà affecté à un autre thème');
    }
    await prisma.$transaction(async (tx) => {
      await tx.propositionMembre.update({ where: { id: propId }, data: { statut: 'ACCEPTED', etudiant_accepte: true } });
      await tx.startupMembre.create({ data: { affectation_id: affectationId, etudiant_id: etudiantId } });
    });
    await notifyUser(prop.proposeur_id, 'STARTUP_PROPOSITION_ACCEPTEE',
      `Vous avez rejoint l'équipe STARTUP "${themeTitre}"`, meta);
    for (const m of prop.affectation.startup_membres) {
      if (m.etudiant_id !== prop.proposeur_id && m.etudiant_id !== etudiantId) {
        await notifyUser(m.etudiant_id, 'STARTUP_MEMBRE_AJOUTE',
          `Un nouveau membre a rejoint l'équipe "${themeTitre}"`, meta);
      }
    }
    return { message: 'Vous avez rejoint l\'équipe STARTUP', statut: 'AFFECTE' };
  } else {
    const etudiantInfo = await prisma.user.findUnique({
      where: { id: etudiantId },
      include: { affectations_etudiant: { take: 1 }, startup_membres: { take: 1 } },
    });
    if (!etudiantInfo || etudiantInfo.affectations_etudiant.length > 0 || etudiantInfo.startup_membres.length > 0) {
      throw new BadRequestError('Vous êtes déjà affecté à un autre thème');
    }

    // Si c'est l'encadrant qui a envoyé l'invitation → auto-approuver
    if (prop.proposeur_id === prop.affectation.encadrant_id) {
      await prisma.$transaction(async (tx) => {
        await tx.propositionMembre.update({ where: { id: propId }, data: { statut: 'ACCEPTED', etudiant_accepte: true } });
        await tx.startupMembre.create({ data: { affectation_id: affectationId, etudiant_id: etudiantId } });
      });
      await notifyUser(prop.affectation.encadrant_id!, 'STARTUP_PROPOSITION_ACCEPTEE',
        `${etudiantInfo.prenom} ${etudiantInfo.nom} a accepté votre invitation et a rejoint l'équipe "${themeTitre}"`, meta);
      for (const m of prop.affectation.startup_membres) {
        if (m.etudiant_id !== etudiantId) {
          await notifyUser(m.etudiant_id, 'STARTUP_MEMBRE_AJOUTE',
            `${etudiantInfo.prenom} ${etudiantInfo.nom} a rejoint l'équipe STARTUP "${themeTitre}"`, meta);
        }
      }
      return { message: 'Vous avez rejoint l\'équipe STARTUP', statut: 'AFFECTE' };
    }

    // Sinon (membre a proposé un autre étudiant) → marquer accepté, notifier l'encadrant
    await prisma.propositionMembre.update({ where: { id: propId }, data: { etudiant_accepte: true } });
    const nom = `${etudiantInfo.prenom} ${etudiantInfo.nom}`;
    await notifyUser(prop.affectation.encadrant_id!, 'STARTUP_PROPOSITION',
      `${nom} a accepté l'invitation et attend votre validation pour rejoindre l'équipe "${themeTitre}"`, meta);
    return { message: 'Invitation acceptée — en attente de validation par l\'encadrant', statut: 'EN_ATTENTE_ENCADRANT' };
  }
}

export async function etudiantRefuseProposition(propId: string, etudiantId: string) {
  const prop = await prisma.propositionMembre.findUnique({
    where: { id: propId },
    include: { affectation: { select: { theme: { select: { titre: true } } } } },
  });
  if (!prop) throw new NotFoundError('Invitation');
  if (prop.candidat_interne_id !== etudiantId) throw new ForbiddenError('Cette invitation ne vous est pas adressée');
  if (prop.statut !== 'PENDING') throw new BadRequestError('Cette invitation a déjà été traitée');

  await prisma.propositionMembre.update({ where: { id: propId }, data: { statut: 'REFUSED' } });

  await notifyUser(prop.proposeur_id, 'STARTUP_PROPOSITION_REFUSEE',
    `L'étudiant a décliné l'invitation pour l'équipe "${prop.affectation.theme?.titre ?? ''}"`,
    { affectation_id: prop.affectation_id, proposition_id: propId });

  return { message: 'Invitation refusée' };
}

export async function accepterProposition(propId: string, encadrantId: string) {
  const prop = await prisma.propositionMembre.findUnique({
    where: { id: propId },
    include: {
      affectation: {
        include: {
          theme: { select: { id: true, titre: true } },
          startup_membres: true,
          membres_externes: true,
          etudiants: { select: { etudiant_id: true } },
        },
      },
      candidat_interne: { select: { id: true, nom: true, prenom: true } },
    },
  });
  if (!prop) throw new NotFoundError('Proposition');
  if (prop.affectation.encadrant_id !== encadrantId) throw new ForbiddenError('Accès refusé');
  if (prop.statut !== 'PENDING') throw new BadRequestError('Cette proposition a déjà été traitée');
  if (prop.candidat_interne_id && !prop.etudiant_accepte) {
    throw new BadRequestError("L'étudiant n'a pas encore accepté l'invitation");
  }

  const totalMembers = prop.affectation.startup_membres.length + prop.affectation.membres_externes.length + prop.affectation.etudiants.length;
  if (totalMembers >= 6) throw new BadRequestError("L'équipe a atteint la capacité maximale de 6 membres");

  const affectationId = prop.affectation_id;
  const themeTitre = prop.affectation.theme?.titre ?? '';
  const meta = { affectation_id: affectationId, proposition_id: propId };

  await prisma.$transaction(async (tx) => {
    await tx.propositionMembre.update({ where: { id: propId }, data: { statut: 'ACCEPTED' } });

    if (prop.candidat_interne_id) {
      const candidat = await tx.user.findUnique({
        where: { id: prop.candidat_interne_id },
        include: { affectations_etudiant: { take: 1 }, startup_membres: { take: 1 } },
      });
      if (!candidat || candidat.affectations_etudiant.length > 0 || candidat.startup_membres.length > 0) {
        throw new BadRequestError('Cet étudiant est déjà affecté à un autre thème');
      }
      await tx.startupMembre.create({ data: { affectation_id: affectationId, etudiant_id: prop.candidat_interne_id } });
    } else if (prop.candidat_externe) {
      const ext = prop.candidat_externe as { nom: string; prenom: string; email: string; specialite?: string; universite?: string; commentaire?: string };
      await tx.membreExterne.create({ data: { affectation_id: affectationId, ...ext } });
    }
  });

  const ext = prop.candidat_externe as { prenom?: string; nom?: string } | null;
  const candidatNom = prop.candidat_interne
    ? `${prop.candidat_interne.prenom} ${prop.candidat_interne.nom}`
    : `${ext?.prenom ?? ''} ${ext?.nom ?? ''} (externe)`;

  if (prop.candidat_interne_id) {
    await notifyUser(prop.candidat_interne_id, 'STARTUP_PROPOSITION_ACCEPTEE',
      `Vous avez été ajouté à l'équipe startup "${themeTitre}"`, meta);
  }
  await notifyUser(prop.proposeur_id, 'STARTUP_PROPOSITION_ACCEPTEE',
    `Votre proposition pour ${candidatNom.trim()} a été acceptée`, meta);

  for (const m of prop.affectation.startup_membres) {
    if (m.etudiant_id !== prop.proposeur_id && m.etudiant_id !== prop.candidat_interne_id) {
      await notifyUser(m.etudiant_id, 'STARTUP_MEMBRE_AJOUTE',
        `${candidatNom.trim()} a rejoint l'équipe startup "${themeTitre}"`, meta);
    }
  }

  return { message: 'Proposition acceptée' };
}

export async function refuserProposition(propId: string, encadrantId: string) {
  const prop = await prisma.propositionMembre.findUnique({
    where: { id: propId },
    include: {
      affectation: { select: { encadrant_id: true, theme: { select: { titre: true } } } },
      candidat_interne: { select: { nom: true, prenom: true } },
    },
  });
  if (!prop) throw new NotFoundError('Proposition');
  if (prop.affectation.encadrant_id !== encadrantId) throw new ForbiddenError('Accès refusé');
  if (prop.statut !== 'PENDING') throw new BadRequestError('Cette proposition a déjà été traitée');
  if (prop.candidat_interne_id && !prop.etudiant_accepte) {
    throw new BadRequestError("L'étudiant n'a pas encore accepté l'invitation");
  }

  await prisma.propositionMembre.update({ where: { id: propId }, data: { statut: 'REFUSED' } });

  const ext = prop.candidat_externe as { prenom?: string; nom?: string } | null;
  const candidatNom = prop.candidat_interne
    ? `${prop.candidat_interne.prenom} ${prop.candidat_interne.nom}`
    : `${ext?.prenom ?? ''} ${ext?.nom ?? ''}`.trim();

  await notifyUser(prop.proposeur_id, 'STARTUP_PROPOSITION_REFUSEE',
    `Votre proposition pour ${candidatNom} a été refusée`,
    { affectation_id: prop.affectation_id, proposition_id: propId });

  return { message: 'Proposition refusée' };
}

// ─── Startup : suppression d'un membre ───────────────────────────────────────

export async function removeStartupMembre(affectationId: string, etudiantId: string) {
  const affectation = await prisma.affectation.findUnique({
    where: { id: affectationId },
    include: { theme: { select: { type_pfe: true } }, startup_membres: true },
  });
  if (!affectation) throw new NotFoundError('Affectation');
  if (!affectation.theme || affectation.theme.type_pfe !== 'STARTUP') {
    throw new BadRequestError("Cette affectation n'est pas de type STARTUP");
  }

  const membre = affectation.startup_membres.find((m) => m.etudiant_id === etudiantId);
  if (!membre) throw new NotFoundError('Membre');

  if (affectation.startup_membres.length <= 1) {
    throw new BadRequestError("Impossible de supprimer le dernier membre de l'équipe");
  }

  await prisma.startupMembre.delete({ where: { id: membre.id } });
}

// ─── Historique d'encadrement ─────────────────────────────────────────────────

const ETUDIANT_FULL_SELECT = {
  id: true, nom: true, prenom: true, email: true, matricule: true,
  specialite: { select: { id: true, nom: true } },
} as const;

export async function getHistoriqueEncadrement(
  enseignantId: string,
  anneeUniversitaire?: string,
) {
  const themes = await prisma.theme.findMany({
    where: {
      OR: [
        { propose_par_id: enseignantId },
        { encadrant_id: enseignantId },
        { co_encadrant_id: enseignantId },
      ],
      is_affecte: true,
      ...(anneeUniversitaire ? { session: { annee_universitaire: anneeUniversitaire } } : {}),
    },
    include: {
      session: { select: { id: true, type: true, annee_universitaire: true } },
      theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
      affectation: {
        include: {
          etudiants: { include: { etudiant: { select: ETUDIANT_FULL_SELECT } } },
          startup_membres: { include: { etudiant: { select: ETUDIANT_FULL_SELECT } } },
        },
      },
    },
    orderBy: [{ session: { annee_universitaire: 'desc' } }, { titre: 'asc' }],
  });

  return themes.map((t) => {
    let monRole: 'PROPOSANT' | 'ENCADRANT' | 'CO_ENCADRANT' = 'PROPOSANT';
    if (t.encadrant_id === enseignantId) monRole = 'ENCADRANT';
    else if (t.co_encadrant_id === enseignantId) monRole = 'CO_ENCADRANT';

    const seen = new Set<string>();
    const etudiants = [
      ...(t.affectation?.etudiants.map((e) => ({ ...e.etudiant, type_affectation: 'CLASSIQUE' as const })) ?? []),
      ...(t.affectation?.startup_membres.map((e) => ({ ...e.etudiant, type_affectation: 'STARTUP' as const })) ?? []),
    ].filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    return {
      id: t.id,
      titre: t.titre,
      type_pfe: t.type_pfe,
      sous_types: t.sous_types,
      statut_validation: t.statut_validation,
      is_soutenu: t.is_soutenu,
      session: t.session,
      theme_specialites: t.theme_specialites,
      mon_role: monRole,
      etudiants,
    };
  });
}

// ─── Export Excel — historique encadrement ────────────────────────────────────

export async function exportHistoriqueExcel(
  enseignantId: string,
  anneeUniversitaire: string | undefined,
  res: Response,
): Promise<void> {
  const historique = await getHistoriqueEncadrement(enseignantId, anneeUniversitaire);

  const rows: Record<string, string>[] = [];
  for (const theme of historique) {
    const specialites = theme.theme_specialites.map((ts) => ts.specialite.nom).join(', ');
    const annee = theme.session.annee_universitaire;
    if (theme.etudiants.length === 0) {
      rows.push({
        'Année universitaire': annee,
        'Titre du thème': theme.titre,
        'Type PFE': theme.type_pfe,
        'Spécialités': specialites,
        'Mon rôle': theme.mon_role,
        'Soutenu': theme.is_soutenu ? 'Oui' : 'Non',
        'Nom étudiant': '',
        'Prénom étudiant': '',
        'Email': '',
        'Matricule': '',
        'Spécialité étudiant': '',
      });
    } else {
      for (const etudiant of theme.etudiants) {
        rows.push({
          'Année universitaire': annee,
          'Titre du thème': theme.titre,
          'Type PFE': theme.type_pfe,
          'Spécialités': specialites,
          'Mon rôle': theme.mon_role,
          'Soutenu': theme.is_soutenu ? 'Oui' : 'Non',
          'Nom étudiant': etudiant.nom,
          'Prénom étudiant': etudiant.prenom,
          'Email': etudiant.email,
          'Matricule': etudiant.matricule ?? '',
          'Spécialité étudiant': etudiant.specialite?.nom ?? '',
        });
      }
    }
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 }, { wch: 50 }, { wch: 10 }, { wch: 25 },
    { wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 16 },
    { wch: 35 }, { wch: 14 }, { wch: 20 },
  ];
  xlsx.utils.book_append_sheet(wb, ws, 'Historique encadrement');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="historique_encadrement_${Date.now()}.xlsx"`);
  res.end(buf);
}

// ─── Export PDF — historique encadrement ─────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  PROPOSANT: 'Proposant',
  ENCADRANT: 'Encadrant',
  CO_ENCADRANT: 'Co-encadrant',
};

export async function exportHistoriquePDF(
  enseignantId: string,
  anneeUniversitaire: string | undefined,
  res: Response,
): Promise<void> {
  const historique = await getHistoriqueEncadrement(enseignantId, anneeUniversitaire);

  const doc = new PDFDocument({ margin: 35, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="historique_encadrement_${Date.now()}.pdf"`);
  doc.pipe(res);

  // ── En-tête ──
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e293b')
    .text("Historique d'encadrement", { align: 'center' });
  doc.fontSize(9).font('Helvetica').fillColor('#475569')
    .text('Université de Béjaïa — Département Informatique', { align: 'center' });
  if (anneeUniversitaire) {
    doc.fontSize(8).text(`Année universitaire : ${anneeUniversitaire}`, { align: 'center' });
  }
  doc.fontSize(7.5).fillColor('#64748b')
    .text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — ${historique.length} thème(s)`, { align: 'center' });
  doc.moveDown(1);

  if (historique.length === 0) {
    doc.fontSize(11).fillColor('#94a3b8').text("Aucun thème encadré pour ces critères.", { align: 'center' });
    doc.end();
    return;
  }

  // ── Colonnes : Titre | Spécialités | Rôle | Type | Soutenu | Étudiants ──
  const startX = 35;
  const colWidths = [165, 80, 60, 55, 45, 160];
  const headers = ['Titre du thème', 'Spécialités', 'Mon rôle', 'Type', 'Soutenu', 'Étudiants'];
  const ROW_BASE_H = 22;
  const HEADER_H = 16;
  const PAGE_BOTTOM = 800;

  const drawTableHeader = (y: number): number => {
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('white');
    let x = startX;
    headers.forEach((h, i) => {
      doc.rect(x, y, colWidths[i], HEADER_H).fillAndStroke('#1e40af', '#1e3a8a');
      doc.fillColor('white').text(h, x + 3, y + 4, { width: colWidths[i] - 6, lineBreak: false });
      x += colWidths[i];
    });
    return y + HEADER_H;
  };

  // Grouper par année
  const byAnnee = new Map<string, typeof historique>();
  for (const t of historique) {
    const a = t.session.annee_universitaire;
    if (!byAnnee.has(a)) byAnnee.set(a, []);
    byAnnee.get(a)!.push(t);
  }

  let firstGroup = true;
  for (const [annee, themes] of byAnnee) {
    let y = doc.y;
    if (!firstGroup) {
      y += 12;
      doc.y = y;
    }
    firstGroup = false;

    if (y > PAGE_BOTTOM - 60) {
      doc.addPage();
      y = 35;
    }

    // Titre de groupe
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a')
      .text(annee, startX, y);
    y += 13;
    y = drawTableHeader(y);

    for (let idx = 0; idx < themes.length; idx++) {
      const t = themes[idx];
      const etudiantLines = t.etudiants.length > 0
        ? t.etudiants.map((e) => `${e.prenom} ${e.nom}${e.specialite ? ` (${e.specialite.nom})` : ''}`).join('\n')
        : '—';

      const nbLines = Math.max(1, t.etudiants.length);
      const rowH = Math.max(ROW_BASE_H, nbLines * 11 + 8);

      if (y + rowH > PAGE_BOTTOM) {
        doc.addPage();
        y = 35;
        y = drawTableHeader(y);
      }

      const bg = idx % 2 === 0 ? '#f1f5f9' : '#ffffff';
      const specialites = t.theme_specialites.map((ts) => ts.specialite.nom).join(', ') || '—';

      const cells = [
        t.titre,
        specialites,
        ROLE_LABELS[t.mon_role] ?? t.mon_role,
        t.type_pfe,
        t.is_soutenu ? 'Oui' : 'Non',
        etudiantLines,
      ];

      let x = startX;
      cells.forEach((val, i) => {
        doc.rect(x, y, colWidths[i], rowH).fillAndStroke(bg, '#cbd5e1');
        doc.font('Helvetica').fontSize(7).fillColor('#1e293b')
          .text(val, x + 3, y + 4, { width: colWidths[i] - 6, height: rowH - 6, lineBreak: true, ellipsis: true });
        x += colWidths[i];
      });

      y += rowH;
    }

    doc.y = y;
  }

  doc.end();
}
