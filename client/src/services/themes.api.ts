import { api } from './api';
import type { Theme, ApiResponse, CreateThemeForm, DemandeModification } from '@/types';

export interface ThemeFilters {
  specialite_id?: string;
  etudiant_specialite_id?: string;
  etudiant_id?: string;
  type_pfe?: string;
  statut_validation?: string;
  is_affecte?: boolean;
  besoin_encadrant?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  include_open_startup?: boolean;
}

export async function getThemes(filters?: ThemeFilters) {
  const { data } = await api.get<ApiResponse<Theme[]>>('/themes', { params: filters });
  return data;
}

export async function getThemeById(id: string) {
  const { data } = await api.get<ApiResponse<Theme>>(`/themes/${id}`);
  return data.data!;
}

export async function createTheme(dto: CreateThemeForm) {
  const { data } = await api.post<ApiResponse<Theme>>('/themes', dto);
  return data.data!;
}

export async function updateTheme(id: string, dto: Partial<CreateThemeForm>) {
  const { data } = await api.patch<ApiResponse<Theme>>(`/themes/${id}`, dto);
  return data.data!;
}

export async function deleteTheme(id: string) {
  await api.delete(`/themes/${id}`);
}

export async function validateTheme(id: string, action: 'VALIDE' | 'REFUSE', motif?: string) {
  const { data } = await api.patch<ApiResponse<Theme>>(`/themes/${id}/validate`, { action, motif });
  return data.data!;
}

export async function markAsSoutenu(id: string, isSoutenu: boolean) {
  const { data } = await api.patch<ApiResponse<Theme>>(`/themes/${id}/soutenu`, { is_soutenu: isSoutenu });
  return data.data!;
}

export async function createThemeAsAdmin(dto: CreateThemeForm & { propose_par_id: string }) {
  const { data } = await api.post<ApiResponse<Theme>>('/themes/admin', dto);
  return data.data!;
}

export interface RespFiliereInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export async function getMyThemes(filters?: Omit<ThemeFilters, 'enseignant_id'>) {
  const { data } = await api.get<ApiResponse<Theme[]>>('/themes/my', { params: filters });
  return data;
}

export async function getRespFiliereInfo(): Promise<RespFiliereInfo[]> {
  const { data } = await api.get<ApiResponse<RespFiliereInfo[]>>('/themes/resp-filiere-info');
  return data.data ?? [];
}

export interface AnnonceTheme {
  id: string;
  titre: string;
  description: string | null;
  type_pfe: string;
  mots_cles: string[];
  created_at: string;
  propose_par: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    specialite?: { id: string; nom: string } | null;
  };
  theme_specialites: Array<{ specialite: { id: string; nom: string } }>;
  session: { id: string; type: string; annee_universitaire: string } | null;
}

export interface AnnoncesResult {
  data: AnnonceTheme[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export async function getAnnonces(filters?: { specialite_id?: string }): Promise<AnnoncesResult> {
  const { data } = await api.get<{ success: boolean } & AnnoncesResult>('/annonces', { params: filters });
  return { data: data.data, meta: data.meta };
}

export async function exportThemes(
  format: 'excel' | 'pdf',
  filters?: Omit<ThemeFilters, 'page' | 'limit'>,
): Promise<Blob> {
  const response = await api.get(`/themes/export/${format}`, {
    params: filters,
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function getThemesAwaitingConfirmation(): Promise<Theme[]> {
  const { data } = await api.get<ApiResponse<Theme[]>>('/themes/awaiting-confirmation');
  return data.data ?? [];
}

export async function confirmEncadrant(id: string): Promise<Theme> {
  const { data } = await api.patch<ApiResponse<Theme>>(`/themes/${id}/confirm-encadrant`);
  return data.data!;
}

export async function refuseEncadrant(id: string): Promise<Theme> {
  const { data } = await api.patch<ApiResponse<Theme>>(`/themes/${id}/refuse-encadrant`);
  return data.data!;
}

export async function demanderModification(themeId: string, motif: string): Promise<DemandeModification> {
  const { data } = await api.post<ApiResponse<DemandeModification>>(`/themes/${themeId}/demandes-modification`, { motif });
  return data.data!;
}

export async function getDemandesModification(statut?: 'PENDING' | 'ACCEPTED' | 'REFUSED'): Promise<DemandeModification[]> {
  const { data } = await api.get<ApiResponse<DemandeModification[]>>('/themes/demandes-modification', {
    params: statut ? { statut } : {},
  });
  return data.data ?? [];
}

export async function getAnnoncesEncadrement(filters?: { specialite_id?: string }): Promise<AnnoncesResult> {
  const { data } = await api.get<{ success: boolean } & AnnoncesResult>('/annonces/encadrement', { params: filters });
  return { data: data.data, meta: data.meta };
}

export async function postulerEncadrant(id: string): Promise<Theme> {
  const { data } = await api.patch<ApiResponse<Theme>>(`/themes/${id}/postuler-encadrant`);
  return data.data!;
}

export async function traiterDemandeModification(
  demandeId: string,
  decision: 'ACCEPTED' | 'REFUSED',
  commentaire?: string,
): Promise<void> {
  await api.patch(`/themes/demandes-modification/${demandeId}`, { decision, commentaire });
}

export async function getThemesAwaitingCoEncadrant(): Promise<Theme[]> {
  const { data } = await api.get<ApiResponse<Theme[]>>('/themes/awaiting-co-encadrant');
  return data.data ?? [];
}

export async function confirmCoEncadrant(id: string): Promise<Theme> {
  const { data } = await api.patch<ApiResponse<Theme>>(`/themes/${id}/confirm-co-encadrant`);
  return data.data!;
}

export async function refuseCoEncadrant(id: string): Promise<Theme> {
  const { data } = await api.patch<ApiResponse<Theme>>(`/themes/${id}/refuse-co-encadrant`);
  return data.data!;
}
