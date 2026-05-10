import { api } from './api';
import type { ApiResponse } from '@/types';

export interface Specialite {
  id: string;
  nom: string;
  is_active: boolean;
  created_at: string;
  nb_utilisateurs: number;
  nb_themes: number;
}

export async function getSpecialites(): Promise<Specialite[]> {
  const { data } = await api.get<ApiResponse<Specialite[]>>('/specialites');
  return data.data ?? [];
}

export async function createSpecialite(nom: string): Promise<Specialite> {
  const { data } = await api.post<ApiResponse<Specialite>>('/specialites', { nom });
  return data.data!;
}

export async function toggleSpecialite(id: string): Promise<Specialite> {
  const { data } = await api.patch<ApiResponse<Specialite>>(`/specialites/${id}/toggle`);
  return data.data!;
}

export async function deleteSpecialite(id: string): Promise<void> {
  await api.delete(`/specialites/${id}`);
}
