import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as notificationService from '../services/notification.service';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user!.userId);
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user!.userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
