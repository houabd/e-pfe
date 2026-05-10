import { prisma } from '../config/database';
import { ConflictError, NotFoundError, BadRequestError } from '../middleware/error.middleware';

const WITH_COUNTS = {
  _count: { select: { users: true, theme_specialites: true } },
} as const;

function mapSpecialite(s: {
  id: string;
  nom: string;
  is_active: boolean;
  created_at: Date;
  _count: { users: number; theme_specialites: number };
}) {
  return {
    id: s.id,
    nom: s.nom,
    is_active: s.is_active,
    created_at: s.created_at,
    nb_utilisateurs: s._count.users,
    nb_themes: s._count.theme_specialites,
  };
}

export async function getSpecialites() {
  const rows = await prisma.specialite.findMany({
    orderBy: [{ is_active: 'desc' }, { nom: 'asc' }],
    include: WITH_COUNTS,
  });
  return rows.map(mapSpecialite);
}

export async function createSpecialite(nom: string) {
  const trimmed = nom.trim();
  const exists = await prisma.specialite.findUnique({ where: { nom: trimmed } });
  if (exists) throw new ConflictError('Cette spécialité existe déjà');

  const specialite = await prisma.specialite.create({
    data: { nom: trimmed },
    include: WITH_COUNTS,
  });
  return mapSpecialite(specialite);
}

export async function toggleSpecialite(id: string) {
  const spec = await prisma.specialite.findUnique({ where: { id } });
  if (!spec) throw new NotFoundError('Spécialité');

  const updated = await prisma.specialite.update({
    where: { id },
    data: { is_active: !spec.is_active },
    include: WITH_COUNTS,
  });
  return mapSpecialite(updated);
}

export async function deleteSpecialite(id: string) {
  const spec = await prisma.specialite.findUnique({
    where: { id },
    include: { _count: { select: { users: true, theme_specialites: true } } },
  });

  if (!spec) throw new NotFoundError('Spécialité');

  if (spec._count.users > 0) {
    throw new BadRequestError(
      `Impossible de supprimer : ${spec._count.users} utilisateur(s) sont rattachés à cette spécialité.`,
    );
  }

  if (spec._count.theme_specialites > 0) {
    throw new BadRequestError(
      `Impossible de supprimer : ${spec._count.theme_specialites} thème(s) sont associés à cette spécialité.`,
    );
  }

  await prisma.specialite.delete({ where: { id } });
}
