import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { useLogin } from '@/hooks/useAuth';
import { extractApiError } from '@/services/api';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(
      { email: data.email, password: data.password },
      {
        onError: (e) => {
          const message = extractApiError(e);
          if (message === 'Aucun compte associé à cet email') {
            setError('email', { message });
          } else {
            setError('password', { message });
          }
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="items-center text-center pt-5 pb-0 px-8 gap-0">
        <Link to="/" className="mb-1 block hover:opacity-80 transition-opacity">
          <img src="/logo/logo1.png" alt="e-PFC" width={120} height={120} style={{ objectFit: 'contain' }} />
        </Link>
        <p className="text-[10px] font-semibold tracking-widest text-[#009474]">e-PFC</p>
        <CardTitle className="text-xl leading-tight">Connexion</CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-5 pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1">
            <Label htmlFor="email" className="text-sm">Email <span className="text-destructive" aria-hidden>*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="prenom.nom@univ-bejaia.dz"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-sm">Mot de passe <span className="text-destructive" aria-hidden>*</span></Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive" role="alert">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connexion en cours…
              </>
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Mot de passe initial : votre date de naissance<br />
          Mot de passe oublié ? Contactez l'administrateur.
        </p>
      </CardContent>
    </Card>
  );
}
