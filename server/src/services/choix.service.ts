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
      encadrant_id: true, co_encadrant_id: true, propose_par_id: true,
      besoin_encadrant: true, encadrant_valide: true,
      theme_specialites: { select: { specialite_id: true } },
    },
  });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.statut_validation !== 'VALIDE') {
    throw new BadRequestError('Ce thème n\'est pas encore validé');
  }
  if (!theme.encadrant_valide) {
    throw new BadRequestError('L\'encadrant désigné n\'a pas encore confirmé sa supervision');
  }
  if (theme.is_affecte) {
    throw new BadRequestError('Ce thème est déjà affecté à un autre étudiant');
  }
  if (theme.besoin_encadrant) {
    throw new BadRequestError('Ce thème cherche encore un encadrant et n\'est pas disponible');
  }

  // Vérification de spécialité : si le thème définit des spécialités, l'étudiant doit en faire partie
  const themeSpecialiteIds = theme.theme_specialites.map((ts) => ts.specialite_id);
  if (themeSpecialiteIds.length > 0) {
    const etudiant = await prisma.user.findUnique({
      where: { id: etudiantId },
      select: { specialite_id: true },
    });
    if (!etudiant?.specialite_id || !themeSpecialiteIds.includes(etudiant.specialite_id)) {
      throw new ForbiddenError('Votre spécialité ne correspond pas aux spécialités de ce thème');
    }
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

  // Notifier encadrant principal (proposant), encadrant désigné et co-encadrant — sans doublon
  const etudiant = await prisma.user.findUnique({
    where: { id: etudiantId },
    select: { nom: true, prenom: true },
  });
  const who = etudiant ? `${etudiant.prenom} ${etudiant.nom}` : 'Un étudiant';
  const suffix = binome ? ' (en binôme)' : '';
  const msg = `${who} a choisi votre thème "${theme.titre}" en position ${dto.ordre}${suffix}`;
  const meta = { theme_id: theme.id, choix_id: choix.id };

  const recipients = new Set<string>();
  recipients.add(theme.propose_par_id);
  if (theme.encadrant_id) recipients.add(theme.encadrant_id);
  if (theme.co_encadrant_id) recipients.add(theme.co_encadrant_id);
  for (const recipientId of recipients) {
    await notifyUser(recipientId, 'THEME_CHOSEN', msg, meta);
  }

  return choix;
}

// ─── Demandes reçues pour un enseignant ──────────────────────────────────────

export async function getDemandesEnseignant(enseignantId: string) {
  return prisma.themeChoix.findMany({
    where: {
      theme: {
        OR: [
          { propose_par_id: enseignantId },
          { encadrant_id: enseignantId },
          { co_encadrant_id: enseignantId },
        ],
      },
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
  const isOwner =
    choix.theme.propose_par_id === enseignantId ||
    choix.theme.encadrant_id === enseignantId ||
    choix.theme.co_encadrant_id === enseignantId;
  if (!isOwner) {
    throw new ForbiddenError('Ce choix ne concerne pas vos thèmes');
  }
  if (choix.statut !== 'PENDING') {
    throw new BadRequestError('Ce choix a déjà été traité');
  }
  if (choix.theme.is_affecte) {
    throw new BadRequestError('Ce thème est déjà affecté');
  }

  let partnerId: string | null = choix.binome
    ? choix.binome.etud1_id === choix.etudiant_id
      ? choix.binome.etud2_id
      : choix.binome.etud1_id
    : null;

  let effectiveBinomeId: string | null = choix.binome_id;

  // Le choix était solo : chercher un binôme actif formé depuis la soumission du choix
  if (!partnerId) {
    const binomeActif = await prisma.binome.findFirst({
      where: {
        OR: [{ etud1_id: choix.etudiant_id }, { etud2_id: choix.etudiant_id }],
        statut: 'ACCEPTED',
      },
      select: { id: true, etud1_id: true, etud2_id: true },
    });
    if (binomeActif) {
      partnerId = binomeActif.etud1_id === choix.etudiant_id
        ? binomeActif.etud2_id
        : binomeActif.etud1_id;
      effectiveBinomeId = binomeActif.id;
      console.log(`[acceptChoix] binôme actif trouvé après soumission du choix — partnerId=${partnerId} effectiveBinomeId=${effectiveBinomeId}`);
    }
  }
  console.log(`[acceptChoix] choixId=${choixId} etudiantId=${choix.etudiant_id} partnerId=${partnerId ?? 'null'} effectiveBinomeId=${effectiveBinomeId ?? 'null'}`);

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

    // 2. Marquer le thème comme affecté (+ confirmer encadrant si besoin_encadrant était actif)
    await tx.theme.update({
      where: { id: choix.theme_id },
      data: {
        is_affecte: true,
        ...(choix.theme.besoin_encadrant
          ? {
              besoin_encadrant: false,
              encadrant_id: enseignantId,
              encadrant_valide: true,
              statut_validation: 'VALIDE',
            }
          : {}),
      },
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

    // 3b. Supprimer tous les choix PENDING de l'étudiant/binôme (sauf le choix accepté)
    // Couvre les choix liés par binome_id ET les choix solo soumis avant la formation du binôme
    const allAffectedIds = [choix.etudiant_id, ...(partnerId ? [partnerId] : [])];
    await tx.themeChoix.deleteMany({
      where: {
        id: { not: choixId },
        statut: 'PENDING',
        OR: [
          ...(effectiveBinomeId ? [{ binome_id: effectiveBinomeId }] : []),
          { etudiant_id: { in: allAffectedIds } },
        ],
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

    const isStartup = choix.theme.type_pfe === 'STARTUP';
    const etudiantIds = [choix.etudiant_id, ...(partnerId ? [partnerId] : [])];

    if (isStartup) {
      // 5 & 6. STARTUP → StartupMembre (équipe agrandissable jusqu'à 6)
      await tx.startupMembre.createMany({
        data: etudiantIds.map((etudiant_id) => ({ affectation_id: affectation.id, etudiant_id })),
      });
      console.log(`[acceptChoix] StartupMembre créés pour ${etudiantIds.join(', ')} affectation=${affectation.id}`);
    } else {
      // 5. Lier l'étudiant à l'affectation
      await tx.affectationEtudiant.create({
        data: { affectation_id: affectation.id, etudiant_id: choix.etudiant_id, binome_id: effectiveBinomeId },
      });
      console.log(`[acceptChoix] AffectationEtudiant créé pour A=${choix.etudiant_id} affectation=${affectation.id}`);

      // 6. Lier le partenaire de binôme si applicable
      if (partnerId) {
        await tx.affectationEtudiant.create({
          data: { affectation_id: affectation.id, etudiant_id: partnerId, binome_id: effectiveBinomeId },
        });
        console.log(`[acceptChoix] AffectationEtudiant créé pour B=${partnerId} affectation=${affectation.id}`);
      } else {
        console.log('[acceptChoix] Pas de partenaire — aucun AffectationEtudiant créé pour B');
      }
    }

    // 7. Désactiver les propositions "cherche encadrant" des étudiants affectés (maintenant orphelines)
    await tx.theme.updateMany({
      where: {
        propose_par_id: { in: allAffectedIds },
        besoin_encadrant: true,
        is_affecte: false,
      },
      data: { is_affecte: true, besoin_encadrant: false },
    });

    // 8. Retirer les annonces "cherche binôme"
    await tx.theme.updateMany({
      where: { propose_par_id: { in: allAffectedIds }, cherche_binome: true },
      data: { cherche_binome: false },
    });
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

  // Notifier tous les autres responsables du thème qui n'ont pas agi
  const autresResponsables = new Set<string>();
  autresResponsables.add(choix.theme.propose_par_id);
  if (choix.theme.encadrant_id) autresResponsables.add(choix.theme.encadrant_id);
  if (choix.theme.co_encadrant_id) autresResponsables.add(choix.theme.co_encadrant_id);
  autresResponsables.delete(enseignantId);
  for (const autreId of autresResponsables) {
    await notifyUser(
      autreId,
      'THEME_CHOSEN_HANDLED',
      `La demande de l'étudiant pour le thème "${choix.theme.titre}" a été acceptée par un co-responsable`,
      { theme_id: choix.theme_id, choix_id: choixId, statut: 'ACCEPTED' },
    );
  }

  return { message: 'Choix accepté, affectation créée' };
}

// ─── Refuser un choix ─────────────────────────────────────────────────────────

export async function refuseChoix(choixId: string, enseignantId: string) {
  const choix = await prisma.themeChoix.findUnique({
    where: { id: choixId },
    include: { theme: { select: { id: true, titre: true, propose_par_id: true, encadrant_id: true, co_encadrant_id: true } } },
  });
  if (!choix) throw new NotFoundError('Choix');
  const isOwner =
    choix.theme.propose_par_id === enseignantId ||
    choix.theme.encadrant_id === enseignantId ||
    choix.theme.co_encadrant_id === enseignantId;
  if (!isOwner) {
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

  // Notifier tous les autres responsables du thème qui n'ont pas agi
  const autresResponsables = new Set<string>();
  autresResponsables.add(choix.theme.propose_par_id);
  if (choix.theme.encadrant_id) autresResponsables.add(choix.theme.encadrant_id);
  if (choix.theme.co_encadrant_id) autresResponsables.add(choix.theme.co_encadrant_id);
  autresResponsables.delete(enseignantId);
  for (const autreId of autresResponsables) {
    await notifyUser(
      autreId,
      'THEME_CHOSEN_HANDLED',
      `La demande de l'étudiant pour le thème "${choix.theme.titre}" a été refusée par un co-responsable`,
      { theme_id: choix.theme.id, choix_id: choixId, statut: 'REFUSED' },
    );
  }

  return { tousRefuses };
}
