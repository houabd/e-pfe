import fs from 'fs';
import path from 'path';
import type { Response } from 'express';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { NotFoundError } from '../middleware/error.middleware';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'rag');

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// ─── Upload + indexation (délégué au microservice Python) ─────────────────────

export async function uploadDocument(
  file: Express.Multer.File,
  uploadedBy: string,
): Promise<{ id: string; titre: string; nb_chunks: number; embedding_error?: string }> {
  ensureUploadsDir();

  const titre = path.parse(file.originalname).name;

  const doc = await prisma.documentRag.create({
    data: { titre, file_path: file.path, uploaded_by: uploadedBy, nb_chunks: 0 },
  });

  try {
    const form = new FormData();
    const fileBuffer = fs.readFileSync(file.path);
    form.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), file.originalname);

    const response = await fetch(
      `${env.RAG_SERVICE_URL}/chatbot/embed-document?document_id=${doc.id}`,
      { method: 'POST', body: form, signal: AbortSignal.timeout(300_000) },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`RAG service error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as { nb_chunks: number };
    await prisma.documentRag.update({
      where: { id: doc.id },
      data: { nb_chunks: data.nb_chunks },
    });

    logger.info(`RAG: document "${titre}" indexé — ${data.nb_chunks} chunks`);
    return { id: doc.id, titre, nb_chunks: data.nb_chunks };

  } catch (err) {
    const embedding_error = err instanceof Error ? err.message : String(err);
    logger.warn(`RAG: embedding échoué pour "${titre}"`, err);
    return { id: doc.id, titre, nb_chunks: 0, embedding_error };
  }
}

// ─── Liste des documents ──────────────────────────────────────────────────────

export async function getDocuments() {
  return prisma.documentRag.findMany({
    include: { uploader: { select: { nom: true, prenom: true, role: true } } },
    orderBy: { created_at: 'desc' },
  });
}

// ─── Suppression ──────────────────────────────────────────────────────────────

export async function deleteDocument(id: string): Promise<void> {
  const doc = await prisma.documentRag.findUnique({ where: { id } });
  if (!doc) throw new NotFoundError('Document');

  try {
    await fetch(`${env.RAG_SERVICE_URL}/chatbot/document/${id}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.warn(`RAG: impossible de supprimer les chunks pour ${id}`, err);
  }

  await prisma.documentRag.delete({ where: { id } });

  if (doc.file_path && fs.existsSync(doc.file_path)) {
    fs.unlinkSync(doc.file_path);
  }
}

// ─── Proxy SSE vers le microservice Python ────────────────────────────────────

export async function proxyAskStream(question: string, res: Response): Promise<void> {
  const response = await fetch(`${env.RAG_SERVICE_URL}/chatbot/ask-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok || !response.body) {
    const msg = JSON.stringify({ type: 'error', message: 'Le service RAG est indisponible.' });
    res.write(`data: ${msg}\n\n`);
    res.end();
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      if (res.writableEnded) break;
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
    if (!res.writableEnded) res.end();
  }
}
