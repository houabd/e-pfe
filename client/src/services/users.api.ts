import { api } from './api';
import type { User, ApiResponse, PaginationMeta } from '@/types';

export interface UserFilters {
  role?: string;
  specialite_id?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  meta: PaginationMeta;
}

export interface CreateUserPayload {
  email: string;
  nom: string;
  prenom: string;
  role: string;
  specialite_id?: string;
  date_naissance: string;
  matricule?: string;
  annee_universitaire?: string;
}

export interface ImportResult {
  imported: number;
  total: number;
  errors: { row: number; message: string }[];
}

export async function getUsers(filters?: UserFilters): Promise<UsersResponse> {
  const { data } = await api.get<UsersResponse>('/users', { params: filters });
  return data;
}

export async function createUser(dto: CreateUserPayload): Promise<User> {
  const { data } = await api.post<ApiResponse<User>>('/users', dto);
  return data.data!;
}

export interface UpdateUserPayload {
  nom?: string;
  prenom?: string;
  email?: string;
  role?: string;
  specialite_id?: string | null;
  matricule?: string | null;
  annee_universitaire?: string | null;
  date_naissance?: string | null;
}

export async function updateUser(id: string, dto: UpdateUserPayload): Promise<User> {
  const { data } = await api.patch<ApiResponse<User>>(`/users/${id}`, dto);
  return data.data!;
}

export async function toggleUserActive(id: string): Promise<User> {
  const { data } = await api.patch<ApiResponse<User>>(`/users/${id}/toggle-active`);
  return data.data!;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function hardDeleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}/hard`);
}

export async function bulkDeleteUsers(ids: string[]): Promise<{ count: number }> {
  const { data } = await api.post<ApiResponse<{ count: number }>>('/users/bulk-delete', { ids, permanent: false });
  return data.data!;
}

export async function bulkHardDeleteUsers(ids: string[]): Promise<{ count: number }> {
  const { data } = await api.post<ApiResponse<{ count: number }>>('/users/bulk-delete', { ids, permanent: true });
  return data.data!;
}

export async function importUsers(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<ApiResponse<ImportResult>>('/users/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data!;
}

export async function exportUsers(format: 'excel' | 'pdf', filters?: Omit<UserFilters, 'page' | 'limit'>): Promise<Blob> {
  const response = await api.get(`/users/export/${format}`, {
    params: filters,
    responseType: 'blob',
  });
  return response.data as Blob;
}
