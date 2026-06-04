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

    case 'BINOME_AJOUTE':
      return '/enseignant/etudiants';

    case 'THEME_CHOSEN':
    case 'THEME_CHOSEN_HANDLED':
      return '/enseignant/demandes';

    case 'THEME_RESPONSE':
      if (metadata?.peut_rechoisir || metadata?.statut === 'REFUSED') {
        return '/etudiant/themes';
      }
      return '/etudiant';

    case 'AFFECTATION':
      if (role === 'ETUDIANT') return '/etudiant';
      if (role === 'ENSEIGNANT' || role === 'RESP_SPECIALITE' || role === 'CHEF_EQUIPE') return '/enseignant/etudiants';
      return null;

    case 'THEME_VALIDATED':
      if (role === 'ETUDIANT') return '/etudiant/proposer';
      if (role === 'ENSEIGNANT' || role === 'RESP_SPECIALITE' || role === 'CHEF_EQUIPE') return '/enseignant/themes';
      return null;

    case 'SOUTENANCE_PLANIFIEE':
    case 'SOUTENANCE_MODIFIEE':
    case 'SOUTENANCE_ANNULEE':
      if (role === 'ETUDIANT') return '/etudiant';
      if (role === 'ENSEIGNANT' || role === 'RESP_SPECIALITE') return '/enseignant';
      return '/admin/soutenances';

    case 'THEME_SOUTENU':
      return '/etudiant';

    case 'SESSION_UPDATE': {
      const adminRoles: Role[] = ['CHEF_DEPT', 'CHEF_EQUIPE', 'TECHNICIEN'];
      if (role && adminRoles.includes(role)) return '/admin/sessions';
      if (role === 'ENSEIGNANT' || role === 'RESP_SPECIALITE') return '/enseignant';
      if (role === 'ETUDIANT') return '/etudiant';
      return null;
    }

    case 'MODIFICATION_DEMANDE':
      return '/admin/themes';

    case 'MODIFICATION_ACCEPTEE':
    case 'MODIFICATION_REFUSEE':
      return '/enseignant/themes';

    case 'STARTUP_INVITATION':
      return '/etudiant';

    case 'STARTUP_MEMBRE_AJOUTE':
    case 'STARTUP_PROPOSITION':
    case 'STARTUP_PROPOSITION_ACCEPTEE':
    case 'STARTUP_PROPOSITION_REFUSEE':
      if (role === 'ETUDIANT') return '/etudiant';
      if (metadata?.affectation_id) return `/enseignant/etudiants`;
      return null;

    case 'ENCADRANT_CONFIRM_REQUEST':
    case 'ENCADRANT_CONFIRM_RESPONSE':
      return null;

    case 'NEW_DOCUMENT':
      return null;

    default:
      return null;
  }
}
