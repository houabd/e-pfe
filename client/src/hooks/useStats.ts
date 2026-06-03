import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getGlobalStats, getEnseignantsStats, getEtudiantsStats, getThemesStats,
  getEnseignantStats, exportStatsSection,
} from '@/services/stats.api';
import type { EnseignantFilters, EtudiantFilters, ThemeFilters } from '@/services/stats.api';
import { getMesEtudiants } from '@/services/affectations.api';
import { getDemandesEnseignant, acceptChoix, refuseChoix } from '@/services/choix.api';
import { extractApiError } from '@/services/api';

// ─── Hooks admin / staff ──────────────────────────────────────────────────────

export function useGlobalStats() {
  return useQuery({
    queryKey: ['stats', 'global'],
    queryFn: getGlobalStats,
    staleTime: 60_000,
  });
}

export function useEnseignantsStatsAdmin(filters?: EnseignantFilters) {
  return useQuery({
    queryKey: ['stats', 'enseignants', filters],
    queryFn: () => getEnseignantsStats(filters),
    staleTime: 60_000,
  });
}

export function useEtudiantsStatsAdmin(filters?: EtudiantFilters) {
  return useQuery({
    queryKey: ['stats', 'etudiants', filters],
    queryFn: () => getEtudiantsStats(filters),
    staleTime: 60_000,
  });
}

export function useThemesStats(filters?: ThemeFilters) {
  return useQuery({
    queryKey: ['stats', 'themes', filters],
    queryFn: () => getThemesStats(filters),
    staleTime: 60_000,
  });
}

// ─── Export hook ──────────────────────────────────────────────────────────────

export function useExportStats() {
  const [isExporting, setIsExporting] = useState(false);

  const exportSection = async (
    section: 'enseignants' | 'etudiants',
    format: 'excel' | 'pdf',
    filters?: Record<string, string | undefined>,
  ) => {
    setIsExporting(true);
    try {
      const blob = await exportStatsSection(section, format, filters);
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stats_${section}_${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(extractApiError(e));
    } finally {
      setIsExporting(false);
    }
  };

  return { exportSection, isExporting };
}

// ─── Hook enseignant (dashboard personnel) ────────────────────────────────────

export function useEnseignantStats() {
  return useQuery({
    queryKey: ['stats', 'enseignant'],
    queryFn: getEnseignantStats,
    staleTime: 60_000,
  });
}

export function useMesEtudiants() {
  return useQuery({ queryKey: ['mes-etudiants'], queryFn: getMesEtudiants });
}

export function useDemandesEnseignant() {
  return useQuery({ queryKey: ['demandes-enseignant'], queryFn: getDemandesEnseignant });
}

export function useAcceptChoix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptChoix,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['demandes-enseignant'] });
      void qc.invalidateQueries({ queryKey: ['stats', 'enseignant'] });
      void qc.invalidateQueries({ queryKey: ['mes-etudiants'] });
      toast.success('Demande acceptée');
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
      toast.success('Demande refusée');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
