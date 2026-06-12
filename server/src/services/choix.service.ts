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
      id: true, titre: true, statut_validation: true, is_affecte: true, type_pfe: true,
      encadrant_id: true, co_encadrant_id: true, propose_par_id: true,
      besoin_encadrant: true, encadrant_valide: true,
      theme_specialites: { select: { specialite_id: true } },
      affectation: {
        select: {
          startup_membres: { select: { id: true } },
          membres_externes: { select: { id: true } },
          etudiants: { select: { etudiant_id: true } },
        },
      },
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
    if (theme.type_pfe === 'STARTUP') {
      // Pour les STARTUP, is_affecte peut être true même si l'équipe n'est pas pleine
      // → vérifier le vrai nombre de membres
      const totalMembers =
        (theme.affectation?.startup_membres.length ?? 0) +
        (theme.affectation?.membres_externes.length ?? 0) +
        (theme.affectation?.etudiants.length ?? 0);
      if (totalMembers >= 6) {
        throw new BadRequestError("L'équipe STARTUP de ce thème est complète (6 membres)");
      }
    } else {
      throw new BadRequestError('Ce thème est déjà affecté à un autre étudiant');
    }
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
      etudiant: { select: { nom: true, prenom: true } },
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
  // Pour STARTUP, is_affecte=true ne bloque pas — la transaction vérifie le nombre de membres
  if (choix.theme.is_affecte && choix.theme.type_pfe !== 'STARTUP') {
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

  const isStartup = choix.theme.type_pfe === 'STARTUP';
  const etudiantIds = [choix.etudiant_id, ...(partnerId ? [partnerId] : [])];
  const allAffectedIds = etudiantIds;

  // Capturer les autres demandes pending AVANT la transaction (elles seront supprimées)
  const otherPendingChoix = await prisma.themeChoix.findMany({
    where: {
      id: { not: choixId },
      statut: 'PENDING',
      OR: [
        ...(effectiveBinomeId ? [{ binome_id: effectiveBinomeId }] : []),
        { etudiant_id: { in: allAffectedIds } },
      ],
    },
    select: {
      theme: {
        select: {
          id: true,
          titre: true,
          propose_par_id: true,
          encadrant_id: true,
          co_encadrant_id: true,
        },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    if (isStartup) {
      // ── Flux STARTUP : une seule affectation partagée, is_affecte seulement quand plein ──

      // Re-vérification : compter les membres actuels (pas is_affecte)
      const existingAff = await tx.affectation.findFirst({
        where: { theme_id: choix.theme_id },
        include: {
          startup_membres: true,
          membres_externes: true,
          etudiants: true,
        },
      });
      const currentCount = existingAff
        ? existingAff.startup_membres.length + existingAff.membres_externes.length + existingAff.etudiants.length
        : 0;
      if (currentCount + etudiantIds.length > 6) {
        throw new BadRequestError("L'équipe STARTUP est complète (maximum 6 membres)");
      }

      // 1. Accepter ce choix
      await tx.themeChoix.update({ where: { id: choixId }, data: { statut: 'ACCEPTED' } });

      // 2. Supprimer les autres choix PENDING de l'étudiant/binôme accepté
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

      // 3. Trouver ou créer l'affectation startup unique
      let affId: string;
      if (existingAff) {
        affId = existingAff.id;
      } else {
        const newAff = await tx.affectation.create({
          data: {
            theme_id: choix.theme_id,
            encadrant_id: enseignantId,
            session_id: choix.theme.session_id,
            affecte_par: enseignantId,
            type: 'LIBRE',
          },
        });
        affId = newAff.id;
      }

      // 4. Ajouter les étudiants comme StartupMembre
      await tx.startupMembre.createMany({
        data: etudiantIds.map((etudiant_id) => ({ affectation_id: affId, etudiant_id })),
      });

      // 5. Si l'équipe est maintenant pleine → marquer le thème affecté + refuser les autres choix
      const newCount = currentCount + etudiantIds.length;
      if (newCount >= 6) {
        await tx.theme.update({ where: { id: choix.theme_id }, data: { is_affecte: true } });
        await tx.themeChoix.updateMany({
          where: { theme_id: choix.theme_id, id: { not: choixId }, statut: 'PENDING' },
          data: { statut: 'REFUSED' },
        });
      }

    } else {
      // ── Flux CLASSIQUE ────────────────────────────────────────────────────────

      // Re-vérification dans la transaction (protection contre concurrence)
      const freshTheme = await tx.theme.findUnique({
        where: { id: choix.theme_id },
        select: { is_affecte: true },
      });
      if (freshTheme?.is_affecte) {
        throw new BadRequestError('Ce thème vient d\'être affecté à un autre étudiant');
      }

      // 1. Accepter ce choix
      await tx.themeChoix.update({ where: { id: choixId }, data: { statut: 'ACCEPTED' } });

      // 2. Marquer le thème comme affecté (+ confirmer encadrant si besoin_encadrant était actif)
      await tx.theme.update({
        where: { id: choix.theme_id },
        data: {
          is_affecte: true,
          ...(choix.theme.besoin_encadrant
            ? { besoin_encadrant: false, encadrant_id: enseignantId, encadrant_valide: true, statut_validation: 'VALIDE' }
            : {}),
        },
      });

      // 3. Refuser tous les autres PENDING pour ce thème
      await tx.themeChoix.updateMany({
        where: { theme_id: choix.theme_id, id: { not: choixId }, statut: 'PENDING' },
        data: { statut: 'REFUSED' },
      });

      // 3b. Supprimer les autres choix PENDING de l'étudiant/binôme
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

      // 4. Créer l'affectation
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
        data: { affectation_id: affectation.id, etudiant_id: choix.etudiant_id, binome_id: effectiveBinomeId },
      });

      // 6. Lier le partenaire de binôme si applicable
      if (partnerId) {
        await tx.affectationEtudiant.create({
          data: { affectation_id: affectation.id, etudiant_id: partnerId, binome_id: effectiveBinomeId },
        });
      }
    }

    // ── Commun aux deux flux ──────────────────────────────────────────────────

    // Fermer les thèmes NON_VALIDE proposés par l'étudiant (plus de sens si affecté ailleurs)
    await tx.theme.updateMany({
      where: { propose_par_id: { in: allAffectedIds }, statut_validation: 'NON_VALIDE', is_affecte: false },
      data: { is_affecte: true },
    });

    // Désactiver les propositions "cherche encadrant" des étudiants affectés
    await tx.theme.updateMany({
      where: { propose_par_id: { in: allAffectedIds }, besoin_encadrant: true, is_affecte: false },
      data: { is_affecte: true, besoin_encadrant: false },
    });

    // Retirer les annonces "cherche binôme"
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

  // Notifier les enseignants des autres thèmes dont la demande est annulée
  if (otherPendingChoix.length > 0) {
    const etudiantNom = `${choix.etudiant.prenom} ${choix.etudiant.nom}`;
    for (const cancelled of otherPendingChoix) {
      const teacherIds = new Set<string>();
      teacherIds.add(cancelled.theme.propose_par_id);
      if (cancelled.theme.encadrant_id) teacherIds.add(cancelled.theme.encadrant_id);
      if (cancelled.theme.co_encadrant_id) teacherIds.add(cancelled.theme.co_encadrant_id);
      for (const teacherId of teacherIds) {
        await notifyUser(
          teacherId,
          'CHOIX_ANNULE',
          `La demande de ${etudiantNom} pour votre thème "${cancelled.theme.titre}" est annulée — l'étudiant a été affecté à un autre thème`,
          { theme_id: cancelled.theme.id, statut: 'CANCELLED' },
        );
      }
    }
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
