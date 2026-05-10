import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { requireChefDept } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import * as specialiteService from '../services/specialite.service';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const specialites = await specialiteService.getSpecialites();
    res.json({ success: true, data: specialites });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireChefDept, validate({ body: z.object({ nom: z.string().min(2) }) }), async (req, res, next) => {
  try {
    const specialite = await specialiteService.createSpecialite(req.body.nom);
    res.status(201).json({ success: true, data: specialite });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/toggle', authenticate, requireChefDept, async (req, res, next) => {
  try {
    const specialite = await specialiteService.toggleSpecialite(req.params['id'] as string);
    res.json({ success: true, data: specialite });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireChefDept, async (req, res, next) => {
  try {
    await specialiteService.deleteSpecialite(req.params['id'] as string);
    res.json({ success: true, message: 'Spécialité supprimée' });
  } catch (err) {
    next(err);
  }
});

export default router;
