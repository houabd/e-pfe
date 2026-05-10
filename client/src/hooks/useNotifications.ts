import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';
import * as notifApi from '@/services/notifications.api';
import { extractApiError } from '@/services/api';
import { toast } from 'sonner';
import { io, type Socket } from 'socket.io-client';
import type { Notification } from '@/types';

let socket: Socket | null = null;

export function useNotifications() {
  const { setNotifications, addNotification } = useNotificationStore();
  const { accessToken, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: notifApi.getNotifications,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (data) setNotifications(data);
  }, [data, setNotifications]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Évite les connexions multiples si le hook est monté ailleurs
    if (socket?.connected) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';
    socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('notification', (notif: Notification) => {
      addNotification(notif);
      toast.info(notif.message, { duration: 5000 });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket.io connexion échouée :', err.message);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [isAuthenticated, accessToken, addNotification, qc]);

  return { ...useNotificationStore(), refetch, isFetching };
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  const { markRead } = useNotificationStore();

  return useMutation({
    mutationFn: (id: string) => notifApi.markAsRead(id),
    onSuccess: (_data, id) => {
      markRead(id);
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { markAllRead } = useNotificationStore();

  return useMutation({
    mutationFn: notifApi.markAllAsRead,
    onSuccess: () => {
      markAllRead();
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
