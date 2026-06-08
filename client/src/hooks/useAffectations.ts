import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as affApi from '@/services/affectations.api';
import { extractApiError } from '@/services/api';

export function useMonAffectation() {
  return useQuery({
    queryKey: ['mon-affectation'],
    queryFn: affApi.getMonAffectation,
  });
}

export function useMesEtudiants() {
  return useQuery({
    queryKey: ['mes-etudiants'],
    queryFn: affApi.getMesEtudiants,
  });
}

export function useEnseignantsDispo(specialite_id?: string) {
  return useQuery({
    queryKey: ['enseignants-dispo', specialite_id],
    queryFn: () => affApi.getEnseignantsDispo(specialite_id),
  });
}

export function useEtudiantsSansTheme(specialite_id?: string) {
  return useQuery({
    queryKey: ['etudiants-sans-theme', specialite_id],
    queryFn: () => affApi.getEtudiantsSansTheme(specialite_id),
  });
}

export function useAffectations(filters?: { specialite_id?: string; session_id?: string; limit?: number }) {
  return useQuery({
    queryKey: ['affectations', filters],
    queryFn: () => affApi.getAffectations(filters),
    staleTime: 30 * 1000,
  });
}

export function useCreateAffectation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: affApi.createAffectation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['enseignants-dispo'] });
      void qc.invalidateQueries({ queryKey: ['etudiants-sans-theme'] });
      void qc.invalidateQueries({ queryKey: ['affectations'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Affectation créée — notifications envoyées');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useCreateStartupAffectation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: affApi.createStartupAffectation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['enseignants-dispo'] });
      void qc.invalidateQueries({ queryKey: ['etudiants-sans-theme'] });
      void qc.invalidateQueries({ queryKey: ['affectations'] });
      toast.success('Équipe startup affectée — notifications envoyées');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useAffectationAutoPreview() {
  return useMutation({
    mutationFn: affApi.getAffectationAutoPreview,
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useStartupEquipe(affectationId: string | undefined) {
  return useQuery({
    queryKey: ['startup-equipe', affectationId],
    queryFn: () => affApi.getStartupEquipe(affectationId!),
    enabled: !!affectationId,
  });
}

export function useMesStartups() {
  return useQuery({
    queryKey: ['mes-startups'],
    queryFn: affApi.getMesStartups,
  });
}

export function useAddMembreInterne() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ affectationId, dto }: { affectationId: string; dto: { etudiant_id: string; role_equipe?: string } }) =>
      affApi.addStartupMembre(affectationId, dto),
    onSuccess: (_, { affectationId }) => {
      void qc.invalidateQueries({ queryKey: ['startup-equipe', affectationId] });
      void qc.invalidateQueries({ queryKey: ['mes-startups'] });
      void qc.invalidateQueries({ queryKey: ['etudiants-sans-theme'] });
      toast.success('Membre ajouté à l\'équipe');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useAddMembreExterne() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ affectationId, dto }: { affectationId: string; dto: { nom: string; prenom: string; email: string; specialite?: string; universite?: string; commentaire?: string } }) =>
      affApi.addMembreExterne(affectationId, dto),
    onSuccess: (_, { affectationId }) => {
      void qc.invalidateQueries({ queryKey: ['startup-equipe', affectationId] });
      void qc.invalidateQueries({ queryKey: ['mes-startups'] });
      toast.success('Membre externe ajouté');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useRemoveMembreInterne() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ affectationId, etudiantId }: { affectationId: string; etudiantId: string }) =>
      affApi.removeStartupMembre(affectationId, etudiantId),
    onSuccess: (_, { affectationId }) => {
      void qc.invalidateQueries({ queryKey: ['startup-equipe', affectationId] });
      void qc.invalidateQueries({ queryKey: ['mes-startups'] });
      toast.success('Membre retiré');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function usePropositions(affectationId: string | undefined) {
  return useQuery({
    queryKey: ['propositions', affectationId],
    queryFn: () => affApi.getPropositions(affectationId!),
    enabled: !!affectationId,
  });
}

export function useProposerMembre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ affectationId, dto }: { affectationId: string; dto: Parameters<typeof affApi.proposerMembre>[1] }) =>
      affApi.proposerMembre(affectationId, dto),
    onSuccess: (_, { affectationId, dto }) => {
      void qc.invalidateQueries({ queryKey: ['propositions', affectationId] });
      // Candidat interne → invitation envoyée à l'étudiant. Candidat externe → envoyée à l'encadrant.
      toast.success(dto.candidat_interne_id ? 'Invitation envoyée à l\'étudiant' : 'Proposition envoyée à l\'encadrant');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useAccepterProposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ affectationId, propId }: { affectationId: string; propId: string }) =>
      affApi.accepterProposition(affectationId, propId),
    onSuccess: (_, { affectationId }) => {
      void qc.invalidateQueries({ queryKey: ['propositions', affectationId] });
      void qc.invalidateQueries({ queryKey: ['startup-equipe', affectationId] });
      void qc.invalidateQueries({ queryKey: ['mes-startups'] });
      void qc.invalidateQueries({ queryKey: ['etudiants-sans-theme'] });
      toast.success('Proposition acceptée');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useRefuserProposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ affectationId, propId }: { affectationId: string; propId: string }) =>
      affApi.refuserProposition(affectationId, propId),
    onSuccess: (_, { affectationId }) => {
      void qc.invalidateQueries({ queryKey: ['propositions', affectationId] });
      toast.success('Proposition refusée');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useMesInvitationsStartup() {
  return useQuery({
    queryKey: ['mes-invitations-startup'],
    queryFn: affApi.getMesInvitationsStartup,
  });
}

export function useEtudiantAccepteProposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (propId: string) => affApi.etudiantAccepteProposition(propId),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['mes-invitations-startup'] });
      void qc.invalidateQueries({ queryKey: ['mon-affectation'] });
      void qc.invalidateQueries({ queryKey: ['etudiants-sans-theme'] });
      toast.success(result.message);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useEtudiantRefuseProposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (propId: string) => affApi.etudiantRefuseProposition(propId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mes-invitations-startup'] });
      toast.success('Invitation refusée');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useUpdateAffectationTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ affectationId, theme_id }: { affectationId: string; theme_id: string }) =>
      affApi.updateAffectationTheme(affectationId, theme_id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mes-etudiants'] });
      void qc.invalidateQueries({ queryKey: ['affectations'] });
      void qc.invalidateQueries({ queryKey: ['themes', 'my'] });
      toast.success('Thème défini avec succès — les étudiants ont été notifiés');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useConfirmerAffectationsAuto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: affApi.confirmerAffectationsAuto,
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['enseignants-dispo'] });
      void qc.invalidateQueries({ queryKey: ['etudiants-sans-theme'] });
      void qc.invalidateQueries({ queryKey: ['affectations'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      const msg = result.errors.length > 0
        ? `${result.created}/${result.total} affectations créées (${result.errors.length} erreur(s))`
        : `${result.created} affectation(s) confirmée(s)`;
      toast.success(msg);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
