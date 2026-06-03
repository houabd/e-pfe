import { api } from './api';
import type { ApiResponse } from '@/types';

// ─── Types partagés ──────────────────────────────────────────────────────────

export interface EtudiantEncadre {
  etudiant: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    matricule?: string;
    specialite?: { id: string; nom: string };
  };
  affectation: {
    theme: { id: string; titre: string; type_pfe: string } | null;
  };
}

export interface ThemeDispo {
  id: string;
  titre: string;
  type_pfe: 'CLASSIQUE' | 'STARTUP';
  theme_specialites: Array<{ specialite: { id: string; nom: string } }>;
}

export interface EnseignantDispo {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  specialite: { id: string; nom: string } | null;
  nb_etudiants: number;
  sans_proposition: boolean;
  themes_encadres: ThemeDispo[];
}

export interface EtudiantSansTheme {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  matricule?: string | null;
  specialite: { id: string; nom: string } | null;
  binome: { id: string; partenaire: { id: string; nom: string; prenom: string } } | null;
}

export interface AutoSuggestion {
  theme_id: string;
  theme_titre: string;
  theme_type_pfe: string;
  specialites: { id: string; nom: string }[];
  encadrant: { id: string; nom: string; prenom: string; email: string };
  etudiant_ids: string[];
  binome_id?: string;
  etudiants: { id: string; nom: string; prenom: string; email: string; specialite: { id: string; nom: string } | null }[];
}

export interface AutoResult {
  suggestions: AutoSuggestion[];
  non_affectes: { id: string; nom: string; prenom: string; email: string; specialite: { id: string; nom: string } | null }[];
  stats: {
    total_suggestions: number;
    etudiants_affectes: number;
    etudiants_non_affectes: number;
    themes_utilises: number;
  };
}

export interface ConfirmerAutoPayload {
  suggestions: Array<{
    theme_id: string;
    encadrant_id: string;
    etudiant_ids: string[];
    binome_id?: string;
  }>;
}

export interface ConfirmerAutoResult {
  created: number;
  errors: { theme_id: string; message: string }[];
  total: number;
}

export interface AffectationFull {
  id: string;
  type: 'LIBRE' | 'AUTO';
  created_at: string;
  theme: {
    id: string;
    titre: string;
    type_pfe: string;
    theme_specialites: Array<{ specialite: { id: string; nom: string } }>;
  } | null;  // null si le thème n'a pas encore été défini
  encadrant: { id: string; nom: string; prenom: string; email: string } | null;
  etudiants: Array<{ etudiant: { id: string; nom: string; prenom: string; email: string; matricule?: string } }>;
}

// ─── API functions ────────────────────────────────────────────────────────────

export interface MonAffectation {
  id: string;
  type: 'LIBRE' | 'AUTO';
  theme: { id: string; titre: string; type_pfe: string } | null;
  encadrant: { id: string; nom: string; prenom: string } | null;
}

export async function getMonAffectation(): Promise<MonAffectation | null> {
  const { data } = await api.get<ApiResponse<MonAffectation | null>>('/affectations/mon-affectation');
  return data.data ?? null;
}

export async function getMesEtudiants(): Promise<EtudiantEncadre[]> {
  const { data } = await api.get<ApiResponse<EtudiantEncadre[]>>('/affectations/mes-etudiants');
  return data.data ?? [];
}

export async function getEnseignantsDispo(specialite_id?: string): Promise<EnseignantDispo[]> {
  const { data } = await api.get<ApiResponse<EnseignantDispo[]>>('/affectations/enseignants-dispo', {
    params: specialite_id ? { specialite_id } : {},
  });
  return data.data ?? [];
}

export async function getEtudiantsSansTheme(specialite_id?: string): Promise<EtudiantSansTheme[]> {
  const { data } = await api.get<ApiResponse<EtudiantSansTheme[]>>('/affectations/etudiants-sans-theme', {
    params: specialite_id ? { specialite_id } : {},
  });
  return data.data ?? [];
}

export async function getAffectations(filters?: { specialite_id?: string; session_id?: string; limit?: number }): Promise<{ data: AffectationFull[]; meta: { total: number } }> {
  const { data } = await api.get<{ success: boolean; data: AffectationFull[]; meta: { total: number } }>('/affectations', { params: filters });
  return { data: data.data, meta: data.meta };
}

export async function createAffectation(dto: {
  theme_id?: string;    // optionnel — thème défini plus tard par l'enseignant
  encadrant_id: string;
  etudiant_ids: string[];
  binome_id?: string;
}): Promise<AffectationFull> {
  const { data } = await api.post<ApiResponse<AffectationFull>>('/affectations', dto);
  return data.data!;
}

export async function getAffectationAutoPreview(): Promise<AutoResult> {
  const { data } = await api.post<ApiResponse<AutoResult>>('/affectations/auto');
  return data.data!;
}

export async function confirmerAffectationsAuto(payload: ConfirmerAutoPayload): Promise<ConfirmerAutoResult> {
  const { data } = await api.post<ApiResponse<ConfirmerAutoResult>>('/affectations/auto/confirmer', payload);
  return data.data!;
}

export async function createStartupAffectation(dto: {
  theme_id: string;
  etudiant_ids: string[];
  role_equipes?: Record<string, string>;
}): Promise<unknown> {
  const { data } = await api.post<ApiResponse<unknown>>('/affectations/startup', dto);
  return data.data!;
}

export async function addStartupMembre(
  affectationId: string,
  dto: { etudiant_id: string; role_equipe?: string },
): Promise<unknown> {
  const { data } = await api.post<ApiResponse<unknown>>(`/affectations/${affectationId}/equipe`, dto);
  return data.data!;
}

export async function removeStartupMembre(affectationId: string, etudiantId: string): Promise<void> {
  await api.delete(`/affectations/${affectationId}/equipe/${etudiantId}`);
}
