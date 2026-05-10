import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BadRequestError } from './error.middleware';
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

declare global {
  namespace Express {
    interface Request {
      activeSession?: import('@prisma/client').Session;
    }
  }
}
