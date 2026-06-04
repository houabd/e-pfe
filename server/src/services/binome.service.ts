import { prisma } from '../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error.middleware';
import { notifyUser } from './notification.service';

const ETUDIANT_SELECT = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  matricule: true,
  specialite: { select: { id: true, nom: true } },
} as const;

// ─── Demander un binôme ───────────────────────────────────────────────────────

export async function demanderBinome(demandeurId: string, cibleId: string) {
  if (demandeurId === cibleId) {
    throw new BadRequestError('Vous ne pouvez pas vous ajouter vous-même comme binôme');
  }

  // Vérif demandeur : pas dans une équipe STARTUP
  const demandeurStartup = await prisma.startupMembre.findFirst({
    where: { etudiant_id: demandeurId },
    select: { id: true },
  });
  if (demandeurStartup) {
    throw new BadRequestError('Vous êtes affecté à un thème STARTUP — la formation de binôme n\'est pas applicable');
  }

  // Vérif demandeur : pas de demande en cours ni de binôme actif
  const demandePendingDemandeur = await prisma.binome.findFirst({
    where: {
      OR: [{ etud1_id: demandeurId }, { etud2_id: demandeurId }],
      statut: { in: ['PENDING', 'ACCEPTED'] },
    },
  });
  if (demandePendingDemandeur) {
    throw new BadRequestError('Vous avez déjà une demande de binôme en cours ou un binôme actif');
  }

  // Vérif cible : existe, est étudiant actif, et n'a pas déjà un binôme
  const cible = await prisma.user.findUnique({
    where: { id: cibleId },
    select: { id: true, role: true, is_active: true, nom: true, prenom: true },
  });
  if (!cible || cible.role !== 'ETUDIANT') throw new NotFoundError('Étudiant');
  if (!cible.is_active) throw new BadRequestError('Ce compte étudiant est désactivé');

  const demandePendingCible = await prisma.binome.findFirst({
    where: {
      OR: [{ etud1_id: cibleId }, { etud2_id: cibleId }],
      statut: { in: ['PENDING', 'ACCEPTED'] },
    },
  });
  if (demandePendingCible) {
    throw new BadRequestError('Cet étudiant a déjà une demande de binôme en cours ou un binôme actif');
  }

  // Vérifier que la cible n'est pas déjà formellement affectée à un autre thème
  const [cibleAffectation, cibleStartup] = await Promise.all([
    prisma.affectationEtudiant.findFirst({ where: { etudiant_id: cibleId }, select: { id: true } }),
    prisma.startupMembre.findFirst({ where: { etudiant_id: cibleId }, select: { id: true } }),
  ]);
  if (cibleAffectation || cibleStartup) {
    throw new BadRequestError('Cet étudiant est déjà affecté à un thème');
  }

  const binome = await prisma.binome.create({
    data: { etud1_id: demandeurId, etud2_id: cibleId, statut: 'PENDING' },
    include: {
      etud1: { select: ETUDIANT_SELECT },
      etud2: { select: ETUDIANT_SELECT },
    },
  });

  await notifyUser(
    cibleId,
    'BINOME_REQUEST',
    `${binome.etud1.prenom} ${binome.etud1.nom} vous demande en binôme`,
    { binome_id: binome.id, demandeur_id: demandeurId },
  );

  return binome;
}

// ─── Accepter une demande ─────────────────────────────────────────────────────

export async function acceptBinome(binomeId: string, userId: string) {
  const binome = await prisma.binome.findUnique({ where: { id: binomeId } });
  if (!binome) throw new NotFoundError('Demande de binôme');
  if (binome.etud2_id !== userId) throw new ForbiddenError('Cette demande ne vous est pas adressée');
  if (binome.statut !== 'PENDING') throw new BadRequestError('Cette demande n\'est plus en attente');

  // Vérifier qu'aucun des deux étudiants n'est entre-temps rejoint une équipe STARTUP
  const [etud2Startup, etud1Startup] = await Promise.all([
    prisma.startupMembre.findFirst({ where: { etudiant_id: userId }, select: { id: true } }),
    prisma.startupMembre.findFirst({ where: { etudiant_id: binome.etud1_id }, select: { id: true } }),
  ]);
  if (etud2Startup) {
    throw new BadRequestError('Vous êtes affecté à un thème STARTUP — vous ne pouvez pas accepter une demande de binôme');
  }
  if (etud1Startup) {
    throw new BadRequestError('Le demandeur est désormais affecté à un thème STARTUP — cette demande n\'est plus valide');
  }

  type EncadrantInfo = {
    encadrantId: string;
    encadrantPrenom: string | null;
    encadrantNom: string | null;
    theme: { id: string; titre: string } | null;
    newMemberId: string;
  } | null;

  const { updated, encadrantInfo } = await prisma.$transaction(async (tx) => {
    // Annuler toutes les demandes PENDING reçues par etud2 (sauf celle-ci)
    await tx.binome.updateMany({
      where: { etud2_id: userId, statut: 'PENDING', id: { not: binomeId } },
      data: { statut: 'REFUSED' },
    });

    // Annuler toutes les demandes PENDING envoyées par etud2
    await tx.binome.updateMany({
      where: { etud1_id: userId, statut: 'PENDING' },
      data: { statut: 'REFUSED' },
    });

    // Annuler toutes les demandes PENDING envoyées par etud1 (sauf celle-ci)
    await tx.binome.updateMany({
      where: { etud1_id: binome.etud1_id, statut: 'PENDING', id: { not: binomeId } },
      data: { statut: 'REFUSED' },
    });

    // Annuler toutes les demandes PENDING reçues par etud1 (d'autres étudiants)
    await tx.binome.updateMany({
      where: { etud2_id: binome.etud1_id, statut: 'PENDING', id: { not: binomeId } },
      data: { statut: 'REFUSED' },
    });

    // Retirer le flag "cherche binôme" sur les thèmes proposés par l'un ou l'autre
    await tx.theme.updateMany({
      where: {
        propose_par_id: { in: [binome.etud1_id, userId] },
        cherche_binome: true,
      },
      data: { cherche_binome: false },
    });

    const result = await tx.binome.update({
      where: { id: binomeId },
      data: { statut: 'ACCEPTED' },
      include: {
        etud1: { select: ETUDIANT_SELECT },
        etud2: { select: ETUDIANT_SELECT },
      },
    });

    // ── Cas post-affectation : l'un des deux est déjà affecté ────────────────
    const [affEtud1, affEtud2] = await Promise.all([
      tx.affectationEtudiant.findFirst({
        where: { etudiant_id: binome.etud1_id },
        select: {
          affectation_id: true,
          affectation: {
            select: {
              encadrant_id: true,
              encadrant: { select: { prenom: true, nom: true } },
              theme: { select: { id: true, titre: true } },
            },
          },
        },
      }),
      tx.affectationEtudiant.findFirst({
        where: { etudiant_id: userId },
        select: {
          affectation_id: true,
          affectation: {
            select: {
              encadrant_id: true,
              encadrant: { select: { prenom: true, nom: true } },
              theme: { select: { id: true, titre: true } },
            },
          },
        },
      }),
    ]);

    let encadrantInfo: EncadrantInfo = null;

    async function attachToAffectation(
      affectationId: string,
      existingMemberId: string,
      newMemberId: string,
      encadrantId: string | null,
      encadrantPrenom: string | null,
      encadrantNom: string | null,
      theme: { id: string; titre: string } | null,
    ) {
      // Mettre à jour l'enregistrement existant pour lier le binôme
      await tx.affectationEtudiant.updateMany({
        where: { affectation_id: affectationId, etudiant_id: existingMemberId },
        data: { binome_id: binomeId },
      });
      // Ajouter le nouveau membre à la même affectation
      await tx.affectationEtudiant.create({
        data: { affectation_id: affectationId, etudiant_id: newMemberId, binome_id: binomeId },
      });
      // Nettoyer les données du nouveau membre maintenant affecté
      await tx.themeChoix.deleteMany({ where: { etudiant_id: newMemberId, statut: 'PENDING' } });
      await tx.theme.updateMany({
        where: { propose_par_id: newMemberId, besoin_encadrant: true, is_affecte: false },
        data: { is_affecte: true, besoin_encadrant: false },
      });
      await tx.theme.updateMany({
        where: { propose_par_id: newMemberId, cherche_binome: true },
        data: { cherche_binome: false },
      });
      if (encadrantId) {
        encadrantInfo = { encadrantId, encadrantPrenom, encadrantNom, theme, newMemberId };
      }
    }

    if (affEtud1 && !affEtud2) {
      // etud1 est affecté → rattacher etud2 à son affectation
      await attachToAffectation(
        affEtud1.affectation_id,
        binome.etud1_id,
        userId,
        affEtud1.affectation.encadrant_id,
        affEtud1.affectation.encadrant?.prenom ?? null,
        affEtud1.affectation.encadrant?.nom ?? null,
        affEtud1.affectation.theme,
      );
    } else if (affEtud2 && !affEtud1) {
      // etud2 est affecté → rattacher etud1 à son affectation
      await attachToAffectation(
        affEtud2.affectation_id,
        userId,
        binome.etud1_id,
        affEtud2.affectation.encadrant_id,
        affEtud2.affectation.encadrant?.prenom ?? null,
        affEtud2.affectation.encadrant?.nom ?? null,
        affEtud2.affectation.theme,
      );
    }
    // Si les deux sont affectés (cas rare) : le binôme social est créé mais pas de fusion d'affectation

    return { updated: result, encadrantInfo };
  });

  // Notifier le demandeur (etud1)
  await notifyUser(
    binome.etud1_id,
    'BINOME_RESPONSE',
    `${updated.etud2.prenom} ${updated.etud2.nom} a accepté votre demande de binôme`,
    { binome_id: binomeId, statut: 'ACCEPTED' },
  );

  // Notifier l'accepteur (etud2)
  await notifyUser(
    userId,
    'BINOME_RESPONSE',
    `Vous formez maintenant un binôme avec ${updated.etud1.prenom} ${updated.etud1.nom}`,
    { binome_id: binomeId, statut: 'ACCEPTED' },
  );

  // Cas post-affectation : notifier le nouveau membre et l'encadrant
  if (encadrantInfo) {
    const { encadrantId, encadrantPrenom, encadrantNom, theme, newMemberId } = encadrantInfo as NonNullable<EncadrantInfo>;
    const newMember = newMemberId === userId ? updated.etud2 : updated.etud1;
    const existingMember = newMemberId === userId ? updated.etud1 : updated.etud2;
    const themeTitre = theme?.titre ?? '';

    // Notifier le nouveau membre de son affectation automatique
    const encadrantLabel = encadrantPrenom && encadrantNom ? ` encadré par ${encadrantPrenom} ${encadrantNom}` : '';
    await notifyUser(
      newMemberId,
      'AFFECTATION',
      `Vous avez été affecté au thème "${themeTitre}"${encadrantLabel}`,
      { binome_id: binomeId, ...(theme ? { theme_id: theme.id } : {}) },
    );

    // Notifier l'encadrant de l'ajout du binôme
    await notifyUser(
      encadrantId,
      'BINOME_AJOUTE',
      `L'étudiant ${existingMember.prenom} ${existingMember.nom} a ajouté ${newMember.prenom} ${newMember.nom} comme binôme. Ils travaillent maintenant ensemble sur votre thème "${themeTitre}".`,
      { binome_id: binomeId, ...(theme ? { theme_id: theme.id } : {}) },
    );

    // Notifier le membre déjà affecté que son binôme l'a rejoint
    const alreadyAffectedId = newMemberId === userId ? binome.etud1_id : userId;
    await notifyUser(
      alreadyAffectedId,
      'BINOME_RESPONSE',
      `${newMember.prenom} ${newMember.nom} vous a rejoint dans votre affectation sur le thème "${themeTitre}"`,
      { binome_id: binomeId, ...(theme ? { theme_id: theme.id } : {}) },
    );
  }

  return updated;
}

// ─── Refuser une demande ──────────────────────────────────────────────────────

export async function refuseBinome(binomeId: string, userId: string) {
  const binome = await prisma.binome.findUnique({ where: { id: binomeId } });
  if (!binome) throw new NotFoundError('Demande de binôme');
  if (binome.etud2_id !== userId) throw new ForbiddenError('Cette demande ne vous est pas adressée');
  if (binome.statut !== 'PENDING') throw new BadRequestError('Cette demande n\'est plus en attente');

  const updated = await prisma.binome.update({
    where: { id: binomeId },
    data: { statut: 'REFUSED' },
    include: {
      etud2: { select: { prenom: true, nom: true } },
    },
  });

  await notifyUser(
    binome.etud1_id,
    'BINOME_RESPONSE',
    `${updated.etud2.prenom} ${updated.etud2.nom} a refusé votre demande de binôme`,
    { binome_id: binomeId, statut: 'REFUSED' },
  );

  return updated;
}

// ─── Récupérer le binôme actuel ───────────────────────────────────────────────

export async function getMonBinome(userId: string) {
  return prisma.binome.findFirst({
    where: {
      OR: [{ etud1_id: userId }, { etud2_id: userId }],
      statut: 'ACCEPTED',
    },
    include: {
      etud1: { select: { id: true, nom: true, prenom: true, email: true, matricule: true, specialite: { select: { id: true, nom: true } } } },
      etud2: { select: { id: true, nom: true, prenom: true, email: true, matricule: true, specialite: { select: { id: true, nom: true } } } },
    },
  });
}

// ─── Demandes reçues en attente ───────────────────────────────────────────────

export async function getDemandesRecues(userId: string) {
  return prisma.binome.findMany({
    where: { etud2_id: userId, statut: 'PENDING' },
    include: { etud1: { select: ETUDIANT_SELECT } },
    orderBy: { created_at: 'desc' },
  });
}

// ─── Demandes envoyées en attente ─────────────────────────────────────────────

export async function getDemandesEnvoyees(userId: string) {
  return prisma.binome.findMany({
    where: { etud1_id: userId, statut: 'PENDING' },
    include: { etud2: { select: ETUDIANT_SELECT } },
    orderBy: { created_at: 'desc' },
  });
}

// ─── Rechercher des étudiants ─────────────────────────────────────────────────

export async function rechercherEtudiants(
  userId: string,
  search?: string,
  specialiteId?: string,
) {
  const where = {
    role: 'ETUDIANT' as const,
    is_active: true,
    id: { not: userId },
    ...(specialiteId ? { specialite_id: specialiteId } : {}),
    ...(search
      ? {
          OR: [
            { nom: { contains: search, mode: 'insensitive' as const } },
            { prenom: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { matricule: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const etudiants = await prisma.user.findMany({
    where,
    select: ETUDIANT_SELECT,
    take: 20,
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });

  if (etudiants.length === 0) return [];

  const etudiantIds = etudiants.map((e) => e.id);

  // Récupérer toutes les relations binôme impliquant ces étudiants OU le demandeur courant
  const relations = await prisma.binome.findMany({
    where: {
      OR: [
        { etud1_id: { in: [...etudiantIds, userId] } },
        { etud2_id: { in: [...etudiantIds, userId] } },
      ],
      statut: { in: ['PENDING', 'ACCEPTED'] },
    },
    select: { id: true, etud1_id: true, etud2_id: true, statut: true },
  });

  return etudiants.map((e) => {
    // Relation directe entre le demandeur courant et cet étudiant
    const lien = relations.find(
      (b) =>
        (b.etud1_id === userId && b.etud2_id === e.id) ||
        (b.etud1_id === e.id && b.etud2_id === userId),
    );

    // L'étudiant a-t-il un binôme avec quelqu'un d'autre ?
    const autreLien = relations.find(
      (b) =>
        (b.etud1_id === e.id || b.etud2_id === e.id) &&
        b.etud1_id !== userId &&
        b.etud2_id !== userId,
    );

    return {
      ...e,
      has_binome: !!autreLien || lien?.statut === 'ACCEPTED',
      demande_pending: lien?.statut === 'PENDING' ? {
        id: lien.id,
        direction: lien.etud1_id === userId ? 'envoyee' : 'recue',
      } : null,
    };
  });
}
