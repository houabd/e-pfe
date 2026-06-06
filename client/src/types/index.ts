// ─── Enums ─────────────────────────────────────────────────────────────────

export type Role =
  | 'CHEF_DEPT'
  | 'CHEF_EQUIPE'
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
export type TypeAffectation = 'LIBRE' | 'AUTO';
export type TypeNotification =
  | 'BINOME_REQUEST'
  | 'BINOME_RESPONSE'
  | 'BINOME_AJOUTE'
  | 'THEME_CHOSEN'
  | 'THEME_CHOSEN_HANDLED'
  | 'THEME_RESPONSE'
  | 'AFFECTATION'
  | 'THEME_VALIDATED'
  | 'ENCADRANT_CONFIRM_REQUEST'
  | 'ENCADRANT_CONFIRM_RESPONSE'
  | 'SOUTENANCE_PLANIFIEE'
  | 'NEW_DOCUMENT'
  | 'SESSION_UPDATE'
  | 'STARTUP_MEMBRE_AJOUTE'
  | 'STARTUP_INVITATION'
  | 'STARTUP_PROPOSITION'
  | 'STARTUP_PROPOSITION_ACCEPTEE'
  | 'STARTUP_PROPOSITION_REFUSEE'
  | 'MODIFICATION_DEMANDE'
  | 'MODIFICATION_ACCEPTEE'
  | 'MODIFICATION_REFUSEE'
  | 'SOUTENANCE_MODIFIEE'
  | 'SOUTENANCE_ANNULEE'
  | 'THEME_SOUTENU';

// ─── Demande de modification ─────────────────────────────────────────────────

export type StatutDemandeModification = 'PENDING' | 'ACCEPTED' | 'REFUSED';

export interface DemandeModification {
  id: string;
  theme_id: string;
  demandeur_id: string;
  motif: string;
  statut: StatutDemandeModification;
  commentaire_admin?: string | null;
  created_at: string;
  theme: {
    id: string;
    titre: string;
    type_pfe: string;
    statut_validation: StatutValidation;
    is_affecte: boolean;
    theme_specialites: Array<{ specialite: Specialite }>;
  };
  demandeur: Pick<User, 'id' | 'nom' | 'prenom' | 'email' | 'role'>;
}

// ─── API ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: Role;
  is_active: boolean;
  must_change_password?: boolean;
  matricule?: string;
  annee_universitaire?: string;
  date_naissance?: string;
  specialite?: Specialite;
  created_at?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

// ─── Spécialité ─────────────────────────────────────────────────────────────

export interface Specialite {
  id: string;
  nom: string;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  type: SessionType;
  date_debut: string;
  date_fin: string;
  annee_universitaire: string;
  is_active: boolean;
}

// ─── Thème ──────────────────────────────────────────────────────────────────

export interface Theme {
  id: string;
  titre: string;
  description: string;
  mots_cles: string[];
  necessite_stage: boolean;
  type_pfe: ThemeType;
  sous_types: SousTypeTheme[];
  propose_par: Pick<User, 'id' | 'nom' | 'prenom' | 'email' | 'role'>;
  encadrant?: Pick<User, 'id' | 'nom' | 'prenom' | 'email'>;
  co_encadrant?: Pick<User, 'id' | 'nom' | 'prenom' | 'email'>;
  encadrant_externe?: EncadrantExterne;
  besoin_encadrant: boolean;
  cherche_binome: boolean;
  encadrant_valide: boolean;
  statut_validation: StatutValidation;
  modification_autorisee: boolean;
  is_affecte: boolean;
  is_soutenu: boolean;
  session: Pick<Session, 'id' | 'type' | 'annee_universitaire'>;
  theme_specialites: Array<{ specialite: Specialite }>;
  created_at: string;
}

export interface EncadrantExterne {
  nom: string;
  prenom: string;
  email: string;
  institution: string;
}

// ─── Binôme ──────────────────────────────────────────────────────────────────

export interface Binome {
  id: string;
  etud1: User;
  etud2: User;
  statut: StatutBinome;
}

// ─── Choix ──────────────────────────────────────────────────────────────────

export interface ThemeChoix {
  id: string;
  etudiant: User;
  theme: Theme;
  ordre: number;
  statut: StatutChoix;
  binome?: Binome;
}

// ─── Affectation ─────────────────────────────────────────────────────────────

export interface Affectation {
  id: string;
  theme: Theme;
  encadrant: User;
  type: TypeAffectation;
  etudiants: Array<{ etudiant: User; binome?: Binome }>;
}

// ─── Soutenance ──────────────────────────────────────────────────────────────

export interface Soutenance {
  id: string;
  theme: Theme;
  date_soutenance: string;
  heure: string;
  salle: string;
  annee_universitaire: string;
  jury: Array<{ enseignant: User; role: 'PRESIDENT' | 'EXAMINATEUR' }>;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: TypeNotification;
  message: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface GlobalStats {
  totalEtudiants: number;
  totalEnseignants: number;
  totalThemes: number;
  themesValides: number;
  themesNonValides: number;
  themesAffectes: number;
  themesNonAffectes: number;
  themesSoutenus: number;
  themesClassiques: number;
  themesStartups: number;
  themesAffectesClassiques: number;
  themesAffectesStartups: number;
  etudiantsSansTheme: number;
  etudiantsAvecTheme: number;
  enseignantsSurcharges: number;
  enseignantsSansAffectation: number;
  themesSansEncadrant: number;
}

// ─── Formulaires ─────────────────────────────────────────────────────────────

export interface CreateThemeForm {
  titre: string;
  description: string;
  mots_cles: string[];
  necessite_stage: boolean;
  type_pfe: ThemeType;
  sous_types: SousTypeTheme[];
  specialite_ids: string[];
  encadrant_id?: string;
  encadrant_externe?: EncadrantExterne;
  besoin_encadrant: boolean;
  cherche_binome: boolean;
}
