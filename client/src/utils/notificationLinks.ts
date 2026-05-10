import type { TypeNotification, Role } from '@/types';

export function getNotificationLink(
  type: TypeNotification,
  metadata: Record<string, unknown> | undefined,
  role: Role | undefined,
): string | null {
  switch (type) {
    case 'BINOME_REQUEST':
    case 'BINOME_RESPONSE':
      return '/etudiant/binome';

    case 'THEME_CHOSEN':
      return '/enseignant/demandes';

    case 'THEME_RESPONSE':
      if (metadata?.peut_rechoisir || metadata?.statut === 'REFUSED') {
        return '/etudiant/themes';
      }
      return '/etudiant';

    case 'AFFECTATION':
      if (role === 'ETUDIANT') return '/etudiant';
      if (role === 'ENSEIGNANT' || role === 'RESP_FILIERE') return '/enseignant/etudiants';
      return null;

    case 'THEME_VALIDATED':
      if (role === 'ETUDIANT') return '/etudiant/proposer';
      if (role === 'ENSEIGNANT' || role === 'RESP_FILIERE') return '/enseignant/themes';
      return null;

    case 'SOUTENANCE_PLANIFIEE':
      if (role === 'ETUDIANT') return '/etudiant';
      if (role === 'ENSEIGNANT') return '/enseignant';
      return '/admin/soutenances';

    case 'SESSION_UPDATE': {
      const adminRoles: Role[] = ['CHEF_DEPT', 'CHEF_EQUIPE', 'RESP_FILIERE', 'RESP_SPECIALITE', 'TECHNICIEN'];
      if (role && adminRoles.includes(role)) return '/admin/sessions';
      if (role === 'ENSEIGNANT') return '/enseignant';
      if (role === 'ETUDIANT') return '/etudiant';
      return null;
    }

    case 'NEW_DOCUMENT':
      return null;

    default:
      return null;
  }
}
