import type { Role } from '@prisma/client';
import { requireRole } from './auth.middleware';

// Groupes de rôles réutilisables
export const ADMIN_ROLES: Role[] = ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN'];
export const MANAGEMENT_ROLES: Role[] = ['CHEF_DEPT', 'RESP_FILIERE'];
export const STAFF_ROLES: Role[] = ['CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_FILIERE', 'RESP_SPECIALITE', 'TECHNICIEN'];

export const requireAdmin = requireRole(...ADMIN_ROLES);
export const requireManagement = requireRole(...MANAGEMENT_ROLES);
export const requireStaff = requireRole(...STAFF_ROLES);
export const requireEnseignant = requireRole('ENSEIGNANT', 'CHEF_DEPT', 'RESP_FILIERE');
export const requireEtudiant = requireRole('ETUDIANT');
export const requireChefDept = requireRole('CHEF_DEPT');
export const requireRespFiliere = requireRole('RESP_FILIERE', 'CHEF_DEPT');
export const requireTechnicien = requireRole('TECHNICIEN', 'CHEF_DEPT');
