import { api } from './api';
import type { Notification, ApiResponse } from '@/types';

export async function getNotifications() {
  const { data } = await api.get<ApiResponse<Notification[]>>('/notifications');
  return data.data ?? [];
}

export async function markAsRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead() {
  await api.patch('/notifications/read-all');
}
