import { api } from './api';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

export interface RagDocument {
  id: string;
  titre: string;
  file_path: string;
  nb_chunks: number;
  created_at: string;
  uploader: { nom: string; prenom: string; role: string };
}

export interface UploadResult {
  id: string;
  titre: string;
  nb_chunks: number;
  embedding_error?: string;
}

export async function getRagDocuments(): Promise<RagDocument[]> {
  const { data } = await api.get<ApiResponse<RagDocument[]>>('/chatbot/documents');
  return data.data ?? [];
}

export async function uploadRagDocument(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ApiResponse<UploadResult>>('/chatbot/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data.data!;
}

export async function deleteRagDocument(id: string): Promise<void> {
  await api.delete(`/chatbot/documents/${id}`);
}

// ─── Streaming ────────────────────────────────────────────────────────────────

interface StreamEvent {
  type: 'chunk' | 'done' | 'error' | 'fallback';
  content?: string;
  message?: string;
  sources?: string[];
  chunks_used?: number;
  source_type?: 'pdf' | 'general';
  warning?: string;
}

export function askQuestionStream(
  question: string,
  callbacks: {
    onChunk: (content: string) => void;
    onDone: (sources: string[], chunks_used: number, source_type?: 'pdf' | 'general') => void;
    onFallback: (content: string, warning: string) => void;
    onError: (message: string) => void;
  },
): AbortController {
  const controller = new AbortController();

  void (async () => {
    try {
      const token = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BASE_URL}/chatbot/ask-stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        callbacks.onError('Erreur de connexion au serveur.');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          try {
            const event = JSON.parse(trimmed.slice(5).trim()) as StreamEvent;
            if (event.type === 'chunk' && event.content) callbacks.onChunk(event.content);
            else if (event.type === 'done') callbacks.onDone(event.sources ?? [], event.chunks_used ?? 0, event.source_type);
            else if (event.type === 'fallback') callbacks.onFallback(event.content ?? '', event.warning ?? '');
            else if (event.type === 'error') callbacks.onError(event.message ?? 'Erreur inconnue.');
          } catch { /* ignore malformed lines */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        callbacks.onError('Une erreur est survenue. Veuillez réessayer.');
      }
    }
  })();

  return controller;
}
