import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser, useAuthStore } from '@/stores/authStore';
import { useChangePassword, useLogout } from '@/hooks/useAuth';
import type { Role } from '@/types';

const REDIRECT_MAP: Record<Role, string> = {
  CHEF_DEPT: '/admin',
  CHEF_EQUIPE: '/admin',
  RESP_SPECIALITE: '/enseignant',
  TECHNICIEN: '/admin',
  ENSEIGNANT: '/enseignant',
  ETUDIANT: '/etudiant',
};

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Requis'),
    newPassword: z.string().min(8, 'Minimum 8 caractères'),
    confirmPassword: z.string().min(1, 'Requis'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type Form = z.infer<typeof schema>;

function PasswordField({
  id,
  label,
  error,
  ...props
}: React.ComponentProps<'input'> & { label: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? 'text' : 'password'} className="pr-10" aria-invalid={!!error} {...props} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? 'Masquer' : 'Afficher'}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export default function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const updateUser = useAuthStore((s) => s.updateUser);
  const changePassword = useChangePassword();
  const logout = useLogout();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = (data: Form) => {
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          updateUser({ must_change_password: false });
          navigate(user?.role ? (REDIRECT_MAP[user.role] ?? '/') : '/');
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex bg-muted/30 px-4 py-8">
      <div className="w-full max-w-md space-y-4 m-auto">
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <ShieldAlert className="size-5 shrink-0 mt-0.5 text-amber-600" />
          <p className="text-sm font-medium leading-snug">
            Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant de continuer.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              <CardTitle className="text-base">Choisir un nouveau mot de passe</CardTitle>
            </div>
            <CardDescription>
              Votre mot de passe actuel est votre date de naissance au format <strong>JJMMAAAA</strong>{' '}
              (ex. : 01011998).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <PasswordField
                id="currentPassword"
                label="Mot de passe actuel (date de naissance)"
                autoComplete="current-password"
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />
              <PasswordField
                id="newPassword"
                label="Nouveau mot de passe"
                autoComplete="new-password"
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />
              <PasswordField
                id="confirmPassword"
                label="Confirmer le nouveau mot de passe"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <Button type="submit" className="w-full" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                Définir mon nouveau mot de passe
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              
              <button
                type="button"
                onClick={logout}
                className="font-medium text-destructive underline underline-offset-2 hover:text-destructive/80 transition-colors"
              >
                Se déconnecter
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
