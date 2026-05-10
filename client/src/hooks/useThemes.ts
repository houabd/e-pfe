import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as themesApi from '@/services/themes.api';
import { extractApiError } from '@/services/api';
import type { CreateThemeForm } from '@/types';

export function useThemes(filters?: themesApi.ThemeFilters) {
  return useQuery({
    queryKey: ['themes', filters],
    queryFn: () => themesApi.getThemes(filters),
  });
}

export function useTheme(id: string) {
  return useQuery({
    queryKey: ['themes', id],
    queryFn: () => themesApi.getThemeById(id),
    enabled: !!id,
  });
}

export function useMyThemes(filters?: Omit<themesApi.ThemeFilters, 'enseignant_id'>) {
  return useQuery({
    queryKey: ['themes', 'my', filters],
    queryFn: () => themesApi.getMyThemes(filters),
  });
}

export function useRespFiliereInfo() {
  return useQuery({
    queryKey: ['resp-filiere-info'],
    queryFn: themesApi.getRespFiliereInfo,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateThemeForm) => themesApi.createTheme(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Thème proposé avec succès');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useValidateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, motif }: { id: string; action: 'VALIDE' | 'REFUSE'; motif?: string }) =>
      themesApi.validateTheme(id, action, motif),
    onSuccess: (_, { action }) => {
      void qc.invalidateQueries({ queryKey: ['themes'] });
      toast.success(action === 'VALIDE' ? 'Thème validé' : 'Thème refusé');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useMarkAsSoutenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => themesApi.markAsSoutenu(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Thème marqué soutenu');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useCreateThemeAsAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Parameters<typeof themesApi.createThemeAsAdmin>[0]) =>
      themesApi.createThemeAsAdmin(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Thème ajouté avec succès');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useUpdateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateThemeForm> }) =>
      themesApi.updateTheme(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Thème mis à jour');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useDeleteTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => themesApi.deleteTheme(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Thème supprimé');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useAnnonces(filters?: { specialite_id?: string }) {
  return useQuery({
    queryKey: ['annonces', filters],
    queryFn: () => themesApi.getAnnonces(filters),
    staleTime: 30 * 1000,
  });
}

export function useExportThemes() {
  return useMutation({
    mutationFn: ({ format, filters }: { format: 'excel' | 'pdf'; filters?: Omit<themesApi.ThemeFilters, 'page' | 'limit'> }) =>
      themesApi.exportThemes(format, filters),
    onSuccess: (blob, { format }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `themes_pfe_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
