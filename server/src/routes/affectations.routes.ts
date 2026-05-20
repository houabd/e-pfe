import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { requireRespFiliere } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import * as affectationService from '../services/affectation.service';

const router = Router();

router.use(authenticate);

// ─── Schémas Zod ─────────────────────────────────────────────────────────────

const specialiteQuerySchema = z.object({
  specialite_id: z.string().optional(),
});

const paginatedQuerySchema = z.object({
  session_id: z.string().optional(),
  specialite_id: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createAffectationSchema = z.object({
  theme_id: z.string().min(1).optional(), // optionnel — enseignant définit le thème plus tard
  encadrant_id: z.string().min(1),
  etudiant_ids: z.array(z.string().min(1)).min(1).max(2),
  binome_id: z.string().optional(),
});

const suggestionItemSchema = z.object({
  theme_id: z.string().min(1),
  encadrant_id: z.string().min(1),
  etudiant_ids: z.array(z.string().min(1)).min(1).max(2),
  binome_id: z.string().optional(),
});

const confirmerAutoSchema = z.object({
  suggestions: z.array(suggestionItemSchema).min(1),
});

// ─── Routes enseignant ────────────────────────────────────────────────────────

router.get(
  '/mes-etudiants',
  requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT'),
  async (req, res, next) => {
    try {
      const etudiants = await affectationService.getMesEtudiants(req.user!.userId);
      res.json({ success: true, data: etudiants });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Routes admin (CHEF_EQUIPE / chef_dept) ──────────────────────────────────

router.get(
  '/enseignants-dispo',
  requireRespFiliere,
  validate({ query: specialiteQuerySchema }),
  async (req, res, next) => {
    try {
      const enseignants = await affectationService.getEnseignantsDisponibles(req.query as never);
      res.json({ success: true, data: enseignants });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/etudiants-sans-theme',
  requireRespFiliere,
  validate({ query: specialiteQuerySchema }),
  async (req, res, next) => {
    try {
      const etudiants = await affectationService.getEtudiantsSansTheme(req.query as never);
      res.json({ success: true, data: etudiants });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/',
  requireRespFiliere,
  validate({ query: paginatedQuerySchema }),
  async (req, res, next) => {
    try {
      const result = await affectationService.getAffectations(req.query as never);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requireRespFiliere,
  validate({ body: createAffectationSchema }),
  async (req, res, next) => {
    try {
      const affectation = await affectationService.createAffectation(req.body, req.user!.userId);
      res.status(201).json({ success: true, data: affectation });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auto — aperçu des suggestions (aucune écriture BD)
router.post('/auto', requireRespFiliere, async (_req, res, next) => {
  try {
    const result = await affectationService.affectationAutomatique();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /auto/confirmer — persiste les suggestions sélectionnées
router.post(
  '/auto/confirmer',
  requireRespFiliere,
  validate({ body: confirmerAutoSchema }),
  async (req, res, next) => {
    try {
      const result = await affectationService.confirmerAffectationsAuto(
        req.body,
        req.user!.userId,
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Routes STARTUP ───────────────────────────────────────────────────────────

const createStartupAffectationSchema = z.object({
  theme_id: z.string().min(1),
  etudiant_ids: z.array(z.string().min(1)).min(1).max(6),
  role_equipes: z.record(z.string(), z.string()).optional(),
});

const addMembreSchema = z.object({
  etudiant_id: z.string().min(1),
  role_equipe: z.string().optional(),
});

router.post(
  '/startup',
  requireRespFiliere,
  validate({ body: createStartupAffectationSchema }),
  async (req, res, next) => {
    try {
      const affectation = await affectationService.createStartupAffectation(
        req.body,
        req.user!.userId,
      );
      res.status(201).json({ success: true, data: affectation });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id/equipe', async (req, res, next) => {
  try {
    const equipe = await affectationService.getStartupEquipe(req.params['id'] as string);
    res.json({ success: true, data: equipe });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/equipe',
  requireRespFiliere,
  validate({ body: addMembreSchema }),
  async (req, res, next) => {
    try {
      const { etudiant_id, role_equipe } = req.body as { etudiant_id: string; role_equipe?: string };
      const membre = await affectationService.addStartupMembre(
        req.params['id'] as string,
        etudiant_id,
        role_equipe,
      );
      res.status(201).json({ success: true, data: membre });
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/:id/equipe/:etudiantId', requireRespFiliere, async (req, res, next) => {
  try {
    await affectationService.removeStartupMembre(
      req.params['id'] as string,
      req.params['etudiantId'] as string,
    );
    res.json({ success: true, message: 'Membre retiré de l\'équipe' });
  } catch (err) {
    next(err);
  }
});

export default router;
