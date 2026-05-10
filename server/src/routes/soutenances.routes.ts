import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { requireManagement } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import * as soutenanceService from '../services/soutenance.service';

const router = Router();

router.use(authenticate);

const createSoutenanceSchema = z.object({
  theme_id: z.string(),
  date_soutenance: z.coerce.date(),
  heure: z.string().regex(/^\d{2}:\d{2}$/),
  salle: z.string().min(1),
  annee_universitaire: z.string(),
  jury: z.array(z.object({
    enseignant_id: z.string(),
    role: z.enum(['PRESIDENT', 'EXAMINATEUR']),
  })).min(1).max(4),
});

const soutenanceFiltersSchema = z.object({
  annee_universitaire: z.string().optional(),
  specialite_id: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(20),
});

const enseignantsDisponiblesSchema = z.object({
  date: z.string().optional(),
  heure: z.string().optional(),
  theme_id: z.string().optional(),
});

// ⚠️ Static routes must come before dynamic /:id

const exportFiltersSchema = soutenanceFiltersSchema.pick({
  annee_universitaire: true,
  specialite_id: true,
});

router.get(
  '/export-pdf',
  validate({ query: exportFiltersSchema }),
  async (req, res, next) => {
    try {
      await soutenanceService.exportPDF(req.query as never, res);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/export-excel',
  validate({ query: exportFiltersSchema }),
  async (req, res, next) => {
    try {
      await soutenanceService.exportExcel(req.query as never, res);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/enseignants-disponibles',
  requireManagement,
  validate({ query: enseignantsDisponiblesSchema }),
  async (req, res, next) => {
    try {
      const enseignants = await soutenanceService.getEnseignantsDisponibles(req.query as never);
      res.json({ success: true, data: enseignants });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/', validate({ query: soutenanceFiltersSchema }), async (req, res, next) => {
  try {
    const result = await soutenanceService.getSoutenances(req.query as never);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireManagement, validate({ body: createSoutenanceSchema }), async (req, res, next) => {
  try {
    const soutenance = await soutenanceService.createSoutenance(req.body);
    res.status(201).json({ success: true, data: soutenance });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const soutenance = await soutenanceService.getSoutenanceById(req.params['id'] as string);
    res.json({ success: true, data: soutenance });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireManagement, validate({ body: createSoutenanceSchema.partial() }), async (req, res, next) => {
  try {
    const soutenance = await soutenanceService.updateSoutenance(req.params['id'] as string, req.body);
    res.json({ success: true, data: soutenance });
  } catch (err) {
    next(err);
  }
});

export default router;
