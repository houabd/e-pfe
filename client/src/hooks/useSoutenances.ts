import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as soutenancesApi from '@/services/soutenances.api';
import { extractApiError } from '@/services/api';

export function useSoutenances(filters?: soutenancesApi.SoutenanceFilters) {
  return useQuery({
    queryKey: ['soutenances', filters],
    queryFn: () => soutenancesApi.getSoutenances(filters),
    staleTime: 30 * 1000,
  });
}

export function useCreateSoutenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: soutenancesApi.CreateSoutenanceDto) => soutenancesApi.createSoutenance(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['soutenances'] });
      void qc.invalidateQueries({ queryKey: ['affectations'] });
      void qc.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Soutenance planifiée avec succès');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useUpdateSoutenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<soutenancesApi.CreateSoutenanceDto> }) =>
      soutenancesApi.updateSoutenance(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['soutenances'] });
      toast.success('Soutenance modifiée');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useEnseignantsDisponibles(
  filters: { date?: string; heure?: string; theme_id?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ['enseignants-disponibles-soutenance', filters],
    queryFn: () => soutenancesApi.getEnseignantsDisponibles(filters),
    enabled: enabled && !!(filters.date || filters.heure || filters.theme_id),
    staleTime: 10 * 1000,
  });
}

export function useExportSoutenancesPDF() {
  return useMutation({
    mutationFn: (filters?: { annee_universitaire?: string; specialite_id?: string }) =>
      soutenancesApi.exportSoutenancesPDF(filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planning_soutenances_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Planning PDF téléchargé');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useExportSoutenancesExcel() {
  return useMutation({
    mutationFn: (filters?: { annee_universitaire?: string; specialite_id?: string }) =>
      soutenancesApi.exportSoutenancesExcel(filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planning_soutenances_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Planning Excel téléchargé');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
