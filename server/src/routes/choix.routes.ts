import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { requireActiveSession, checkNotAffecte } from '../middleware/session.middleware';
import { validate } from '../middleware/validation.middleware';
import * as choixService from '../services/choix.service';

const router = Router();

router.use(authenticate);

const createChoixSchema = z.object({
  theme_id: z.string().min(1, 'ID thème requis'),
  ordre: z.number().int().min(1).max(3, 'L\'ordre doit être entre 1 et 3'),
});

// ⚠️ Routes statiques avant les routes paramétrées /:id

// GET /choix/mes-choix — choix de l'étudiant (communs au binôme si binôme actif)
router.get('/mes-choix', requireRole('ETUDIANT'), async (req, res, next) => {
  try {
    const result = await choixService.getMesChoix(req.user!.userId);
    res.json({ success: true, data: result.choix, meta: { peutRechoisir: result.peutRechoisir } });
  } catch (err) {
    next(err);
  }
});

// GET /choix/enseignant — demandes en attente pour un enseignant (tous les rôles enseignants)
router.get('/enseignant', requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'), async (req, res, next) => {
  try {
    const demandes = await choixService.getDemandesEnseignant(req.user!.userId);
    res.json({ success: true, data: demandes });
  } catch (err) {
    next(err);
  }
});

// POST /choix — soumettre un choix (session CHOIX requise)
router.post(
  '/',
  requireRole('ETUDIANT'),
  requireActiveSession('CHOIX'),
  checkNotAffecte,
  validate({ body: createChoixSchema }),
  async (req, res, next) => {
    try {
      const choix = await choixService.createChoix(req.body, req.user!.userId);
      res.status(201).json({ success: true, data: choix });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /choix/:id/accept — enseignant accepte → affectation automatique
router.patch('/:id/accept', requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'), async (req, res, next) => {
  try {
    const result = await choixService.acceptChoix(req.params['id'] as string, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /choix/:id/refuse — enseignant refuse (retourne tousRefuses pour info)
router.patch('/:id/refuse', requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'), async (req, res, next) => {
  try {
    const result = await choixService.refuseChoix(req.params['id'] as string, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
