import { prisma } from '../config/database';
import { notifyUser } from './notification.service';
import { NotFoundError, BadRequestError, ConflictError } from '../middleware/error.middleware';
import type { CreateSessionDto } from '../types';

export async function getSessions() {
  return prisma.session.findMany({ orderBy: { date_debut: 'desc' } });
}

export async function createSession(dto: CreateSessionDto) {
  if (dto.date_fin <= dto.date_debut) {
    throw new BadRequestError('La date de fin doit être postérieure à la date de début');
  }

  const overlap = await prisma.session.findFirst({
    where: {
      type: dto.type,
      annee_universitaire: dto.annee_universitaire,
      date_debut: { lte: dto.date_fin },
      date_fin: { gte: dto.date_debut },
    },
  });
  if (overlap) {
    throw new ConflictError(
      `Une session ${dto.type} existe déjà sur cette période pour ${dto.annee_universitaire}`,
    );
  }

  const now = new Date();
  if (dto.date_fin < now) {
    throw new BadRequestError('La date de fin est déjà passée. Impossible de créer une session expirée.');
  }

  const session = await prisma.session.create({ data: dto });

  const users = await prisma.user.findMany({
    where: { is_active: true },
    select: { id: true },
  });

  await Promise.all(
    users.map((u: { id: string }) =>
      notifyUser(
        u.id,
        'SESSION_UPDATE',
        `Nouvelle session ${dto.type} ouverte pour ${dto.annee_universitaire}`,
        { session_id: session.id, type: dto.type },
      ),
    ),
  );

  return session;
}

export async function updateSession(id: string, dto: Partial<CreateSessionDto> & { is_active?: boolean }) {
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) throw new NotFoundError('Session');

  const dateDebut = dto.date_debut ?? session.date_debut;
  const dateFin = dto.date_fin ?? session.date_fin;

  if (dateFin <= dateDebut) {
    throw new BadRequestError('La date de fin doit être postérieure à la date de début');
  }

  return prisma.session.update({ where: { id }, data: dto });
}

export async function closeSession(id: string) {
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) throw new NotFoundError('Session');

  if (!session.is_active) {
    throw new BadRequestError('Cette session est déjà clôturée');
  }

  const now = new Date();
  return prisma.session.update({
    where: { id },
    data: {
      is_active: false,
      date_fin: now < session.date_fin ? now : session.date_fin,
    },
  });
}
