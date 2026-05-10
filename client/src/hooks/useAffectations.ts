import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as affApi from '@/services/affectations.api';
import { extractApiError } from '@/services/api';

export function useMesEtudiants() {
  return useQuery({
    queryKey: ['mes-etudiants'],
    queryFn: affApi.getMesEtudiants,
  });
}

export function useEnseignantsDispo(specialite_id?: string) {
  return useQuery({
    queryKey: ['enseignants-dispo', specialite_id],
    queryFn: () => affApi.getEnseignantsDispo(specialite_id),
    staleTime: 30 * 1000,
  });
}

export function useEtudiantsSansTheme(specialite_id?: string) {
  return useQuery({
    queryKey: ['etudiants-sans-theme', specialite_id],
    queryFn: () => affApi.getEtudiantsSansTheme(specialite_id),
    staleTime: 30 * 1000,
  });
}

export function useAffectations(filters?: { specialite_id?: string; session_id?: string }) {
  return useQuery({
    queryKey: ['affectations', filters],
    queryFn: () => affApi.getAffectations(filters),
    staleTime: 30 * 1000,
  });
}

export function useCreateAffectation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: affApi.createAffectation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['enseignants-dispo'] });
      void qc.invalidateQueries({ queryKey: ['etudiants-sans-theme'] });
      void qc.invalidateQueries({ queryKey: ['affectations'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Affectation créée — notifications envoyées');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useCreateStartupAffectation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: affApi.createStartupAffectation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['enseignants-dispo'] });
      void qc.invalidateQueries({ queryKey: ['etudiants-sans-theme'] });
      void qc.invalidateQueries({ queryKey: ['affectations'] });
      toast.success('Équipe startup affectée — notifications envoyées');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useAffectationAutoPreview() {
  return useMutation({
    mutationFn: affApi.getAffectationAutoPreview,
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useConfirmerAffectationsAuto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: affApi.confirmerAffectationsAuto,
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['enseignants-dispo'] });
      void qc.invalidateQueries({ queryKey: ['etudiants-sans-theme'] });
      void qc.invalidateQueries({ queryKey: ['affectations'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      const msg = result.errors.length > 0
        ? `${result.created}/${result.total} affectations créées (${result.errors.length} erreur(s))`
        : `${result.created} affectation(s) confirmée(s)`;
      toast.success(msg);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
