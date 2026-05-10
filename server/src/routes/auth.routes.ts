import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import * as authService from '../services/auth.service';
import type { ApiResponse, AuthTokens } from '../types';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

router.post('/login', validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    const response: ApiResponse<AuthTokens & { user: unknown }> = { success: true, data: result };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validate({ body: refreshSchema }), async (req, res, next) => {
  try {
    const tokens = await authService.refreshTokens(req.body.refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), async (req, res, next) => {
  try {
    await authService.changePassword(req.user!.userId, req.body);
    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    next(err);
  }
});

export default router;
