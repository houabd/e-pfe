import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, FileText, AlertTriangle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getRagDocuments, uploadRagDocument, deleteRagDocument } from '@/services/chatbot.api';
import type { RagDocument } from '@/services/chatbot.api';
import { toast } from 'sonner';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function GestionDocumentsRAG() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RagDocument | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['rag-documents'],
    queryFn: getRagDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadRagDocument(file, setUploadProgress),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });
      setUploadProgress(null);
      if (result.embedding_error) {
        toast.warning(`"${result.titre}" sauvegardé mais sans embeddings : ${result.embedding_error}`);
      } else {
        toast.success(`"${result.titre}" indexé — ${result.nb_chunks} chunks`);
      }
    },
    onError: (err: Error) => {
      setUploadProgress(null);
      toast.error(err.message || 'Erreur lors de l\'upload');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRagDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });
      setDeleteTarget(null);
      toast.success('Document supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }
    uploadMutation.mutate(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow">
          <Database className="size-5" />
        </div>
        <div>
          <h1 className="font-bold text-xl">Base de connaissances</h1>
          <p className="text-sm text-muted-foreground">Documents PDF indexés pour l'assistant IA</p>
        </div>
      </div>

      {/* Zone upload */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ajouter un document</CardTitle></CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none',
              dragging ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20' : 'border-muted-foreground/25 hover:border-violet-400 hover:bg-muted/40',
              uploadMutation.isPending && 'pointer-events-none opacity-60',
            )}
          >
            <Upload className="size-8 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-sm">Glissez un PDF ici ou cliquez pour sélectionner</p>
            <p className="text-xs text-muted-foreground mt-1">PDF uniquement · Max 50 Mo</p>
          </div>

          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

          {uploadProgress !== null && (
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Upload en cours…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-violet-500 transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
              </div>
              {uploadProgress === 100 && (
                <p className="text-xs text-muted-foreground animate-pulse">Indexation en cours…</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents indexés ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
          ) : documents.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <FileText className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun document dans la base de connaissances</p>
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 py-3">
                  <FileText className="size-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{doc.titre}</p>
                      {doc.nb_chunks === 0 ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1 shrink-0">
                          <AlertTriangle className="size-2.5" /> Sans embeddings
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">{doc.nb_chunks} chunks</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(doc.created_at)} · {doc.uploader.prenom} {doc.uploader.nom}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setDeleteTarget(doc)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog confirmation suppression */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le document</DialogTitle>
            <DialogDescription>
              Supprimer <strong>"{deleteTarget?.titre}"</strong> et tous ses chunks vectoriels ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
