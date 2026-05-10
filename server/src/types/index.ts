import type { Role, SessionType, ThemeType, SousTypeTheme, StatutValidation, StatutChoix, StatutBinome } from '@prisma/client';

// ─── API Response ───────────────────────────────────────────────────────────

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

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export interface CreateUserDto {
  email: string;
  nom: string;
  prenom: string;
  role: Role;
  specialite_id?: string;
  date_naissance: Date;
  matricule?: string;
  annee_universitaire?: string;
}

export interface UserFilters extends PaginationQuery {
  role?: Role;
  specialite_id?: string;
  is_active?: boolean;
  search?: string;
}

// ─── Themes ─────────────────────────────────────────────────────────────────

export interface CreateThemeDto {
  titre: string;
  description: string;
  mots_cles?: string[];
  necessite_stage?: boolean;
  type_pfe: ThemeType;
  sous_types?: SousTypeTheme[];
  specialite_ids: string[];
  encadrant_id?: string;
  encadrant_externe?: EncadrantExterne;
  besoin_encadrant?: boolean;
  cherche_binome?: boolean;
}

export interface EncadrantExterne {
  nom: string;
  prenom: string;
  email: string;
  institution: string;
}

export interface ThemeFilters extends PaginationQuery {
  specialite_id?: string;
  type_pfe?: ThemeType;
  statut_validation?: StatutValidation;
  is_affecte?: boolean;
  besoin_encadrant?: boolean;
  session_id?: string;
  enseignant_id?: string;
  annee_universitaire?: string;
  search?: string;
}

// ─── Choix ──────────────────────────────────────────────────────────────────

export interface CreateChoixDto {
  theme_id: string;
  ordre: 1 | 2 | 3;
}

export interface ChoixFilters extends PaginationQuery {
  statut?: StatutChoix;
}

// ─── Binomes ─────────────────────────────────────────────────────────────────

export interface DemanderBinomeDto {
  etudiant_id: string;
}

export interface BinomeFilters extends PaginationQuery {
  statut?: StatutBinome;
  specialite_id?: string;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export interface CreateSessionDto {
  type: SessionType;
  date_debut: Date;
  date_fin: Date;
  annee_universitaire: string;
}

// ─── Affectations ────────────────────────────────────────────────────────────

export interface CreateAffectationDto {
  theme_id?: string;    // optionnel — le thème peut être défini plus tard
  encadrant_id: string;
  etudiant_ids: string[];
  binome_id?: string;
}

export interface ConfirmerAutoDto {
  suggestions: Array<{
    theme_id: string;
    encadrant_id: string;
    etudiant_ids: string[];
    binome_id?: string;
  }>;
}

// ─── Soutenances ─────────────────────────────────────────────────────────────

export interface CreateSoutenanceDto {
  theme_id: string;
  date_soutenance: Date;
  heure: string;
  salle: string;
  annee_universitaire: string;
  jury: JuryMembre[];
}

export interface JuryMembre {
  enseignant_id: string;
  role: 'PRESIDENT' | 'EXAMINATEUR';
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface GlobalStats {
  totalEtudiants: number;
  totalEnseignants: number;
  totalThemes: number;
  themesValides: number;
  themesAffectes: number;
  themesSoutenus: number;
  etudiantsSansTheme: number;
  enseignantsSansTheme: number;
}
