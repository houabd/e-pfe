import { api } from './api';
import type { GlobalStats, ApiResponse } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnseignantCategorie = 'SURCHARGE' | 'SOUS_CHARGE' | 'SANS_PROPOSITION' | 'AVEC_PROPOSITION' | 'NORMAL';

export interface EnseignantStats {
  totalThemes: number;
  themesAffectes: number;
  themesNonAffectes: number;
  themesValides: number;
  demandesEnAttente: number;
  etudiantsEncadres: number;
}

export interface EnseignantStatRow {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  specialite: { id: string; nom: string } | null;
  nb_themes_proposes: number;
  nb_themes_affectes: number;
  categorie: EnseignantCategorie;
}

export interface EtudiantStatRow {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  matricule: string | null;
  annee_universitaire: string | null;
  specialite: { id: string; nom: string } | null;
  has_theme: boolean;
  is_startup: boolean;
  is_monome: boolean;
  has_encadrant: boolean;
  affectation: {
    theme: { id: string; titre: string; type_pfe: string } | null;
    encadrant: { id: string; nom: string; prenom: string } | null;
  } | null;
  has_binome: boolean;
  binome: { id: string | null; partenaire: { id: string; nom: string; prenom: string } } | null;
  nb_themes_proposes: number;
  nb_choix: number;
}

export interface SpecialiteStat {
  specialite: { id: string; nom: string };
  total: number;
  affectes: number;
  soutenus: number;
  valides: number;
  classiques: number;
  startups: number;
}

export interface ThemeSansEncadrant {
  id: string;
  titre: string;
  type_pfe: string;
  sous_types: string[];
  propose_par: { id: string; nom: string; prenom: string; role: string };
  theme_specialites: Array<{ specialite: { id: string; nom: string } }>;
  created_at: string;
}

export interface ThemesStatsResult {
  totaux: {
    total: number; valides: number; nonValides: number;
    affectes: number; nonAffectes: number; soutenus: number;
    classiques: number; startups: number; sansEncadrant: number;
  };
  parTypeStatut: Array<{ type_pfe: string; statut_validation: string; count: number }>;
  soutenusParType: Array<{ type_pfe: string; count: number }>;
  parSpecialite: SpecialiteStat[];
  sansEncadrant: ThemeSansEncadrant[];
}

// ─── Filtres ──────────────────────────────────────────────────────────────────

export interface EnseignantFilters { specialite_id?: string; categorie?: string }
export interface EtudiantFilters { specialite_id?: string; statut?: string }
export interface ThemeFilters { specialite_id?: string; type_pfe?: string; statut?: string }

// ─── API ──────────────────────────────────────────────────────────────────────

export async function getGlobalStats(): Promise<GlobalStats> {
  const { data } = await api.get<ApiResponse<GlobalStats>>('/stats/global');
  return data.data!;
}

export async function getEnseignantsStats(filters?: EnseignantFilters): Promise<EnseignantStatRow[]> {
  const { data } = await api.get<ApiResponse<EnseignantStatRow[]>>('/stats/enseignants', { params: filters });
  return data.data ?? [];
}

export async function getEtudiantsStats(filters?: EtudiantFilters): Promise<EtudiantStatRow[]> {
  const { data } = await api.get<ApiResponse<EtudiantStatRow[]>>('/stats/etudiants', { params: filters });
  return data.data ?? [];
}

export async function getThemesStats(filters?: ThemeFilters): Promise<ThemesStatsResult> {
  const { data } = await api.get<ApiResponse<ThemesStatsResult>>('/stats/themes', { params: filters });
  return data.data!;
}

export async function getEnseignantStats(): Promise<EnseignantStats> {
  const { data } = await api.get<ApiResponse<EnseignantStats>>('/stats/enseignant');
  return data.data!;
}

export async function exportStatsSection(
  section: 'enseignants' | 'etudiants',
  format: 'excel' | 'pdf',
  filters?: Record<string, string | undefined>,
): Promise<Blob> {
  const res = await api.get(`/stats/export/${section}/${format}`, {
    params: filters,
    responseType: 'blob',
  });
  return res.data as Blob;
}
