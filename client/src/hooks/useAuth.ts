import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { login as loginApi, changePassword as changePasswordApi } from '@/services/auth.api';
import { extractApiError } from '@/services/api';
import type { Role } from '@/types';

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => loginApi(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      const role: Role = data.user.role;
      const redirectMap: Record<Role, string> = {
        CHEF_DEPT: '/admin',
        CHEF_EQUIPE: '/admin',
        RESP_SPECIALITE: '/enseignant',
        TECHNICIEN: '/admin',
        ENSEIGNANT: '/enseignant',
        ETUDIANT: '/etudiant',
      };
      navigate(redirectMap[role] ?? '/');
    },
    onError: (error) => {
      toast.error(extractApiError(error));
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePasswordApi(currentPassword, newPassword),
    onSuccess: () => toast.success('Mot de passe modifié avec succès'),
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return () => {
    logout();
    navigate('/connexion');
  };
}
