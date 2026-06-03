import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';
import { notifyUser } from './notification.service';
import type { CreateAffectationDto, ConfirmerAutoDto } from '../types';

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
        },
      },
    },
  });
  if (affEtudiant) return affEtudiant.affectation;

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
  const rows = await prisma.affectationEtudiant.findMany({
    where: {
      affectation: {
        OR: [
          { encadrant_id: enseignantId },
          { theme: { propose_par_id: enseignantId } },
          { theme: { encadrant_id: enseignantId } },
          { theme: { co_encadrant_id: enseignantId } },
        ],
      },
    },
    include: {
      etudiant: {
        select: {
          id: true, nom: true, prenom: true, email: true, matricule: true,
          specialite: { select: { id: true, nom: true } },
        },
      },
      affectation: {
        select: { theme: { select: { id: true, titre: true, type_pfe: true } } },
      },
    },
    orderBy: [{ affectation: { theme: { titre: 'asc' } } }],
  });
  console.log(`[getMesEtudiants] enseignantId=${enseignantId} → ${rows.length} entrée(s): ${rows.map((r) => r.etudiant_id).join(', ')}`);
  return rows;
}

// ─── Enseignants disponibles ─────────────────────────────────────────────────

export async function getEnseignantsDisponibles(filters: { specialite_id?: string }) {
  const enseignants = await prisma.user.findMany({
    where: {
      role: { in: ['ENSEIGNANT', 'CHEF_EQUIPE'] },
      is_active: true,
      ...(filters.specialite_id ? { specialite_id: filters.specialite_id } : {}),
    },
    select: {
      id: true, nom: true, prenom: true, email: true,
      specialite: { select: { id: true, nom: true } },
      _count: { select: { themes_proposes: true } },
      themes_encadres: {
        where: { is_affecte: false, statut_validation: 'VALIDE' },
        select: {
          id: true, titre: true, type_pfe: true,
          theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
        },
      },
      // Compter les étudiants supervisés (1 binôme = 2 étudiants = 2 places)
      affectations_encadrant: {
        select: { etudiants: { select: { id: true } } },
      },
    },
    orderBy: [{ nom: 'asc' }],
  });

  return enseignants
    .map(({ _count, affectations_encadrant, ...e }) => {
      const nb_etudiants = affectations_encadrant.reduce((sum, a) => sum + a.etudiants.length, 0);
      return {
        ...e,
        nb_etudiants,
        sans_proposition: _count.themes_proposes === 0,
      };
    })
    .filter((e) => e.nb_etudiants < 4);
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
    },
    orderBy: [{ specialite: { nom: 'asc' } }, { nom: 'asc' }],
  });

  const mapped = etudiants.map(({ binomes_comme_etud1, binomes_comme_etud2, ...e }) => {
    const b1 = binomes_comme_etud1[0];
    const b2 = binomes_comme_etud2[0];
    return {
      ...e,
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
  let theme: { id: string; titre: string; is_affecte: boolean; encadrant_id: string | null } | null = null;
  if (dto.theme_id) {
    theme = await prisma.theme.findUnique({ where: { id: dto.theme_id } });
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

  // Vérifier la capacité de l'encadrant (max 2 étudiants supervisés au total)
  const currentStudentCount = await prisma.affectationEtudiant.count({
    where: { affectation: { encadrant_id: dto.encadrant_id } },
  });
  const newStudentCount = effectiveEtudiantIds.length;
  if (currentStudentCount + newStudentCount > 4) {
    const remaining = 4 - currentStudentCount;
    if (newStudentCount > remaining) {
      throw new BadRequestError(
        `Cet enseignant ne peut accueillir que ${remaining} étudiant${remaining !== 1 ? 's' : ''} supplémentaire${remaining !== 1 ? 's' : ''} (capacité max : 4)`,
      );
    }
    throw new BadRequestError('Cet enseignant a atteint sa capacité maximale (4 étudiants encadrés)');
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
    where: { is_active: true },
    orderBy: { date_debut: 'desc' },
  });
  if (!session) throw new BadRequestError('Aucune session active');

  const affectation = await prisma.$transaction(async (tx) => {
    const a = await tx.affectation.create({
      data: {
        theme_id: dto.theme_id ?? null,
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

  // Compter les étudiants déjà supervisés par encadrant (1 binôme = 2 places)
  const encadrantIds = [...new Set(themesRaw.map((t) => t.encadrant_id!))];
  const existingStudentRecords = await prisma.affectationEtudiant.findMany({
    where: { affectation: { encadrant_id: { in: encadrantIds } } },
    select: { affectation: { select: { encadrant_id: true } } },
  });
  const countByEncadrant = new Map<string, number>();
  for (const r of existingStudentRecords) {
    const encId = r.affectation.encadrant_id!;
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

  function findTheme(specialiteId: string, nbStudents: number = 1): ThemeRow | null {
    return (
      themesRaw.find(
        (t) =>
          !assignedThemes.has(t.id) &&
          t.encadrant_id !== null &&
          (algoCount.get(t.encadrant_id) ?? 0) + nbStudents <= 4 &&
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
    // Incrémenter par nombre d'étudiants (binôme = 2 places, solo = 1 place)
    algoCount.set(theme.encadrant_id!, (algoCount.get(theme.encadrant_id!) ?? 0) + etudiantIds.length);
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

    const theme = findTheme(etudiant.specialite_id, 2); // binôme = 2 places
    if (!theme) continue;

    pushSuggestion(theme, [etudiant.id, partnerId], binome.id);
  }

  // Passe 2 : étudiants seuls (cherchent un thème avec au moins 1 place libre)
  for (const etudiant of etudiants) {
    if (assignedStudents.has(etudiant.id)) continue;
    if (!etudiant.specialite_id) continue;

    const theme = findTheme(etudiant.specialite_id, 1); // solo = 1 place
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
    where: { is_active: true },
    orderBy: { date_debut: 'desc' },
  });
  if (!session) throw new BadRequestError('Aucune session active');

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

// ─── Startup : ajout d'un membre ─────────────────────────────────────────────

export async function addStartupMembre(
  affectationId: string,
  etudiantId: string,
  roleEquipe?: string,
) {
  const affectation = await prisma.affectation.findUnique({
    where: { id: affectationId },
    include: { theme: { select: { id: true, titre: true, type_pfe: true } }, startup_membres: true },
  });
  if (!affectation) throw new NotFoundError('Affectation');
  if (!affectation.theme || affectation.theme.type_pfe !== 'STARTUP') {
    throw new BadRequestError("Cette affectation n'est pas de type STARTUP");
  }
  if (affectation.startup_membres.length >= 6) {
    throw new BadRequestError("L'équipe STARTUP a atteint le maximum de 6 membres");
  }
  if (affectation.startup_membres.some((m) => m.etudiant_id === etudiantId)) {
    throw new BadRequestError('Cet étudiant est déjà membre de l\'équipe');
  }

  const etudiant = await prisma.user.findUnique({
    where: { id: etudiantId },
    include: { affectations_etudiant: { take: 1 }, startup_membres: { take: 1 } },
  });
  if (!etudiant || etudiant.role !== 'ETUDIANT' || !etudiant.is_active) {
    throw new NotFoundError('Étudiant');
  }
  if (etudiant.affectations_etudiant.length > 0 || etudiant.startup_membres.length > 0) {
    throw new BadRequestError('Cet étudiant est déjà affecté à un autre thème');
  }

  const membre = await prisma.startupMembre.create({
    data: { affectation_id: affectationId, etudiant_id: etudiantId, role_equipe: roleEquipe ?? null },
    include: {
      etudiant: {
        select: {
          id: true, nom: true, prenom: true, email: true,
          specialite: { select: { id: true, nom: true } },
        },
      },
    },
  });

  await notifyUser(
    etudiantId,
    'AFFECTATION',
    `Vous avez été ajouté à l'équipe startup "${affectation.theme?.titre ?? ''}"`,
    { theme_id: affectation.theme?.id, affectation_id: affectationId },
  );

  return membre;
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
