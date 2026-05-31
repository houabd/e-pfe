import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as usersApi from '@/services/users.api';
import { extractApiError } from '@/services/api';

export function useUsers(filters?: usersApi.UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersApi.getUsers(filters),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur créé avec succès');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.toggleUserActive,
    onSuccess: (user) => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(user.is_active ? 'Compte activé' : 'Compte désactivé');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur désactivé');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useImportUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.importUsers,
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      if (result.errors.length === 0) {
        toast.success(`${result.imported} utilisateur(s) importé(s) avec succès`);
      } else {
        toast.warning(`${result.imported} importé(s) · ${result.errors.length} erreur(s)`);
      }
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useHardDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.hardDeleteUser,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur supprimé définitivement');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useBulkDeleteUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.bulkDeleteUsers,
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`${result.count} utilisateur(s) désactivé(s)`);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useBulkHardDeleteUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.bulkHardDeleteUsers,
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`${result.count} utilisateur(s) supprimé(s) définitivement`);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useExportUsers() {
  return useMutation({
    mutationFn: ({ format, filters }: { format: 'excel' | 'pdf'; filters?: usersApi.UserFilters }) =>
      usersApi.exportUsers(format, filters),
    onSuccess: (blob, { format }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
