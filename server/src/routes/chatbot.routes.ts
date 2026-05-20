import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { env } from '../config/env';
import * as chatbotService from '../services/chatbot.service';
import { UPLOADS_DIR, ensureUploadsDir } from '../services/chatbot.service';

const router = Router();

ensureUploadsDir();

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés'));
    }
  },
});

// POST /chatbot/ask-stream — accessible sans authentification (visiteurs inclus)
router.post('/ask-stream', async (req, res, next) => {
  try {
    const question = (req.body?.question ?? '').toString().trim();
    if (!question) {
      res.status(400).json({ success: false, message: 'question manquante' });
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    await chatbotService.proxyAskStream(question, res);
  } catch (err) {
    next(err);
  }
});

// Routes admin — authentification requise
router.use(authenticate);

// GET /chatbot/documents
router.get('/documents', requireRole('CHEF_DEPT', 'CHEF_EQUIPE'), async (_req, res, next) => {
  try {
    const docs = await chatbotService.getDocuments();
    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
});

// POST /chatbot/documents — upload PDF
router.post(
  '/documents',
  requireRole('CHEF_DEPT', 'CHEF_EQUIPE'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Fichier PDF requis' });
        return;
      }
      const result = await chatbotService.uploadDocument(req.file, req.user!.userId);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /chatbot/documents/:id
router.delete('/documents/:id', requireRole('CHEF_DEPT', 'CHEF_EQUIPE'), async (req, res, next) => {
  try {
    await chatbotService.deleteDocument(req.params['id'] as string);
    res.json({ success: true, message: 'Document supprimé' });
  } catch (err) {
    next(err);
  }
});

export default router;
