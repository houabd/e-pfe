import { api } from './api';
import type { ApiResponse } from '@/types';

// ─── Types partagés ──────────────────────────────────────────────────────────

export interface EtudiantEncadre {
  id: string;
  binome_id?: string | null;
  etudiant: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    matricule?: string;
    specialite?: { id: string; nom: string };
  };
  affectation: {
    id: string;
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
  nb_affectations: number;
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
  themes_valides: ThemeDispo[];
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

export interface MembreExterne {
  id: string;
  affectation_id: string;
  nom: string;
  prenom: string;
  email: string;
  specialite?: string | null;
  universite?: string | null;
  commentaire?: string | null;
  created_at: string;
}

export interface StartupMembreInterne {
  id: string;
  etudiant: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    matricule?: string;
    specialite?: { id: string; nom: string } | null;
  };
  role_equipe?: string | null;
}

export interface StartupEquipe {
  id: string;
  theme: {
    id: string;
    titre: string;
    type_pfe: string;
    encadrant_externe: { nom?: string; prenom?: string; email?: string; institution?: string } | null;
    theme_specialites: Array<{ specialite: { id: string; nom: string } }>;
  } | null;
  encadrant: { id: string; nom: string; prenom: string; email: string } | null;
  startup_membres: StartupMembreInterne[];
  membres_externes: MembreExterne[];
  etudiants: Array<{
    etudiant: {
      id: string;
      nom: string;
      prenom: string;
      email: string;
      matricule?: string;
      specialite?: { id: string; nom: string } | null;
    };
  }>;
}

export interface PropositionMembre {
  id: string;
  affectation_id: string;
  proposeur_id: string;
  proposeur: { id: string; nom: string; prenom: string };
  candidat_interne_id?: string | null;
  candidat_interne?: {
    id: string; nom: string; prenom: string; email: string;
    specialite?: { id: string; nom: string } | null;
  } | null;
  candidat_externe?: {
    nom: string; prenom: string; email: string;
    specialite?: string; universite?: string; commentaire?: string;
  } | null;
  statut: 'PENDING' | 'ACCEPTED' | 'REFUSED';
  etudiant_accepte: boolean;
  created_at: string;
}

export interface InvitationStartup {
  id: string;
  affectation_id: string;
  proposeur: { id: string; nom: string; prenom: string };
  affectation: {
    id: string;
    theme: { id: string; titre: string; type_pfe: string } | null;
    encadrant: { id: string; nom: string; prenom: string } | null;
  };
  statut: 'PENDING';
  created_at: string;
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
  nb_coequipiers: number;
  coequipiers: Array<{ id: string; nom: string; prenom: string; email: string; specialite?: { id: string; nom: string } | null }>;
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

export async function getMesStartups(): Promise<StartupEquipe[]> {
  const { data } = await api.get<ApiResponse<StartupEquipe[]>>('/affectations/mes-startups');
  return data.data ?? [];
}

export async function getStartupEquipe(affectationId: string): Promise<StartupEquipe> {
  const { data } = await api.get<ApiResponse<StartupEquipe>>(`/affectations/${affectationId}/equipe`);
  return data.data!;
}

export async function addStartupMembre(
  affectationId: string,
  dto: { etudiant_id: string; role_equipe?: string },
): Promise<StartupMembreInterne> {
  const { data } = await api.post<ApiResponse<StartupMembreInterne>>(`/affectations/${affectationId}/equipe`, dto);
  return data.data!;
}

export async function addStartupMembreFromTheme(
  themeId: string,
  dto: { etudiant_id: string },
): Promise<{ type: 'INVITATION'; proposition: unknown }> {
  const { data } = await api.post<ApiResponse<{ type: 'INVITATION'; proposition: unknown }>>(`/affectations/startup/theme/${themeId}/membres`, dto);
  return data.data!;
}

export async function addMembreExterne(
  affectationId: string,
  dto: { nom: string; prenom: string; email: string; specialite?: string; universite?: string; commentaire?: string },
): Promise<MembreExterne> {
  const { data } = await api.post<ApiResponse<MembreExterne>>(`/affectations/${affectationId}/equipe/externe`, dto);
  return data.data!;
}

export async function removeStartupMembre(affectationId: string, etudiantId: string): Promise<void> {
  await api.delete(`/affectations/${affectationId}/equipe/${etudiantId}`);
}

export async function getPropositions(affectationId: string): Promise<PropositionMembre[]> {
  const { data } = await api.get<ApiResponse<PropositionMembre[]>>(`/affectations/${affectationId}/propositions`);
  return data.data ?? [];
}

export async function proposerMembre(
  affectationId: string,
  dto: {
    candidat_interne_id?: string;
    candidat_externe?: { nom: string; prenom: string; email: string; specialite?: string; universite?: string; commentaire?: string };
  },
): Promise<PropositionMembre> {
  const { data } = await api.post<ApiResponse<PropositionMembre>>(`/affectations/${affectationId}/propositions`, dto);
  return data.data!;
}

export async function accepterProposition(affectationId: string, propId: string): Promise<void> {
  await api.patch(`/affectations/${affectationId}/propositions/${propId}/accepter`);
}

export async function refuserProposition(affectationId: string, propId: string): Promise<void> {
  await api.patch(`/affectations/${affectationId}/propositions/${propId}/refuser`);
}

export async function updateAffectationTheme(affectationId: string, theme_id: string): Promise<AffectationFull> {
  const { data } = await api.patch<ApiResponse<AffectationFull>>(`/affectations/${affectationId}/theme`, { theme_id });
  return data.data!;
}

export async function getMesInvitationsStartup(): Promise<InvitationStartup[]> {
  const { data } = await api.get<ApiResponse<InvitationStartup[]>>('/affectations/mes-invitations');
  return data.data ?? [];
}

export async function etudiantAccepteProposition(propId: string): Promise<{ message: string; statut: string }> {
  const { data } = await api.patch<ApiResponse<{ message: string; statut: string }>>(`/affectations/propositions/${propId}/etudiant-accepter`);
  return data.data!;
}

export async function etudiantRefuseProposition(propId: string): Promise<{ message: string }> {
  const { data } = await api.patch<ApiResponse<{ message: string }>>(`/affectations/propositions/${propId}/etudiant-refuser`);
  return data.data!;
}

// ─── Historique encadrement ───────────────────────────────────────────────────

export interface EtudiantHistorique {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  matricule?: string | null;
  specialite?: { id: string; nom: string } | null;
  type_affectation: 'CLASSIQUE' | 'STARTUP';
}

export interface ThemeEncadre {
  id: string;
  titre: string;
  type_pfe: 'CLASSIQUE' | 'STARTUP';
  sous_types: string[];
  statut_validation: 'NON_VALIDE' | 'VALIDE';
  is_soutenu: boolean;
  session: { id: string; type: string; annee_universitaire: string };
  theme_specialites: Array<{ specialite: { id: string; nom: string } }>;
  mon_role: 'PROPOSANT' | 'ENCADRANT' | 'CO_ENCADRANT';
  etudiants: EtudiantHistorique[];
}

export async function getHistoriqueEncadrement(anneeUniversitaire?: string): Promise<ThemeEncadre[]> {
  const { data } = await api.get<ApiResponse<ThemeEncadre[]>>('/affectations/historique-encadrement', {
    params: anneeUniversitaire ? { annee_universitaire: anneeUniversitaire } : {},
  });
  return data.data ?? [];
}

export async function exportHistoriqueExcel(anneeUniversitaire?: string): Promise<Blob> {
  const response = await api.get('/affectations/historique-encadrement/export', {
    params: anneeUniversitaire ? { annee_universitaire: anneeUniversitaire } : {},
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function exportHistoriquePDF(anneeUniversitaire?: string): Promise<Blob> {
  const response = await api.get('/affectations/historique-encadrement/export-pdf', {
    params: anneeUniversitaire ? { annee_universitaire: anneeUniversitaire } : {},
    responseType: 'blob',
  });
  return response.data as Blob;
}
