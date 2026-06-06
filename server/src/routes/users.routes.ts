import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { requireTechnicien, requireChefDept } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import * as userService from '../services/user.service';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.use(authenticate);

const createUserSchema = z.object({
  email: z.string().email(),
  nom: z.string().min(2),
  prenom: z.string().min(2),
  role: z.enum(['CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE', 'TECHNICIEN', 'ENSEIGNANT', 'ETUDIANT']),
  specialite_id: z.string().optional(),
  date_naissance: z.coerce.date(),
  matricule: z.string().optional(),
  annee_universitaire: z.string().optional(),
});

const userFiltersSchema = z.object({
  role: z.enum(['CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE', 'TECHNICIEN', 'ENSEIGNANT', 'ETUDIANT']).optional(),
  specialite_id: z.string().optional(),
  is_active: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
});

router.get('/', validate({ query: userFiltersSchema }), async (req, res, next) => {
  try {
    const result = await userService.getUsers(req.query as never);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireTechnicien, validate({ body: createUserSchema }), async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.post('/import', requireTechnicien, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Fichier Excel requis (.xlsx)' });
      return;
    }
    const result = await userService.importUsers(req.file.buffer);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

const updateUserSchema = z.object({
  nom: z.string().min(2).optional(),
  prenom: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_SPECIALITE', 'TECHNICIEN', 'ENSEIGNANT', 'ETUDIANT']).optional(),
  specialite_id: z.string().nullable().optional(),
  matricule: z.string().nullable().optional(),
  annee_universitaire: z.string().nullable().optional(),
  date_naissance: z.coerce.date().optional(),
});

router.patch('/:id', requireTechnicien, validate({ body: updateUserSchema }), async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params['id'] as string, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/toggle-active', requireTechnicien, async (req, res, next) => {
  try {
    const user = await userService.toggleUserActive(req.params['id'] as string);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reset-password', requireTechnicien, async (req, res, next) => {
  try {
    const result = await userService.resetUserPassword(req.params['id'] as string);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/bulk-delete', requireChefDept, async (req, res, next) => {
  try {
    const schema = z.object({
      ids: z.array(z.string()).min(1),
      permanent: z.boolean().default(false),
    });
    const { ids, permanent } = schema.parse(req.body);
    const result = permanent
      ? await userService.bulkHardDeleteUsers(ids)
      : await userService.bulkDeleteUsers(ids);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/hard', requireChefDept, async (req, res, next) => {
  try {
    await userService.hardDeleteUser(req.params['id'] as string);
    res.json({ success: true, message: 'Utilisateur supprimé définitivement' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireChefDept, async (req, res, next) => {
  try {
    await userService.deleteUser(req.params['id'] as string);
    res.json({ success: true, message: 'Utilisateur désactivé' });
  } catch (err) {
    next(err);
  }
});

router.get('/export/:format', async (req, res, next) => {
  try {
    await userService.exportUsers(req.params['format'] as string as 'excel' | 'pdf', req.query as never, res);
  } catch (err) {
    next(err);
  }
});

export default router;
