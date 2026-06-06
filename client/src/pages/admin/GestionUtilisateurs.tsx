import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users, UserPlus, Upload, Download, Search, Filter,
  MoreHorizontal, UserCheck, UserX, Trash2, ChevronLeft, ChevronRight,
  Pencil, Loader2, KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUsers, useUpdateUser, useToggleUserActive, useDeleteUser, useHardDeleteUser, useBulkDeleteUsers, useBulkHardDeleteUsers, useExportUsers, useResetUserPassword } from '@/hooks/useUsers';
import { useActiveSpecialites } from '@/hooks/useSpecialites';
import { useAuthStore } from '@/stores/authStore';
import AddUserDialog from '@/components/users/AddUserDialog';
import ImportUsersDialog from '@/components/users/ImportUsersDialog';
import type { User } from '@/types';
import type { UserFilters } from '@/services/users.api';

// ─── Constantes ──────────────────────────────────────────────────────────────

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

const ROLE_LABELS: Record<string, string> = {
  CHEF_DEPT: 'Chef Dept.',
  CHEF_EQUIPE: 'Chef Équipe',
  RESP_SPECIALITE: 'Resp. Spécialité',
  TECHNICIEN: 'Technicien',
  ENSEIGNANT: 'Enseignant',
  ETUDIANT: 'Étudiant',
};

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'info' | 'warning' | 'outline'> = {
  CHEF_DEPT: 'default',
  CHEF_EQUIPE: 'info',
  RESP_SPECIALITE: 'secondary',
  TECHNICIEN: 'secondary',
  ENSEIGNANT: 'warning',
  ETUDIANT: 'outline',
};

// ─── Schéma édition utilisateur ──────────────────────────────────────────────

const editUserSchema = z.object({
  prenom: z.string().min(2, 'Minimum 2 caractères'),
  nom: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  role: z.string().min(1, 'Rôle requis'),
  date_naissance: z.string().optional(),
  specialite_id: z.string().optional(),
  matricule: z.string().optional(),
  annee_universitaire: z.string().optional(),
});
type EditUserForm = z.infer<typeof editUserSchema>;

// ─── Dialogue édition utilisateur ────────────────────────────────────────────

function EditUserDialog({
  user,
  open,
  onClose,
  specialites,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
  specialites: { id: string; nom: string }[];
}) {
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { prenom: '', nom: '', email: '', role: 'ENSEIGNANT', date_naissance: '', specialite_id: '', matricule: '', annee_universitaire: '' },
  });

  useEffect(() => {
    if (user) {
      reset({
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        role: user.role,
        date_naissance: user.date_naissance ? user.date_naissance.slice(0, 10) : '',
        specialite_id: user.specialite?.id ?? '',
        matricule: user.matricule ?? '',
        annee_universitaire: user.annee_universitaire ?? '',
      });
    }
  }, [user, reset]);

  const selectedRole = watch('role');
  const needsSpecialite = ROLES_WITH_SPECIALITE.includes(selectedRole);
  const isStudent = STUDENT_ROLES.includes(selectedRole);
  const emailDomain = selectedRole === 'ETUDIANT' ? '@se.univ-bejaia.dz' : '@univ-bejaia.dz';

  const onSubmit = (data: EditUserForm) => {
    if (!user) return;
    updateUser.mutate(
      {
        id: user.id,
        dto: {
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          role: data.role,
          date_naissance: data.date_naissance || undefined,
          specialite_id: needsSpecialite ? (data.specialite_id || null) : null,
          matricule: isStudent ? (data.matricule || null) : null,
          annee_universitaire: isStudent ? (data.annee_universitaire || null) : null,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" />
            Modifier l&apos;utilisateur
          </DialogTitle>
          <DialogDescription>
            {user && <>Modifiez les informations de <strong>{user.prenom} {user.nom}</strong>.</>}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-prenom">Prénom <span className="text-destructive">*</span></Label>
              <Input id="edit-prenom" {...register('prenom')} aria-invalid={!!errors.prenom} />
              {errors.prenom && <p className="text-xs text-destructive">{errors.prenom.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nom">Nom <span className="text-destructive">*</span></Label>
              <Input id="edit-nom" {...register('nom')} aria-invalid={!!errors.nom} />
              {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Rôle <span className="text-destructive">*</span></Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-role">
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
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email <span className="text-destructive">*</span></Label>
            <Input id="edit-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            {selectedRole && (
              <p className="text-xs text-muted-foreground">Domaine attendu : <code>{emailDomain}</code></p>
            )}
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dob">Date de naissance</Label>
            <Controller
              name="date_naissance"
              control={control}
              render={({ field }) => (
                <Input
                  id="edit-dob"
                  type="date"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />
          </div>

          {needsSpecialite && (
            <div className="space-y-2">
              <Label htmlFor="edit-specialite">Spécialité</Label>
              <Controller
                name="specialite_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger id="edit-specialite">
                      <SelectValue placeholder="Sélectionner une spécialité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {specialites.map((s) => (
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
                <Label htmlFor="edit-matricule">Matricule</Label>
                <Input id="edit-matricule" placeholder="202210001" {...register('matricule')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-annee">Année universitaire</Label>
                <Input id="edit-annee" placeholder="2025-2026" {...register('annee_universitaire')} />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Fiche utilisateur ────────────────────────────────────────────────────────

function UserFicheDialog({
  user,
  open,
  onClose,
  onEdit,
  onResetPassword,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
}) {
  const currentRole = useAuthStore((s) => s.user?.role);
  const canResetPassword = currentRole === 'TECHNICIEN' || currentRole === 'CHEF_DEPT';

  if (!user) return null;
  const initials = `${user.prenom[0]}${user.nom[0]}`.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fiche utilisateur</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg">
            <Avatar className="size-12">
              <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-base">{user.prenom} {user.nom}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-1.5">
                <Badge variant={ROLE_VARIANTS[user.role] ?? 'secondary'}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Date de naissance</p>
              <p>{user.date_naissance
                ? new Date(user.date_naissance).toLocaleDateString('fr-FR')
                : <span className="text-muted-foreground/50">—</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Spécialité</p>
              <p>{user.specialite?.nom ?? <span className="text-muted-foreground/50">—</span>}</p>
            </div>
            {user.matricule && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Matricule</p>
                <p>{user.matricule}</p>
              </div>
            )}
            {user.annee_universitaire && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Année universitaire</p>
                <p>{user.annee_universitaire}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Statut</p>
              <div className="mt-0.5">
                <Badge variant={user.is_active ? 'success' : 'secondary'}>
                  {user.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {canResetPassword && (
            <Button
              type="button"
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
              onClick={() => { onClose(); onResetPassword(user); }}
            >
              <KeyRound className="size-4 mr-2" />
              Réinitialiser le mot de passe
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={onClose}>Fermer</Button>
            <Button type="button" onClick={() => { onClose(); onEdit(user); }}>
              <Pencil className="size-4 mr-2" />
              Modifier les infos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialogue confirmation suppression unique ─────────────────────────────────

function DeleteConfirmDialog({
  user,
  onConfirm,
  onCancel,
  isPending,
}: {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Désactiver l&apos;utilisateur</DialogTitle>
          <DialogDescription>
            Voulez-vous désactiver le compte de{' '}
            <strong>{user.prenom} {user.nom}</strong> ? Il ne pourra plus se connecter.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            Désactiver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialogue confirmation suppression en masse ───────────────────────────────

function BulkDeleteConfirmDialog({
  count,
  onConfirm,
  onCancel,
  isPending,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Désactiver {count} utilisateur(s)</DialogTitle>
          <DialogDescription>
            Les <strong>{count}</strong> utilisateurs sélectionnés seront désactivés et ne pourront plus se connecter. Cette action est réversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            Désactiver tout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialogue confirmation suppression définitive ─────────────────────────────

function HardDeleteConfirmDialog({
  user,
  onConfirm,
  onCancel,
  isPending,
}: {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-destructive">Supprimer définitivement</DialogTitle>
          <DialogDescription>
            Le compte de <strong>{user.prenom} {user.nom}</strong> ainsi que toutes ses données associées
            (binômes, choix de thèmes, jury…) seront <strong>supprimés de façon irréversible</strong>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialogue réinitialisation mot de passe ───────────────────────────────────

function ResetPasswordConfirmDialog({
  user,
  onConfirm,
  onCancel,
  isPending,
}: {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const dateDisplay = user.date_naissance
    ? new Date(user.date_naissance).toLocaleDateString('fr-FR')
    : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-amber-600" />
            Réinitialiser le mot de passe
          </DialogTitle>
          <DialogDescription>
            Le mot de passe de <strong>{user.prenom} {user.nom}</strong> sera remplacé par
            {dateDisplay
              ? <> sa date de naissance (<strong>{dateDisplay}</strong>, format JJMMAAAA)</>
              : ' sa date de naissance'}
            . L&apos;utilisateur pourra le modifier à sa prochaine connexion.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            Réinitialiser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ligne de tableau ─────────────────────────────────────────────────────────

function UserRow({
  user,
  selected,
  onSelect,
  onToggle,
  onFiche,
  onDelete,
  onHardDelete,
}: {
  user: User;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onToggle: (id: string) => void;
  onFiche: (user: User) => void;
  onDelete: (user: User) => void;
  onHardDelete: (user: User) => void;
}) {
  const initials = `${user.prenom[0]}${user.nom[0]}`.toUpperCase();

  return (
    <tr className={`border-b last:border-0 hover:bg-muted/30 transition-colors group ${selected ? 'bg-primary/5' : ''}`}>
      <td className="px-3 py-3 w-10">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(user.id, !!checked)}
          aria-label={`Sélectionner ${user.prenom} ${user.nom}`}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className={`text-xs font-semibold ${user.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.prenom} {user.nom}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={ROLE_VARIANTS[user.role] ?? 'secondary'} className="whitespace-nowrap">
          {ROLE_LABELS[user.role] ?? user.role}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {user.specialite?.nom ?? <span className="text-muted-foreground/40">—</span>}
      </td>
      <td className="px-4 py-3">
        <Badge variant={user.is_active ? 'success' : 'secondary'}>
          {user.is_active ? 'Actif' : 'Inactif'}
        </Badge>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'}
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              aria-label={`Actions pour ${user.prenom} ${user.nom}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onFiche(user)}>
              <Pencil className="size-4 mr-2" />
              Voir / Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggle(user.id)}>
              {user.is_active ? (
                <><UserX className="size-4 mr-2 text-yellow-600" /> Désactiver</>
              ) : (
                <><UserCheck className="size-4 mr-2 text-green-600" /> Activer</>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onHardDelete(user)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4 mr-2" />
              Supprimer définitivement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// ─── Squelette de chargement ──────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b">
          <td className="px-3 py-3 w-10"><Skeleton className="size-4" /></td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          </td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-14" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-7 w-7" /></td>
        </tr>
      ))}
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function GestionUtilisateurs() {
  const [filters, setFilters] = useState<UserFilters>({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [ficheTarget, setFicheTarget] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<User | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showBulkHardConfirm, setShowBulkHardConfirm] = useState(false);

  const { data: response, isLoading } = useUsers(filters);
  const { data: specialites } = useActiveSpecialites();
  const toggleActive = useToggleUserActive();
  const resetPassword = useResetUserPassword();
  const deleteUser = useDeleteUser();
  const hardDeleteUser = useHardDeleteUser();
  const bulkDelete = useBulkDeleteUsers();
  const bulkHardDelete = useBulkHardDeleteUsers();
  const exportUsers = useExportUsers();

  const users = response?.data ?? [];
  const meta = response?.meta;

  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));
  const someSelected = users.some((u) => selectedIds.has(u.id));

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(users.map((u) => u.id)));
    else setSelectedIds(new Set());
  };

  const applyFilter = useCallback((key: keyof UserFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
    setSelectedIds(new Set());
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: search || undefined, page: 1 }));
    setSelectedIds(new Set());
  };

  const handleResetPassword = () => {
    if (!resetPasswordTarget) return;
    resetPassword.mutate(resetPasswordTarget.id, { onSuccess: () => setResetPasswordTarget(null) });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleHardDelete = () => {
    if (!hardDeleteTarget) return;
    hardDeleteUser.mutate(hardDeleteTarget.id, { onSuccess: () => setHardDeleteTarget(null) });
  };

  const handleBulkDelete = () => {
    bulkDelete.mutate([...selectedIds], {
      onSuccess: () => {
        setSelectedIds(new Set());
        setShowBulkConfirm(false);
      },
    });
  };

  const handleBulkHardDelete = () => {
    bulkHardDelete.mutate([...selectedIds], {
      onSuccess: () => {
        setSelectedIds(new Set());
        setShowBulkHardConfirm(false);
      },
    });
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    const { page: _p, limit: _l, ...exportFilters } = filters;
    exportUsers.mutate({ format, filters: exportFilters });
  };

  const totalPages = meta?.totalPages ?? 1;
  const currentPage = meta?.page ?? 1;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des utilisateurs</h2>
          <p className="text-muted-foreground mt-1">
            {meta ? `${meta.total} utilisateur(s) au total` : 'Chargement…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={exportUsers.isPending}>
            <Download className="size-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={exportUsers.isPending}>
            <Download className="size-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="size-4" />
            Importer
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <UserPlus className="size-4" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Stats rapides */}
      {meta && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: meta.total, icon: <Users className="size-4 text-muted-foreground" /> },
            {
              label: 'Actifs',
              value: users.filter((u) => u.is_active).length,
              icon: <UserCheck className="size-4 text-green-600" />,
            },
            {
              label: 'Inactifs',
              value: users.filter((u) => !u.is_active).length,
              icon: <UserX className="size-4 text-muted-foreground" />,
            },
          ].map((stat) => (
            <Card key={stat.label} className="p-3 flex items-center gap-3">
              {stat.icon}
              <div>
                <p className="text-xl font-bold leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, email, matricule…"
                className="pl-9"
                aria-label="Rechercher un utilisateur"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              <Filter className="size-4" />
              Filtrer
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.role ?? 'all'}
              onValueChange={(v) => applyFilter('role', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-40 h-9" aria-label="Filtrer par rôle">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.specialite_id ?? 'all'}
              onValueChange={(v) => applyFilter('specialite_id', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-40 h-9" aria-label="Filtrer par spécialité">
                <SelectValue placeholder="Toutes spécialités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes spécialités</SelectItem>
                {specialites?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.is_active === undefined ? 'all' : String(filters.is_active)}
              onValueChange={(v) => {
                setFilters((prev) => ({
                  ...prev,
                  is_active: v === 'all' ? undefined : v === 'true',
                  page: 1,
                }));
              }}
            >
              <SelectTrigger className="w-32 h-9" aria-label="Filtrer par statut">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="true">Actifs</SelectItem>
                <SelectItem value="false">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Barre d'actions de sélection */}
      {someSelected && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-primary">
            {selectedIds.size} utilisateur(s) sélectionné(s)
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Tout désélectionner
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkConfirm(true)}
            >
              <UserX className="size-3.5" />
              Désactiver la sélection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkHardConfirm(true)}
            >
              <Trash2 className="size-3.5" />
              Supprimer définitivement
            </Button>
          </div>
        </div>
      )}

      {/* Tableau */}
      <Card className="overflow-hidden p-0 gap-0">
        <div className="overflow-x-auto">
          <table className="w-full" aria-label="Liste des utilisateurs">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => { if (el) (el as HTMLButtonElement).dataset.indeterminate = String(someSelected && !allSelected); }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Sélectionner tout"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Utilisateur
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Rôle
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Spécialité
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Statut
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Depuis
                </th>
                <th className="px-4 py-3 w-12" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Users className="size-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Aucun utilisateur trouvé</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Modifiez vos filtres ou ajoutez un utilisateur.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    selected={selectedIds.has(user.id)}
                    onSelect={handleSelectOne}
                    onToggle={(id) => toggleActive.mutate(id)}
                    onFiche={setFicheTarget}
                    onDelete={setDeleteTarget}
                    onHardDelete={setHardDeleteTarget}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <>
            <Separator />
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} sur {totalPages} · {meta.total} résultat(s)
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters((p) => ({ ...p, page: currentPage - 1 }))}
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters((p) => ({ ...p, page: currentPage + 1 }))}
                  aria-label="Page suivante"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modals */}
      <AddUserDialog open={showAdd} onOpenChange={setShowAdd} />
      <ImportUsersDialog open={showImport} onOpenChange={setShowImport} />
      <UserFicheDialog
        open={!!ficheTarget}
        user={ficheTarget}
        onClose={() => setFicheTarget(null)}
        onEdit={setEditTarget}
        onResetPassword={setResetPasswordTarget}
      />
      <EditUserDialog
        open={!!editTarget}
        user={editTarget}
        onClose={() => setEditTarget(null)}
        specialites={specialites ?? []}
      />
      {resetPasswordTarget && (
        <ResetPasswordConfirmDialog
          user={resetPasswordTarget}
          onConfirm={handleResetPassword}
          onCancel={() => setResetPasswordTarget(null)}
          isPending={resetPassword.isPending}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog
          user={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteUser.isPending}
        />
      )}
      {showBulkConfirm && (
        <BulkDeleteConfirmDialog
          count={selectedIds.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkConfirm(false)}
          isPending={bulkDelete.isPending}
        />
      )}
      {hardDeleteTarget && (
        <HardDeleteConfirmDialog
          user={hardDeleteTarget}
          onConfirm={handleHardDelete}
          onCancel={() => setHardDeleteTarget(null)}
          isPending={hardDeleteUser.isPending}
        />
      )}
      {showBulkHardConfirm && (
        <Dialog open onOpenChange={(open) => !open && setShowBulkHardConfirm(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-destructive">Supprimer {selectedIds.size} utilisateur(s)</DialogTitle>
              <DialogDescription>
                Les <strong>{selectedIds.size}</strong> utilisateurs sélectionnés ainsi que toutes leurs données
                associées seront <strong>supprimés de façon irréversible</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkHardConfirm(false)}>Annuler</Button>
              <Button variant="destructive" onClick={handleBulkHardDelete} disabled={bulkHardDelete.isPending}>
                Supprimer définitivement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
