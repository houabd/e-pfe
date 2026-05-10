import { api } from './api';
import type { Session, ApiResponse } from '@/types';

export interface CreateSessionPayload {
  type: 'CHOIX' | 'AFFECTATION';
  date_debut: string;
  date_fin: string;
  annee_universitaire: string;
}

export type UpdateSessionPayload = Partial<CreateSessionPayload> & { is_active?: boolean };

export async function getSessions(): Promise<Session[]> {
  const { data } = await api.get<ApiResponse<Session[]>>('/sessions');
  return data.data ?? [];
}

export async function createSession(dto: CreateSessionPayload): Promise<Session> {
  const { data } = await api.post<ApiResponse<Session>>('/sessions', dto);
  return data.data!;
}

export async function updateSession(id: string, dto: UpdateSessionPayload): Promise<Session> {
  const { data } = await api.patch<ApiResponse<Session>>(`/sessions/${id}`, dto);
  return data.data!;
}

export async function closeSession(id: string): Promise<Session> {
  const { data } = await api.patch<ApiResponse<Session>>(`/sessions/${id}/close`);
  return data.data!;
}
