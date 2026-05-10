import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as sessionsApi from '@/services/sessions.api';
import { extractApiError } from '@/services/api';
import type { Session } from '@/types';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.getSessions,
  });
}

export function useActiveSession(): Session | undefined {
  const { data: sessions } = useSessions();
  const now = new Date();
  return sessions?.find(
    (s) => s.is_active && new Date(s.date_debut) <= now && new Date(s.date_fin) >= now,
  );
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.createSession,
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(`Session ${s.type} créée pour ${s.annee_universitaire}`);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: sessionsApi.UpdateSessionPayload }) =>
      sessionsApi.updateSession(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session mise à jour');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.closeSession,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session clôturée');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
