import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { requireRespFiliere } from '../middleware/rbac.middleware';
import { requireActiveSession, checkNotAffecte } from '../middleware/session.middleware';
import { validate } from '../middleware/validation.middleware';
import * as themeService from '../services/theme.service';

const router = Router();

router.use(authenticate);

const createThemeSchema = z.object({
  titre: z.string().min(5),
  description: z.string().min(20),
  mots_cles: z.array(z.string()).default([]),
  necessite_stage: z.boolean().default(false),
  entreprise_stage: z.string().max(200).optional(),
  type_pfe: z.enum(['CLASSIQUE', 'STARTUP']),
  sous_types: z.array(z.enum(['RECHERCHE', 'PROFESSIONNEL', 'LES_DEUX'])).default([]),
  specialite_ids: z.array(z.string()).min(1),
  encadrant_id: z.string().optional(),
  co_encadrant_id: z.string().optional(),
  encadrant_externe: z.object({
    nom: z.string(),
    prenom: z.string(),
    email: z.string().email(),
    institution: z.string(),
  }).optional(),
  besoin_encadrant: z.boolean().default(false),
  cherche_binome: z.boolean().default(false),
});

const themeFiltersSchema = z.object({
  specialite_id: z.string().optional(),
  etudiant_specialite_id: z.string().optional(),
  etudiant_id: z.string().optional(),
  type_pfe: z.enum(['CLASSIQUE', 'STARTUP']).optional(),
  statut_validation: z.enum(['NON_VALIDE', 'VALIDE']).optional(),
  is_affecte: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  besoin_encadrant: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  include_open_startup: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  session_id: z.string().optional(),
  enseignant_id: z.string().optional(),
  annee_universitaire: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const validateActionSchema = z.object({
  action: z.enum(['VALIDE', 'REFUSE']),
  motif: z.string().min(1).optional(),
});

const createThemeAdminSchema = createThemeSchema.extend({
  propose_par_id: z.string().min(1, 'Enseignant requis'),
});

const demandeModifSchema = z.object({
  motif: z.string().min(10, 'Motif trop court (min 10 caractères)'),
});

const traiterDemandeSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REFUSED']),
  commentaire: z.string().optional(),
});

const demandesFiltersSchema = z.object({
  statut: z.enum(['PENDING', 'ACCEPTED', 'REFUSED']).optional(),
});

// ⚠️ Ces routes statiques doivent être déclarées AVANT /:id

// ─── Demandes de modification ─────────────────────────────────────────────────

router.get(
  '/demandes-modification',
  requireRespFiliere,
  validate({ query: demandesFiltersSchema }),
  async (req, res, next) => {
    try {
      const data = await themeService.getDemandesModification(req.query as never);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
);

router.patch(
  '/demandes-modification/:demandeId',
  requireRespFiliere,
  validate({ body: traiterDemandeSchema }),
  async (req, res, next) => {
    try {
      const { decision, commentaire } = req.body as { decision: 'ACCEPTED' | 'REFUSED'; commentaire?: string };
      const result = await themeService.traiterDemandeModification(
        req.params['demandeId'] as string, req.user!.userId, decision, commentaire,
      );
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },
);

// ─────────────────────────────────────────────────────────────────────────────

router.get('/export/:format', requireRespFiliere, validate({ query: themeFiltersSchema }), async (req, res, next) => {
  try {
    const q = req.query as Record<string, unknown>;
    const { page: _p, limit: _l, ...filters } = q;
    await themeService.exportThemes(
      req.params['format'] as 'excel' | 'pdf',
      filters as Parameters<typeof themeService.exportThemes>[1],
      res,
    );
  } catch (err) {
    next(err);
  }
});

router.get(
  '/awaiting-co-encadrant',
  requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'),
  async (req, res, next) => {
    try {
      const data = await themeService.getThemesAwaitingCoEncadrantConfirmation(req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
);

router.patch(
  '/:id/confirm-co-encadrant',
  requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'),
  async (req, res, next) => {
    try {
      const theme = await themeService.confirmCoEncadrant(req.params['id'] as string, req.user!.userId);
      res.json({ success: true, data: theme, message: 'Co-encadrement accepté' });
    } catch (err) { next(err); }
  },
);

router.patch(
  '/:id/refuse-co-encadrant',
  requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'),
  async (req, res, next) => {
    try {
      const theme = await themeService.refuseCoEncadrant(req.params['id'] as string, req.user!.userId);
      res.json({ success: true, data: theme, message: 'Co-encadrement refusé' });
    } catch (err) { next(err); }
  },
);

router.get('/awaiting-confirmation', requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'), async (req, res, next) => {
  try {
    const data = await themeService.getThemesAwaitingMyConfirmation(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/my', validate({ query: themeFiltersSchema }), async (req, res, next) => {
  try {
    const result = await themeService.getMyThemes(req.user!.userId, req.query as never);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/resp-filiere-info', async (_req, res, next) => {
  try {
    const data = await themeService.getRespFiliereInfo();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/', validate({ query: themeFiltersSchema }), async (req, res, next) => {
  try {
    const result = await themeService.getThemes(req.query as never);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole('ENSEIGNANT', 'ETUDIANT', 'CHEF_EQUIPE', 'CHEF_DEPT'),
  requireActiveSession('CHOIX'),
  checkNotAffecte,
  validate({ body: createThemeSchema }),
  async (req, res, next) => {
    try {
      const theme = await themeService.createTheme(req.body, req.user!);
      res.status(201).json({ success: true, data: theme });
    } catch (err) {
      next(err);
    }
  },
);

// Admin : créer un thème pour un enseignant donné (sans session active requise)
router.post(
  '/admin',
  requireRespFiliere,
  validate({ body: createThemeAdminSchema }),
  async (req, res, next) => {
    try {
      const { propose_par_id, ...dto } = req.body as { propose_par_id: string } & typeof req.body;
      const theme = await themeService.createThemeAsAdmin(dto, propose_par_id, req.user!);
      res.status(201).json({ success: true, data: theme });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id', async (req, res, next) => {
  try {
    const theme = await themeService.getThemeById(req.params['id'] as string);
    res.json({ success: true, data: theme });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/demandes-modification',
  requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'),
  validate({ body: demandeModifSchema }),
  async (req, res, next) => {
    try {
      const { motif } = req.body as { motif: string };
      const data = await themeService.demanderModification(req.params['id'] as string, req.user!.userId, motif);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  },
);

router.patch('/:id', validate({ body: createThemeSchema.partial() }), async (req, res, next) => {
  try {
    const theme = await themeService.updateTheme(req.params['id'] as string, req.body, req.user!);
    res.json({ success: true, data: theme });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRespFiliere, async (req, res, next) => {
  try {
    await themeService.deleteTheme(req.params['id'] as string);
    res.json({ success: true, message: 'Thème supprimé' });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id/postuler-encadrant',
  requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'),
  async (req, res, next) => {
    try {
      const theme = await themeService.postulerEncadrant(req.params['id'] as string, req.user!.userId);
      res.json({ success: true, data: theme, message: 'Vous êtes désormais l\'encadrant de ce thème' });
    } catch (err) { next(err); }
  },
);

router.patch(
  '/:id/confirm-encadrant',
  requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'),
  async (req, res, next) => {
    try {
      const theme = await themeService.confirmEncadrant(req.params['id'] as string, req.user!.userId);
      res.json({ success: true, data: theme, message: 'Supervision confirmée' });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/refuse-encadrant',
  requireRole('ENSEIGNANT', 'CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE'),
  async (req, res, next) => {
    try {
      const theme = await themeService.refuseEncadrant(req.params['id'] as string, req.user!.userId);
      res.json({ success: true, data: theme, message: 'Supervision refusée' });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/validate',
  requireRespFiliere,
  validate({ body: validateActionSchema }),
  async (req, res, next) => {
    try {
      const { action, motif } = req.body as { action: 'VALIDE' | 'REFUSE'; motif?: string };
      const theme = await themeService.validateTheme(req.params['id'] as string, action, motif);
      const msg = action === 'VALIDE' ? 'Thème validé' : 'Thème refusé';
      res.json({ success: true, data: theme, message: msg });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/soutenu',
  requireRole('TECHNICIEN', 'CHEF_DEPT'),
  validate({ body: z.object({ is_soutenu: z.boolean() }) }),
  async (req, res, next) => {
    try {
      const { is_soutenu } = req.body as { is_soutenu: boolean };
      const theme = await themeService.markAsSoutenu(req.params['id'] as string, is_soutenu);
      const msg = is_soutenu ? 'Thème marqué soutenu' : 'Statut soutenu annulé';
      res.json({ success: true, data: theme, message: msg });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
