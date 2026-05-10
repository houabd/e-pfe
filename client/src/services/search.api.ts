import { api } from './api';
import type { ApiResponse } from '@/types';

export interface SearchSuggestion {
  text: string;
  type: 'etudiant' | 'enseignant' | 'theme';
}

export async function getSearchSuggestions(q: string): Promise<SearchSuggestion[]> {
  const { data } = await api.get<ApiResponse<SearchSuggestion[]>>('/search/suggestions', { params: { q } });
  return data.data ?? [];
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchEtudiant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  matricule?: string | null;
  specialite?: { id: string; nom: string } | null;
  affectation?: {
    theme: { id: string; titre: string; type_pfe: string } | null;
    encadrant: { id: string; nom: string; prenom: string } | null;
  } | null;
}

export interface SearchEnseignant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  specialite?: { id: string; nom: string } | null;
  nb_affectations: number;
}

export interface SearchTheme {
  id: string;
  titre: string;
  type_pfe: string;
  statut_validation: string;
  is_affecte: boolean;
  is_soutenu: boolean;
  propose_par: { nom: string; prenom: string };
  theme_specialites: Array<{ specialite: { id: string; nom: string } }>;
  affectation?: {
    encadrant: { id: string; nom: string; prenom: string } | null;
    etudiants: Array<{ etudiant: { id: string; nom: string; prenom: string } }>;
  } | null;
}

export interface SearchResult {
  etudiants: SearchEtudiant[];
  enseignants: SearchEnseignant[];
  themes: SearchTheme[];
  query: string;
  total: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function globalSearch(q: string, page = 1): Promise<SearchResult> {
  const { data } = await api.get<ApiResponse<SearchResult>>('/search', {
    params: { q, page, limit: 30 },
  });
  return data.data!;
}
