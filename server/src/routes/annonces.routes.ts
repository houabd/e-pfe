import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as themeService from '../services/theme.service';

const router = Router();

const annoncesFiltersSchema = z.object({
  specialite_id: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Annonces binôme — thèmes validés cherchant un binôme (étudiants)
router.get(
  '/',
  authenticate,
  requireRole('ETUDIANT'),
  validate({ query: annoncesFiltersSchema }),
  async (req, res, next) => {
    try {
      const result = await themeService.getThemesCherchandBinome(req.query as never);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
);

// Annonces encadrement — thèmes validés cherchant un encadrant (enseignants)
router.get(
  '/encadrement',
  authenticate,
  requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'),
  validate({ query: annoncesFiltersSchema }),
  async (req, res, next) => {
    try {
      const result = await themeService.getThemesNeedingEncadrant(req.query as never);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
