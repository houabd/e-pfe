import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BadRequestError, ForbiddenError } from './error.middleware';
import type { SessionType } from '@prisma/client';

export function requireActiveSession(type?: SessionType) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const now = new Date();
      const session = await prisma.session.findFirst({
        where: {
          is_active: true,
          ...(type ? { type } : {}),
          date_debut: { lte: now },
          date_fin: { gte: now },
        },
      });

      if (!session) {
        const label = type === 'CHOIX'
          ? 'La période de choix de thèmes'
          : type === 'AFFECTATION'
            ? 'La période d\'affectation'
            : 'Aucune session';
        return next(new BadRequestError(`${label} n'est pas ouverte actuellement`));
      }

      req.activeSession = session;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── Vérification "non affecté" ───────────────────────────────────────────────

export async function checkNotAffecte(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.role !== 'ETUDIANT') {
      return next();
    }
    const etudiantId = req.user.userId;
    const [affectation, startup] = await Promise.all([
      prisma.affectationEtudiant.findFirst({ where: { etudiant_id: etudiantId }, select: { id: true } }),
      prisma.startupMembre.findFirst({ where: { etudiant_id: etudiantId }, select: { id: true } }),
    ]);
    console.log(`[checkNotAffecte] etudiantId=${etudiantId} affectation=${affectation?.id ?? 'null'} startup=${startup?.id ?? 'null'}`);
    if (affectation || startup) {
      return next(new ForbiddenError(
        'Vous avez déjà un thème affecté. Vous ne pouvez plus proposer ni choisir de thème.',
      ));
    }
    next();
  } catch (err) {
    next(err);
  }
}

declare global {
  namespace Express {
    interface Request {
      activeSession?: import('@prisma/client').Session;
    }
  }
}
