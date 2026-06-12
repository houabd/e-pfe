import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { requireAdmin, requireRespFiliere } from '../middleware/rbac.middleware';
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
  limit: z.coerce.number().int().min(1).max(500).optional(),
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

// ─── Routes étudiant ──────────────────────────────────────────────────────────

router.get(
  '/mon-affectation',
  requireRole('ETUDIANT'),
  async (req, res, next) => {
    try {
      const affectation = await affectationService.getMonAffectation(req.user!.userId);
      res.json({ success: true, data: affectation });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/mes-invitations', requireRole('ETUDIANT'), async (req, res, next) => {
  try {
    const invitations = await affectationService.getMesInvitationsStartup(req.user!.userId);
    res.json({ success: true, data: invitations });
  } catch (err) { next(err); }
});

router.patch('/propositions/:propId/etudiant-accepter', requireRole('ETUDIANT'), async (req, res, next) => {
  try {
    const result = await affectationService.etudiantAccepteProposition(req.params['propId'] as string, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.patch('/propositions/:propId/etudiant-refuser', requireRole('ETUDIANT'), async (req, res, next) => {
  try {
    const result = await affectationService.etudiantRefuseProposition(req.params['propId'] as string, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Routes enseignant ────────────────────────────────────────────────────────

router.get(
  '/mes-etudiants',
  requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'),
  async (req, res, next) => {
    try {
      const etudiants = await affectationService.getMesEtudiants(req.user!.userId);
      res.json({ success: true, data: etudiants });
    } catch (err) {
      next(err);
    }
  },
);

const historiqueQuerySchema = z.object({
  annee_universitaire: z.string().optional(),
});

router.get(
  '/historique-encadrement',
  requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'),
  validate({ query: historiqueQuerySchema }),
  async (req, res, next) => {
    try {
      const { annee_universitaire } = req.query as { annee_universitaire?: string };
      const data = await affectationService.getHistoriqueEncadrement(req.user!.userId, annee_universitaire);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/historique-encadrement/export',
  requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'),
  validate({ query: historiqueQuerySchema }),
  async (req, res, next) => {
    try {
      const { annee_universitaire } = req.query as { annee_universitaire?: string };
      await affectationService.exportHistoriqueExcel(req.user!.userId, annee_universitaire, res);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/historique-encadrement/export-pdf',
  requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'),
  validate({ query: historiqueQuerySchema }),
  async (req, res, next) => {
    try {
      const { annee_universitaire } = req.query as { annee_universitaire?: string };
      await affectationService.exportHistoriquePDF(req.user!.userId, annee_universitaire, res);
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
  requireAdmin,
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

// PATCH /:id/theme — enseignant définit le thème d'une affectation sans thème
router.patch(
  '/:id/theme',
  requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'),
  validate({ body: z.object({ theme_id: z.string().min(1) }) }),
  async (req, res, next) => {
    try {
      const result = await affectationService.updateAffectationTheme(
        req.params['id'] as string,
        (req.body as { theme_id: string }).theme_id,
        req.user!.userId,
      );
      res.json({ success: true, data: result });
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

const addMembreExterneSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email(),
  specialite: z.string().optional(),
  universite: z.string().optional(),
  commentaire: z.string().optional(),
});

const propositionMembreSchema = z.object({
  candidat_interne_id: z.string().min(1).optional(),
  candidat_externe: z.object({
    nom: z.string().min(1),
    prenom: z.string().min(1),
    email: z.string().email(),
    specialite: z.string().optional(),
    universite: z.string().optional(),
    commentaire: z.string().optional(),
  }).optional(),
}).refine((d) => d.candidat_interne_id || d.candidat_externe, {
  message: 'Candidat interne ou externe requis',
});

router.post(
  '/startup',
  requireRespFiliere,
  validate({ body: createStartupAffectationSchema }),
  async (req, res, next) => {
    try {
      const affectation = await affectationService.createStartupAffectation(req.body, req.user!.userId);
      res.status(201).json({ success: true, data: affectation });
    } catch (err) { next(err); }
  },
);

router.post(
  '/startup/theme/:themeId/membres',
  requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'),
  validate({ body: addMembreSchema }),
  async (req, res, next) => {
    try {
      const { etudiant_id } = req.body as { etudiant_id: string };
      const result = await affectationService.addStartupMembreFromTheme(
        req.params['themeId'] as string,
        etudiant_id,
        req.user!.userId,
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },
);

router.get('/mes-startups', requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'), async (req, res, next) => {
  try {
    const startups = await affectationService.getMesStartups(req.user!.userId);
    res.json({ success: true, data: startups });
  } catch (err) { next(err); }
});

router.get('/:id/equipe', async (req, res, next) => {
  try {
    const equipe = await affectationService.getStartupEquipe(req.params['id'] as string);
    res.json({ success: true, data: equipe });
  } catch (err) { next(err); }
});

router.post(
  '/:id/equipe',
  requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT'),
  validate({ body: addMembreSchema }),
  async (req, res, next) => {
    try {
      const { etudiant_id, role_equipe } = req.body as { etudiant_id: string; role_equipe?: string };
      const membre = await affectationService.addStartupMembre(
        req.params['id'] as string, etudiant_id, req.user!.userId, role_equipe,
      );
      res.status(201).json({ success: true, data: membre });
    } catch (err) { next(err); }
  },
);

router.post(
  '/:id/equipe/externe',
  requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT'),
  validate({ body: addMembreExterneSchema }),
  async (req, res, next) => {
    try {
      const membre = await affectationService.addMembreExterne(
        req.params['id'] as string, req.body, req.user!.userId,
      );
      res.status(201).json({ success: true, data: membre });
    } catch (err) { next(err); }
  },
);

router.delete('/:id/equipe/:etudiantId', requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT'), async (req, res, next) => {
  try {
    await affectationService.removeStartupMembre(req.params['id'] as string, req.params['etudiantId'] as string);
    res.json({ success: true, message: "Membre retiré de l'équipe" });
  } catch (err) { next(err); }
});

// ─── Propositions de membres (étudiants → encadrant) ─────────────────────────

router.get('/:id/propositions', async (req, res, next) => {
  try {
    const propositions = await affectationService.getPropositions(req.params['id'] as string, req.user!.userId);
    res.json({ success: true, data: propositions });
  } catch (err) { next(err); }
});

router.post(
  '/:id/propositions',
  requireRole('ETUDIANT'),
  validate({ body: propositionMembreSchema }),
  async (req, res, next) => {
    try {
      const proposition = await affectationService.proposerMembre(
        req.params['id'] as string, req.body, req.user!.userId,
      );
      res.status(201).json({ success: true, data: proposition });
    } catch (err) { next(err); }
  },
);

router.patch('/:id/propositions/:propId/accepter', requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT'), async (req, res, next) => {
  try {
    const result = await affectationService.accepterProposition(req.params['propId'] as string, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.patch('/:id/propositions/:propId/refuser', requireRole('ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT'), async (req, res, next) => {
  try {
    const result = await affectationService.refuserProposition(req.params['propId'] as string, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default router;
