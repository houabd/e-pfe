import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateUser } from '@/hooks/useUsers';
import { useActiveSpecialites } from '@/hooks/useSpecialites';

const ROLES = [
  { value: 'CHEF_DEPT', label: 'Chef de Département' },
  { value: 'CHEF_EQUIPE', label: "Chef d'Équipe / Resp. Filière" },
  { value: 'RESP_SPECIALITE', label: 'Responsable de Spécialité' },
  { value: 'TECHNICIEN', label: 'Technicien' },
  { value: 'ENSEIGNANT', label: 'Enseignant' },
  { value: 'ETUDIANT', label: 'Étudiant (M2)' },
];

const ROLES_WITH_SPECIALITE = ['ENSEIGNANT', 'ETUDIANT', 'RESP_SPECIALITE', 'CHEF_EQUIPE'];
const STUDENT_ROLES = ['ETUDIANT'];

const schema = z.object({
  prenom: z.string().min(2, 'Minimum 2 caractères'),
  nom: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  role: z.string().min(1, 'Rôle requis'),
  date_naissance: z.string().min(1, 'Date de naissance requise'),
  specialite_id: z.string().optional(),
  matricule: z.string().optional(),
  annee_universitaire: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddUserDialog({ open, onOpenChange }: Props) {
  const createUser = useCreateUser();
  const { data: specialites } = useActiveSpecialites();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: '' } });

  const selectedRole = watch('role');
  const needsSpecialite = ROLES_WITH_SPECIALITE.includes(selectedRole);
  const isStudent = STUDENT_ROLES.includes(selectedRole);
  const emailDomain = selectedRole === 'ETUDIANT' ? '@se.univ-bejaia.dz' : '@univ-bejaia.dz';

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = (data: FormData) => {
    createUser.mutate(
      {
        ...data,
        specialite_id: needsSpecialite ? data.specialite_id : undefined,
        matricule: isStudent ? data.matricule : undefined,
        annee_universitaire: isStudent ? data.annee_universitaire : undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Ajouter un utilisateur
          </DialogTitle>
          <DialogDescription>
            Le mot de passe initial sera la date de naissance au format JJMMAAAA.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom <span className="text-destructive" aria-hidden>*</span></Label>
              <Input id="prenom" placeholder="Mohamed" aria-invalid={!!errors.prenom} {...register('prenom')} />
              {errors.prenom && <p className="text-xs text-destructive" role="alert">{errors.prenom.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom <span className="text-destructive" aria-hidden>*</span></Label>
              <Input id="nom" placeholder="Benali" aria-invalid={!!errors.nom} {...register('nom')} />
              {errors.nom && <p className="text-xs text-destructive" role="alert">{errors.nom.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-select">Rôle <span className="text-destructive" aria-hidden>*</span></Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role-select" aria-invalid={!!errors.role}>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-xs text-destructive" role="alert">{errors.role.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-destructive" aria-hidden>*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder={`prenom.nom${emailDomain}`}
              autoComplete="off"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {selectedRole && (
              <p className="text-xs text-muted-foreground">Domaine attendu : <code>{emailDomain}</code></p>
            )}
            {errors.email && <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_naissance">Date de naissance <span className="text-destructive" aria-hidden>*</span></Label>
            <Input id="date_naissance" type="date" aria-invalid={!!errors.date_naissance} {...register('date_naissance')} />
            <p className="text-xs text-muted-foreground">Utilisée comme mot de passe initial (JJMMAAAA)</p>
            {errors.date_naissance && <p className="text-xs text-destructive" role="alert">{errors.date_naissance.message}</p>}
          </div>

          {needsSpecialite && (
            <div className="space-y-2">
              <Label htmlFor="specialite-select">Spécialité</Label>
              <Controller
                name="specialite_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger id="specialite-select">
                      <SelectValue placeholder="Sélectionner une spécialité" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialites?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {isStudent && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matricule">Matricule</Label>
                <Input id="matricule" placeholder="202210001" {...register('matricule')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annee_univ">Année universitaire</Label>
                <Input id="annee_univ" placeholder="2025-2026" {...register('annee_universitaire')} />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending && <Loader2 className="size-4 animate-spin" />}
              Créer l&apos;utilisateur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
