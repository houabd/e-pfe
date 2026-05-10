import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as binomeService from '../services/binome.service';

const router = Router();

router.use(authenticate, requireRole('ETUDIANT'));

const demandeSchema = z.object({
  etudiant_id: z.string().min(1, 'ID étudiant requis'),
});

const rechercherSchema = z.object({
  search: z.string().optional(),
  specialite_id: z.string().optional(),
});

// ⚠️ Routes statiques déclarées avant les routes paramétrées /:id

// Rechercher des étudiants potentiels (par email / nom / filtre spécialité)
router.get('/rechercher', validate({ query: rechercherSchema }), async (req, res, next) => {
  try {
    const { search, specialite_id } = req.query as { search?: string; specialite_id?: string };
    const results = await binomeService.rechercherEtudiants(req.user!.userId, search, specialite_id);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// Récupérer le binôme actuel (ACCEPTED)
router.get('/mon-binome', async (req, res, next) => {
  try {
    const binome = await binomeService.getMonBinome(req.user!.userId);
    res.json({ success: true, data: binome });
  } catch (err) {
    next(err);
  }
});

// Demandes de binôme reçues (en attente de réponse)
router.get('/demandes-recues', async (req, res, next) => {
  try {
    const demandes = await binomeService.getDemandesRecues(req.user!.userId);
    res.json({ success: true, data: demandes });
  } catch (err) {
    next(err);
  }
});

// Demandes de binôme envoyées (en attente)
router.get('/demandes-envoyees', async (req, res, next) => {
  try {
    const demandes = await binomeService.getDemandesEnvoyees(req.user!.userId);
    res.json({ success: true, data: demandes });
  } catch (err) {
    next(err);
  }
});

// Envoyer une demande de binôme
router.post('/demande', validate({ body: demandeSchema }), async (req, res, next) => {
  try {
    const binome = await binomeService.demanderBinome(req.user!.userId, req.body.etudiant_id);
    res.status(201).json({ success: true, data: binome });
  } catch (err) {
    next(err);
  }
});

// Accepter une demande
router.patch('/:id/accept', async (req, res, next) => {
  try {
    const binome = await binomeService.acceptBinome(req.params['id'] as string, req.user!.userId);
    res.json({ success: true, data: binome });
  } catch (err) {
    next(err);
  }
});

// Refuser une demande
router.patch('/:id/refuse', async (req, res, next) => {
  try {
    const binome = await binomeService.refuseBinome(req.params['id'] as string, req.user!.userId);
    res.json({ success: true, data: binome });
  } catch (err) {
    next(err);
  }
});

export default router;
