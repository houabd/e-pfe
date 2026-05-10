import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as searchService from '../services/search.service';

const router = Router();

const suggestionsSchema = z.object({ q: z.string().min(1).max(100) });

router.get('/suggestions', authenticate, validate({ query: suggestionsSchema }), async (req, res, next) => {
  try {
    const suggestions = await searchService.getSuggestions(req.query.q as string);
    res.json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
});

const searchSchema = z.object({
  q: z.string().min(2),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

router.get('/', authenticate, validate({ query: searchSchema }), async (req, res, next) => {
  try {
    const result = await searchService.globalSearch(req.query as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
