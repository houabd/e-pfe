import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, User as UserIcon, Lock, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/stores/authStore';
import { useChangePassword } from '@/hooks/useAuth';

const ROLE_LABELS: Record<string, string> = {
  CHEF_DEPT: 'Chef de Département',
  CHEF_EQUIPE: "Chef d'Équipe",
  RESP_FILIERE: 'Responsable de Filière',
  RESP_SPECIALITE: 'Responsable de Spécialité',
  TECHNICIEN: 'Technicien',
  ENSEIGNANT: 'Enseignant',
  ETUDIANT: 'Étudiant',
};

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
    newPassword: z
      .string()
      .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string().min(1, 'Veuillez confirmer le mot de passe'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function PasswordField({
  id,
  label,
  required,
  error,
  ...props
}: React.ComponentProps<'input'> & { label: string; required?: boolean; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-0.5" aria-hidden>*</span>}
      </Label>
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

export default function ProfilePage() {
  const user = useCurrentUser();
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = (data: PasswordForm) => {
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      { onSuccess: () => reset() },
    );
  };

  if (!user) return null;

  const initials = `${user.prenom[0]}${user.nom[0]}`.toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mon profil</h2>
        <p className="text-muted-foreground mt-1">Informations de compte et sécurité</p>
      </div>

      {/* Infos utilisateur */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{user.prenom} {user.nom}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <UserIcon className="size-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Rôle</p>
              <Badge variant="secondary" className="mt-0.5">{ROLE_LABELS[user.role] ?? user.role}</Badge>
            </div>
          </div>
          {user.specialite && (
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Spécialité</p>
                <p className="text-sm font-medium">{user.specialite.nom}</p>
              </div>
            </div>
          )}
          {user.matricule && (
            <div className="flex items-center gap-3">
              <UserIcon className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Matricule</p>
                <p className="text-sm font-medium">{user.matricule}</p>
              </div>
            </div>
          )}
          {user.annee_universitaire && (
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Année universitaire</p>
                <p className="text-sm font-medium">{user.annee_universitaire}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Changement de mot de passe */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Changer le mot de passe</CardTitle>
          </div>
          <CardDescription>
            Le nouveau mot de passe doit contenir au moins 8 caractères.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <PasswordField
              id="currentPassword"
              label="Mot de passe actuel"
              required
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <PasswordField
              id="newPassword"
              label="Nouveau mot de passe"
              required
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <PasswordField
              id="confirmPassword"
              label="Confirmer le nouveau mot de passe"
              required
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="size-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
