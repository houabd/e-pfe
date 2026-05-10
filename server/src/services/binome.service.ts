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

  // Annuler toutes les autres demandes PENDING reçues par cet étudiant
  await prisma.binome.updateMany({
    where: {
      etud2_id: userId,
      statut: 'PENDING',
      id: { not: binomeId },
    },
    data: { statut: 'REFUSED' },
  });

  const updated = await prisma.binome.update({
    where: { id: binomeId },
    data: { statut: 'ACCEPTED' },
    include: {
      etud1: { select: ETUDIANT_SELECT },
      etud2: { select: ETUDIANT_SELECT },
    },
  });

  await notifyUser(
    binome.etud1_id,
    'BINOME_RESPONSE',
    `${updated.etud2.prenom} ${updated.etud2.nom} a accepté votre demande de binôme`,
    { binome_id: binomeId, statut: 'ACCEPTED' },
  );

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
