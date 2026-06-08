import { api } from './api';
import type { ApiResponse } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SoutenanceTheme {
  id: string;
  titre: string;
  is_soutenu: boolean;
  theme_specialites: Array<{ specialite: { id: string; nom: string } }>;
  affectation: {
    encadrant: { id: string; nom: string; prenom: string; email: string } | null;
    etudiants: Array<{ etudiant: { id: string; nom: string; prenom: string; matricule: string } }>;
  } | null;
}

export interface SoutenanceJuryMembre {
  enseignant: { id: string; nom: string; prenom: string; email: string };
  role: 'PRESIDENT' | 'EXAMINATEUR';
}

export interface SoutenanceFull {
  id: string;
  date_soutenance: string;
  heure: string;
  salle: string;
  annee_universitaire: string;
  theme: SoutenanceTheme;
  jury: SoutenanceJuryMembre[];
}

export interface EnseignantDispoSoutenance {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  specialite?: { id: string; nom: string } | null;
}

export interface CreateSoutenanceDto {
  theme_id: string;
  date_soutenance: string;
  heure: string;
  salle: string;
  annee_universitaire: string;
  jury: Array<{ enseignant_id: string; role: 'PRESIDENT' | 'EXAMINATEUR' }>;
}

export interface SoutenanceFilters {
  annee_universitaire?: string;
  specialite_id?: string;
  page?: number;
  limit?: number;
}

export interface SoutenancesResult {
  data: SoutenanceFull[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getSoutenances(filters?: SoutenanceFilters): Promise<SoutenancesResult> {
  const { data } = await api.get<{ success: boolean } & SoutenancesResult>('/soutenances', {
    params: filters,
  });
  return { data: data.data, meta: data.meta };
}

export async function getSoutenanceById(id: string): Promise<SoutenanceFull> {
  const { data } = await api.get<ApiResponse<SoutenanceFull>>(`/soutenances/${id}`);
  return data.data!;
}

export async function createSoutenance(dto: CreateSoutenanceDto): Promise<SoutenanceFull> {
  const { data } = await api.post<ApiResponse<SoutenanceFull>>('/soutenances', dto);
  return data.data!;
}

export async function updateSoutenance(
  id: string,
  dto: Partial<CreateSoutenanceDto>,
): Promise<SoutenanceFull> {
  const { data } = await api.patch<ApiResponse<SoutenanceFull>>(`/soutenances/${id}`, dto);
  return data.data!;
}

export async function getEnseignantsDisponibles(filters: {
  date?: string;
  heure?: string;
  theme_id?: string;
  soutenance_id?: string;
}): Promise<EnseignantDispoSoutenance[]> {
  const { data } = await api.get<ApiResponse<EnseignantDispoSoutenance[]>>(
    '/soutenances/enseignants-disponibles',
    { params: filters },
  );
  return data.data ?? [];
}

export async function exportSoutenancesPDF(
  filters?: { annee_universitaire?: string; specialite_id?: string },
): Promise<Blob> {
  const response = await api.get('/soutenances/export-pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function exportSoutenancesExcel(
  filters?: { annee_universitaire?: string; specialite_id?: string },
): Promise<Blob> {
  const response = await api.get('/soutenances/export-excel', {
    params: filters,
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function deleteSoutenance(id: string): Promise<void> {
  await api.delete(`/soutenances/${id}`);
}

export async function getMaSoutenance(): Promise<SoutenanceFull | null> {
  const { data } = await api.get<ApiResponse<SoutenanceFull | null>>('/soutenances/ma-soutenance');
  return data.data ?? null;
}

export interface SoutenanceJury extends SoutenanceFull {
  role_jury: 'PRESIDENT' | 'EXAMINATEUR';
}

export async function getMesSoutenancesJury(): Promise<SoutenanceJury[]> {
  const { data } = await api.get<ApiResponse<SoutenanceJury[]>>('/soutenances/mes-jurys');
  return data.data ?? [];
}
