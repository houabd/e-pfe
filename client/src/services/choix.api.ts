import { api } from './api';
import type { ApiResponse } from '@/types';

export interface MonChoix {
  id: string;
  ordre: number;
  statut: 'PENDING' | 'ACCEPTED' | 'REFUSED';
  etudiant?: {
    id: string;
    nom: string;
    prenom: string;
  };
  theme: {
    id: string;
    titre: string;
    type_pfe: string;
    statut_validation: string;
    is_affecte: boolean;
    encadrant?: { id: string; nom: string; prenom: string } | null;
    theme_specialites: Array<{ specialite: { id: string; nom: string } }>;
  };
}

export interface MesChoixResult {
  choix: MonChoix[];
  peutRechoisir: boolean;
}

type MesChoixApiResponse = {
  success: boolean;
  data: MonChoix[];
  meta?: { peutRechoisir?: boolean };
};

export async function getMesChoix(): Promise<MesChoixResult> {
  const { data } = await api.get<MesChoixApiResponse>('/choix/mes-choix');
  return {
    choix: data.data ?? [],
    peutRechoisir: data.meta?.peutRechoisir ?? false,
  };
}

export async function submitChoix(dto: { theme_id: string; ordre: number }): Promise<MonChoix> {
  const { data } = await api.post<ApiResponse<MonChoix>>('/choix', dto);
  return data.data!;
}

export interface DemandeEnseignant {
  id: string;
  ordre: number;
  statut: 'PENDING' | 'ACCEPTED' | 'REFUSED';
  created_at: string;
  etudiant: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    specialite?: { id: string; nom: string };
  };
  theme: { id: string; titre: string; type_pfe: string };
  binome?: {
    id: string;
    etud1: { id: string; nom: string; prenom: string; email: string; specialite?: { id: string; nom: string } | null };
    etud2: { id: string; nom: string; prenom: string; email: string; specialite?: { id: string; nom: string } | null };
  } | null;
}

export async function getDemandesEnseignant(): Promise<DemandeEnseignant[]> {
  const { data } = await api.get<ApiResponse<DemandeEnseignant[]>>('/choix/enseignant');
  return data.data ?? [];
}

export async function acceptChoix(id: string): Promise<void> {
  await api.patch(`/choix/${id}/accept`);
}

export async function refuseChoix(id: string): Promise<void> {
  await api.patch(`/choix/${id}/refuse`);
}
