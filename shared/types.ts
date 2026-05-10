// Types partagés entre client et server
// Importez depuis ici pour éviter la duplication

export type Role =
  | 'CHEF_DEPT'
  | 'CHEF_EQUIPE'
  | 'RESP_FILIERE'
  | 'RESP_SPECIALITE'
  | 'TECHNICIEN'
  | 'ENSEIGNANT'
  | 'ETUDIANT';

export type SessionType = 'CHOIX' | 'AFFECTATION';
export type ThemeType = 'CLASSIQUE' | 'STARTUP';
export type SousTypeTheme = 'RECHERCHE' | 'PROFESSIONNEL' | 'LES_DEUX';
export type StatutValidation = 'NON_VALIDE' | 'VALIDE';
export type StatutChoix = 'PENDING' | 'ACCEPTED' | 'REFUSED';
export type StatutBinome = 'PENDING' | 'ACCEPTED' | 'REFUSED';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
