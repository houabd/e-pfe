import { prisma } from '../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error.middleware';
import { notifyUser } from './notification.service';
import type { CreateChoixDto } from '../types';

const MAX_CHOIX = 3;

const ETUDIANT_SELECT = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  specialite: { select: { id: true, nom: true } },
} as const;

// ─── Récupérer le binôme actif d'un étudiant ─────────────────────────────────

async function getBinomeActif(etudiantId: string) {
  return prisma.binome.findFirst({
    where: {
      OR: [{ etud1_id: etudiantId }, { etud2_id: etudiantId }],
      statut: 'ACCEPTED',
    },
  });
}

// ─── Mes choix ────────────────────────────────────────────────────────────────

export async function getMesChoix(etudiantId: string) {
  const binome = await getBinomeActif(etudiantId);

  // Si binôme : afficher les choix communs (soumis par l'un OU l'autre partenaire)
  const where = binome
    ? { binome_id: binome.id }
    : { etudiant_id: etudiantId };

  const choix = await prisma.themeChoix.findMany({
    where,
    include: {
      etudiant: { select: ETUDIANT_SELECT },
      theme: {
        include: {
          encadrant: { select: { id: true, nom: true, prenom: true } },
          theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
        },
      },
    },
    orderBy: { ordre: 'asc' },
  });

  // Flag dérivé : peut rechoisir si tous les 3 slots ont été REFUSED
  const peutRechoisir =
    choix.length >= MAX_CHOIX && choix.every((c) => c.statut === 'REFUSED');

  return { choix, peutRechoisir };
}

// ─── Soumettre un choix ───────────────────────────────────────────────────────

export async function createChoix(dto: CreateChoixDto, etudiantId: string) {
  const binome = await getBinomeActif(etudiantId);

  // Compter les choix actifs (non refusés) pour l'étudiant OU son binôme
  const existing = await prisma.themeChoix.findMany({
    where: binome
      ? { binome_id: binome.id, statut: { not: 'REFUSED' } }
      : { etudiant_id: etudiantId, statut: { not: 'REFUSED' } },
  });

  if (existing.length >= MAX_CHOIX) {
    throw new BadRequestError('Vous avez atteint le maximum de 3 choix');
  }

  if (existing.find((c) => c.ordre === dto.ordre)) {
    throw new BadRequestError(`La position ${dto.ordre} est déjà prise`);
  }

  if (existing.find((c) => c.theme_id === dto.theme_id)) {
    throw new BadRequestError('Ce thème est déjà dans vos choix');
  }

  const theme = await prisma.theme.findUnique({
    where: { id: dto.theme_id },
    select: {
      id: true, titre: true, statut_validation: true, is_affecte: true,
      encadrant_id: true, besoin_encadrant: true,
    },
  });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.statut_validation !== 'VALIDE') {
    throw new BadRequestError('Ce thème n\'est pas encore validé');
  }
  if (theme.is_affecte) {
    throw new BadRequestError('Ce thème est déjà affecté à un autre étudiant');
  }
  if (theme.besoin_encadrant) {
    throw new BadRequestError('Ce thème cherche encore un encadrant et n\'est pas disponible');
  }

  const choix = await prisma.themeChoix.create({
    data: {
      etudiant_id: etudiantId,
      theme_id: dto.theme_id,
      ordre: dto.ordre,
      binome_id: binome?.id ?? null,
    },
    include: {
      etudiant: { select: ETUDIANT_SELECT },
      theme: {
        include: {
          encadrant: { select: { id: true, nom: true, prenom: true } },
          theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
        },
      },
    },
  });

  // Notifier l'encadrant du thème
  if (theme.encadrant_id) {
    const etudiant = await prisma.user.findUnique({
      where: { id: etudiantId },
      select: { nom: true, prenom: true },
    });
    const who = etudiant ? `${etudiant.prenom} ${etudiant.nom}` : 'Un étudiant';
    const suffix = binome ? ' (en binôme)' : '';

    await notifyUser(
      theme.encadrant_id,
      'THEME_CHOSEN',
      `${who} a choisi votre thème "${theme.titre}" en position ${dto.ordre}${suffix}`,
      { theme_id: theme.id, choix_id: choix.id },
    );
  }

  return choix;
}

// ─── Demandes reçues pour un enseignant ──────────────────────────────────────

export async function getDemandesEnseignant(enseignantId: string) {
  return prisma.themeChoix.findMany({
    where: {
      theme: { encadrant_id: enseignantId },
      statut: 'PENDING',
    },
    include: {
      etudiant: { select: ETUDIANT_SELECT },
      theme: {
        select: { id: true, titre: true, type_pfe: true, sous_types: true },
      },
      binome: {
        include: {
          etud1: { select: ETUDIANT_SELECT },
          etud2: { select: ETUDIANT_SELECT },
        },
      },
    },
    orderBy: [{ theme_id: 'asc' }, { ordre: 'asc' }],
  });
}

// ─── Accepter un choix ────────────────────────────────────────────────────────

export async function acceptChoix(choixId: string, enseignantId: string) {
  const choix = await prisma.themeChoix.findUnique({
    where: { id: choixId },
    include: {
      theme: true,
      binome: {
        select: { id: true, etud1_id: true, etud2_id: true },
      },
    },
  });
  if (!choix) throw new NotFoundError('Choix');
  if (choix.theme.encadrant_id !== enseignantId) {
    throw new ForbiddenError('Ce choix ne concerne pas vos thèmes');
  }
  if (choix.statut !== 'PENDING') {
    throw new BadRequestError('Ce choix a déjà été traité');
  }
  if (choix.theme.is_affecte) {
    throw new BadRequestError('Ce thème est déjà affecté');
  }

  const partnerId = choix.binome
    ? choix.binome.etud1_id === choix.etudiant_id
      ? choix.binome.etud2_id
      : choix.binome.etud1_id
    : null;

  await prisma.$transaction(async (tx) => {
    // Re-vérification dans la transaction (protection contre concurrence)
    const freshTheme = await tx.theme.findUnique({
      where: { id: choix.theme_id },
      select: { is_affecte: true },
    });
    if (freshTheme?.is_affecte) {
      throw new BadRequestError('Ce thème vient d\'être affecté à un autre étudiant');
    }

    // 1. Accepter ce choix
    await tx.themeChoix.update({
      where: { id: choixId },
      data: { statut: 'ACCEPTED' },
    });

    // 2. Marquer le thème comme affecté
    await tx.theme.update({
      where: { id: choix.theme_id },
      data: { is_affecte: true },
    });

    // 3. Refuser tous les autres PENDING pour ce thème (autres étudiants)
    await tx.themeChoix.updateMany({
      where: {
        theme_id: choix.theme_id,
        id: { not: choixId },
        statut: 'PENDING',
      },
      data: { statut: 'REFUSED' },
    });

    // 3b. Supprimer les autres choix PENDING de l'étudiant/binôme accepté (autres thèmes)
    await tx.themeChoix.deleteMany({
      where: {
        id: { not: choixId },
        statut: 'PENDING',
        ...(choix.binome_id
          ? { binome_id: choix.binome_id }
          : { etudiant_id: choix.etudiant_id }),
      },
    });

    // 4. Créer l'affectation (session du thème)
    const affectation = await tx.affectation.create({
      data: {
        theme_id: choix.theme_id,
        encadrant_id: enseignantId,
        session_id: choix.theme.session_id,
        affecte_par: enseignantId,
        type: 'LIBRE',
      },
    });

    // 5. Lier l'étudiant à l'affectation
    await tx.affectationEtudiant.create({
      data: {
        affectation_id: affectation.id,
        etudiant_id: choix.etudiant_id,
        binome_id: choix.binome_id,
      },
    });

    // 6. Lier le partenaire de binôme si applicable
    if (partnerId && choix.binome_id) {
      await tx.affectationEtudiant.create({
        data: {
          affectation_id: affectation.id,
          etudiant_id: partnerId,
          binome_id: choix.binome_id,
        },
      });
    }
  });

  // Notifications post-transaction
  await notifyUser(
    choix.etudiant_id,
    'THEME_RESPONSE',
    `Votre choix de thème "${choix.theme.titre}" a été accepté — affectation confirmée`,
    { theme_id: choix.theme_id, choix_id: choixId, statut: 'ACCEPTED' },
  );

  if (partnerId) {
    await notifyUser(
      partnerId,
      'THEME_RESPONSE',
      `Le thème "${choix.theme.titre}" choisi par votre binôme a été accepté — affectation confirmée`,
      { theme_id: choix.theme_id, choix_id: choixId, statut: 'ACCEPTED' },
    );
  }

  return { message: 'Choix accepté, affectation créée' };
}

// ─── Refuser un choix ─────────────────────────────────────────────────────────

export async function refuseChoix(choixId: string, enseignantId: string) {
  const choix = await prisma.themeChoix.findUnique({
    where: { id: choixId },
    include: { theme: { select: { id: true, titre: true, encadrant_id: true } } },
  });
  if (!choix) throw new NotFoundError('Choix');
  if (choix.theme.encadrant_id !== enseignantId) {
    throw new ForbiddenError('Ce choix ne concerne pas vos thèmes');
  }
  if (choix.statut !== 'PENDING') {
    throw new BadRequestError('Ce choix a déjà été traité');
  }

  await prisma.themeChoix.update({
    where: { id: choixId },
    data: { statut: 'REFUSED' },
  });

  await notifyUser(
    choix.etudiant_id,
    'THEME_RESPONSE',
    `Votre choix pour le thème "${choix.theme.titre}" a été refusé`,
    { theme_id: choix.theme.id, choix_id: choixId, statut: 'REFUSED' },
  );

  // Détecter si tous les choix (du binôme ou de l'étudiant) sont maintenant refusés
  const restants = await prisma.themeChoix.count({
    where: choix.binome_id
      ? { binome_id: choix.binome_id, statut: { not: 'REFUSED' } }
      : { etudiant_id: choix.etudiant_id, statut: { not: 'REFUSED' } },
  });

  const tousRefuses = restants === 0;

  if (tousRefuses) {
    // Notifier l'étudiant qu'il peut soumettre de nouveaux choix
    await notifyUser(
      choix.etudiant_id,
      'THEME_RESPONSE',
      'Tous vos choix de thèmes ont été refusés. Vous pouvez soumettre de nouveaux choix.',
      { peut_rechoisir: true },
    );

    // Notifier aussi le partenaire de binôme
    if (choix.binome_id) {
      const binome = await prisma.binome.findUnique({
        where: { id: choix.binome_id },
        select: { etud1_id: true, etud2_id: true },
      });
      if (binome) {
        const partnerId =
          binome.etud1_id === choix.etudiant_id
            ? binome.etud2_id
            : binome.etud1_id;

        await notifyUser(
          partnerId,
          'THEME_RESPONSE',
          'Tous vos choix de thèmes ont été refusés. Vous pouvez soumettre de nouveaux choix.',
          { peut_rechoisir: true },
        );
      }
    }
  }

  return { tousRefuses };
}
