import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getMesChoix, submitChoix, getDemandesEnseignant, acceptChoix, refuseChoix } from '@/services/choix.api';
import { extractApiError } from '@/services/api';

export function useMesChoix() {
  return useQuery({
    queryKey: ['mes-choix'],
    queryFn: getMesChoix,
  });
}

export function useSubmitChoix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitChoix,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mes-choix'] });
      void qc.invalidateQueries({ queryKey: ['themes'] });
      void qc.invalidateQueries({ queryKey: ['demandes-enseignant'] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useDemandesEnseignant(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['demandes-enseignant'],
    queryFn: getDemandesEnseignant,
    enabled: options?.enabled ?? true,
  });
}

export function useAcceptChoix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptChoix,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['demandes-enseignant'] });
      void qc.invalidateQueries({ queryKey: ['themes'] });
      void qc.invalidateQueries({ queryKey: ['stats', 'enseignant'] });
      void qc.invalidateQueries({ queryKey: ['mes-etudiants'] });
      toast.success('Choix accepté — affectation confirmée');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useRefuseChoix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: refuseChoix,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['demandes-enseignant'] });
      void qc.invalidateQueries({ queryKey: ['stats', 'enseignant'] });
      toast.success('Choix refusé');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
