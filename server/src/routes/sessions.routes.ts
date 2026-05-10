import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { requireChefDept } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import * as sessionService from '../services/session.service';

const router = Router();

router.use(authenticate);

const createSessionSchema = z.object({
  type: z.enum(['CHOIX', 'AFFECTATION']),
  date_debut: z.coerce.date(),
  date_fin: z.coerce.date(),
  annee_universitaire: z.string().regex(/^\d{4}-\d{4}$/, 'Format requis : AAAA-AAAA'),
});

const updateSessionSchema = createSessionSchema
  .partial()
  .extend({ is_active: z.boolean().optional() });

router.get('/', async (_req, res, next) => {
  try {
    const sessions = await sessionService.getSessions();
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireChefDept, validate({ body: createSessionSchema }), async (req, res, next) => {
  try {
    const session = await sessionService.createSession(req.body);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireChefDept, validate({ body: updateSessionSchema }), async (req, res, next) => {
  try {
    const session = await sessionService.updateSession(req.params['id'] as string, req.body);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/close', requireChefDept, async (req, res, next) => {
  try {
    const session = await sessionService.closeSession(req.params['id'] as string);
    res.json({ success: true, data: session, message: 'Session clôturée' });
  } catch (err) {
    next(err);
  }
});

export default router;
