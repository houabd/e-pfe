import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { requireStaff } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import * as statsService from '../services/stats.service';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const baseFilters = z.object({
  specialite_id: z.string().optional(),
});

const enseignantFiltersSchema = baseFilters.extend({
  categorie: z.enum(['all', 'SURCHARGE', 'SOUS_CHARGE', 'SANS_PROPOSITION', 'NORMAL']).optional(),
});

const themeFiltersSchema = baseFilters.extend({
  type_pfe: z.enum(['CLASSIQUE', 'STARTUP']).optional(),
  statut: z.enum(['VALIDE', 'NON_VALIDE']).optional(),
});

const etudiantFiltersSchema = baseFilters.extend({
  statut: z.enum(['avec_theme', 'sans_theme', 'avec_binome', 'sans_binome', 'avec_proposition']).optional(),
});

const exportSchema = baseFilters.extend({
  categorie: z.enum(['all', 'SURCHARGE', 'SOUS_CHARGE', 'SANS_PROPOSITION', 'NORMAL']).optional(),
  type_pfe: z.enum(['CLASSIQUE', 'STARTUP']).optional(),
  statut: z.string().optional(),
});

// ─── Route enseignant (dashboard personnel) ───────────────────────────────────

router.get(
  '/enseignant',
  authenticate,
  requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT'),
  async (req, res, next) => {
    try {
      const stats = await statsService.getEnseignantStats(req.user!.userId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Toutes les routes suivantes nécessitent un rôle staff ────────────────────

router.use(authenticate, requireStaff);

// GET /stats/global
router.get('/global', async (_req, res, next) => {
  try {
    const stats = await statsService.getGlobalStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /stats/enseignants?specialite_id=&categorie=
router.get('/enseignants', validate({ query: enseignantFiltersSchema }), async (req, res, next) => {
  try {
    const stats = await statsService.getEnseignantsStats(req.query as never);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /stats/themes?specialite_id=&type_pfe=&statut=
router.get('/themes', validate({ query: themeFiltersSchema }), async (req, res, next) => {
  try {
    const stats = await statsService.getThemesStats(req.query as never);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /stats/etudiants?specialite_id=&statut=
router.get('/etudiants', validate({ query: etudiantFiltersSchema }), async (req, res, next) => {
  try {
    const stats = await statsService.getEtudiantsStats(req.query as never);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /stats/export/:section/:format?...filters
router.get(
  '/export/:section/:format',
  validate({
    params: z.object({ section: z.enum(['enseignants', 'etudiants']), format: z.enum(['excel', 'pdf']) }),
    query: exportSchema,
  }),
  async (req, res, next) => {
    try {
      await statsService.exportStats(
        String(req.params.section),
        String(req.params.format) as 'excel' | 'pdf',
        req.query as never,
        res,
      );
    } catch (err) {
      next(err);
    }
  },
);

export default router;
