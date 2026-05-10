import { api } from './api';
import type { ApiResponse } from '@/types';

export interface BinomeMembre {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  matricule?: string;
  specialite?: { id: string; nom: string } | null;
}

export interface BinomeInfo {
  id: string;
  etud1: BinomeMembre;
  etud2: BinomeMembre;
  statut: 'PENDING' | 'ACCEPTED' | 'REFUSED';
  created_at: string;
}

export interface DemandeRecue {
  id: string;
  statut: 'PENDING';
  created_at: string;
  etud1: BinomeMembre;
}

export interface DemandeEnvoyee {
  id: string;
  statut: 'PENDING';
  created_at: string;
  etud2: BinomeMembre;
}

export interface EtudiantRecherche {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  matricule?: string;
  specialite?: { id: string; nom: string } | null;
  has_binome: boolean;
  demande_pending: { id: string; direction: 'envoyee' | 'recue' } | null;
}

export async function getMonBinome(): Promise<BinomeInfo | null> {
  const { data } = await api.get<ApiResponse<BinomeInfo>>('/binomes/mon-binome');
  return data.data ?? null;
}

export async function getDemandesRecues(): Promise<DemandeRecue[]> {
  const { data } = await api.get<ApiResponse<DemandeRecue[]>>('/binomes/demandes-recues');
  return data.data ?? [];
}

export async function getDemandesEnvoyees(): Promise<DemandeEnvoyee[]> {
  const { data } = await api.get<ApiResponse<DemandeEnvoyee[]>>('/binomes/demandes-envoyees');
  return data.data ?? [];
}

export async function rechercherEtudiants(
  search?: string,
  specialiteId?: string,
): Promise<EtudiantRecherche[]> {
  const { data } = await api.get<ApiResponse<EtudiantRecherche[]>>('/binomes/rechercher', {
    params: { search, specialite_id: specialiteId },
  });
  return data.data ?? [];
}

export async function demanderBinome(etudiantId: string): Promise<void> {
  await api.post('/binomes/demande', { etudiant_id: etudiantId });
}

export async function acceptBinome(id: string): Promise<void> {
  await api.patch(`/binomes/${id}/accept`);
}

export async function refuseBinome(id: string): Promise<void> {
  await api.patch(`/binomes/${id}/refuse`);
}
