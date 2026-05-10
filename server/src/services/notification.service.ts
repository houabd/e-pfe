import { prisma } from '../config/database';
import { emitToUser } from '../config/socket';
import { type TypeNotification, Prisma } from '@prisma/client';

export async function notifyUser(
  userId: string,
  type: TypeNotification,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const notification = await prisma.notification.create({
    data: { user_id: userId, type, message, metadata: metadata as Prisma.InputJsonValue | undefined },
  });

  emitToUser(userId, 'notification', {
    id: notification.id,
    type,
    message,
    metadata,
    created_at: notification.created_at,
  });

  return notification;
}

export async function getUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, user_id: userId },
    data: { is_read: true },
  });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });
}
