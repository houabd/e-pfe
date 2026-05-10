import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Ressource') {
    super(404, `${resource} introuvable`, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Non authentifié') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Accès refusé') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, 'BAD_REQUEST');
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Données invalides',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${err.statusCode}] ${err.message}`, { stack: err.stack });
    }
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? `Fichier trop volumineux (limite : ${process.env['UPLOAD_MAX_SIZE_MB'] ?? 50} Mo)`
      : err.message;
    res.status(400).json({ success: false, code: 'FILE_ERROR', message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        code: 'CONFLICT',
        message: 'Cette ressource existe déjà (contrainte d\'unicité)',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Ressource introuvable',
      });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        code: 'BAD_REQUEST',
        message: 'Référence invalide : une entité liée est introuvable',
      });
      return;
    }
    logger.error(`Prisma P${err.code}:`, { message: err.message, meta: err.meta });
    res.status(400).json({
      success: false,
      code: 'DB_ERROR',
      message: 'Erreur de base de données',
    });
    return;
  }

  logger.error('Erreur inattendue :', { message: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Une erreur interne est survenue',
  });
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.path} introuvable`,
  });
}
