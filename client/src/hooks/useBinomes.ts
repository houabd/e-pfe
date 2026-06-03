import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getMonBinome,
  getDemandesRecues,
  getDemandesEnvoyees,
  rechercherEtudiants,
  demanderBinome,
  acceptBinome,
  refuseBinome,
} from '@/services/binomes.api';
import { extractApiError } from '@/services/api';

export function useMonBinome() {
  return useQuery({
    queryKey: ['mon-binome'],
    queryFn: getMonBinome,
  });
}

export function useDemandesRecues() {
  return useQuery({
    queryKey: ['demandes-recues'],
    queryFn: getDemandesRecues,
  });
}

export function useDemandesEnvoyees() {
  return useQuery({
    queryKey: ['demandes-envoyees'],
    queryFn: getDemandesEnvoyees,
  });
}

export function useRechercherEtudiants(
  search: string,
  specialiteIds: string[],
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['etudiants-recherche', search, specialiteIds],
    queryFn: () => rechercherEtudiants(search || undefined, specialiteIds[0]),
    enabled,
    staleTime: 30_000,
  });
}

export function useDemanderBinome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: demanderBinome,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['etudiants-recherche'] });
      void qc.invalidateQueries({ queryKey: ['demandes-envoyees'] });
      toast.success('Demande de binôme envoyée');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useAcceptBinome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptBinome,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mon-binome'] });
      void qc.invalidateQueries({ queryKey: ['demandes-recues'] });
      // Le partenaire peut avoir été affecté automatiquement suite à la formation du binôme
      void qc.invalidateQueries({ queryKey: ['mon-affectation'] });
      void qc.invalidateQueries({ queryKey: ['mes-choix'] });
      toast.success('Binôme accepté !');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useRefuseBinome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: refuseBinome,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['demandes-recues'] });
      toast.success('Demande refusée');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
