import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useImportUsers } from '@/hooks/useUsers';
import type { ImportResult } from '@/services/users.api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function ImportUsersDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportUsers();

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setShowErrors(false);
    onOpenChange(false);
  };

  const acceptFile = (f: File) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowed.includes(f.type) && !f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) return;
    setFile(f);
    setResult(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) acceptFile(selected);
    e.target.value = '';
  };

  const handleImport = () => {
    if (!file) return;
    importMutation.mutate(file, {
      onSuccess: (data) => setResult(data),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Importer des utilisateurs
          </DialogTitle>
          <DialogDescription>
            Fichier Excel (.xlsx) — max 500 lignes. Colonnes : email, nom, prenom, role, date_naissance, specialite (optionnel), matricule (optionnel).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Zone de dépôt */}
          {!result && (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => !file && fileInputRef.current?.click()}
              className={[
                'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : file
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 cursor-pointer',
              ].join(' ')}
              role={!file ? 'button' : undefined}
              aria-label={!file ? 'Sélectionner un fichier Excel' : undefined}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onFileChange}
                aria-hidden
              />

              {file ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className="size-8 text-green-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    aria-label="Supprimer le fichier"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="size-10 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-sm font-medium">Glissez votre fichier ici</p>
                    <p className="text-xs text-muted-foreground mt-1">ou cliquez pour sélectionner (.xlsx)</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Résultats */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                {result.errors.length === 0 ? (
                  <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="size-5 text-yellow-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Import terminé</p>
                  <p className="text-xs text-muted-foreground">
                    {result.imported} importé(s) sur {result.total} ligne(s)
                    {result.errors.length > 0 && ` · ${result.errors.length} erreur(s)`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge variant={result.imported > 0 ? 'success' : 'secondary'}>
                    {result.imported} OK
                  </Badge>
                  {result.errors.length > 0 && (
                    <Badge variant="warning">{result.errors.length} erreurs</Badge>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowErrors((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    {showErrors ? 'Masquer' : 'Voir'} les erreurs ({result.errors.length})
                  </button>
                  {showErrors && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-md border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Ligne</th>
                            <th className="text-left px-3 py-2 font-medium">Erreur</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {result.errors.map((err, i) => (
                            <tr key={i} className="hover:bg-muted/50">
                              <td className="px-3 py-1.5 text-muted-foreground">{err.row}</td>
                              <td className="px-3 py-1.5 text-destructive">{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>Fermer</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Annuler</Button>
              <Button onClick={handleImport} disabled={!file || importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Importer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
