import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSpecialites, createSpecialite, toggleSpecialite, deleteSpecialite } from '@/services/specialites.api';
import { extractApiError } from '@/services/api';

export function useSpecialites() {
  return useQuery({
    queryKey: ['specialites'],
    queryFn: getSpecialites,
    staleTime: 5 * 60 * 1000,
  });
}

/** Uniquement les spécialités actives — à utiliser dans tous les formulaires */
export function useActiveSpecialites() {
  const query = useSpecialites();
  return {
    ...query,
    data: query.data?.filter((s) => s.is_active) ?? [],
  };
}

export function useCreateSpecialite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSpecialite,
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['specialites'] });
      toast.success(`Spécialité "${s.nom}" créée`);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useToggleSpecialite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleSpecialite,
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['specialites'] });
      toast.success(s.is_active ? `"${s.nom}" activée` : `"${s.nom}" désactivée`);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useDeleteSpecialite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSpecialite,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['specialites'] });
      toast.success('Spécialité supprimée');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
