import { prisma } from '../config/database';

export type SuggestionType = 'etudiant' | 'enseignant' | 'theme';
export interface Suggestion { text: string; type: SuggestionType }

export async function getSuggestions(q: string): Promise<Suggestion[]> {
  const term = q.trim();
  const starts = { startsWith: term, mode: 'insensitive' as const };
  const contains = { contains: term, mode: 'insensitive' as const };

  const [etudiants, enseignants, themes] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'ETUDIANT', is_active: true, OR: [{ nom: starts }, { prenom: starts }] },
      select: { nom: true, prenom: true },
      take: 4,
    }),
    prisma.user.findMany({
      where: { role: { in: ['ENSEIGNANT', 'RESP_FILIERE'] }, is_active: true, OR: [{ nom: starts }, { prenom: starts }] },
      select: { nom: true, prenom: true },
      take: 3,
    }),
    prisma.theme.findMany({
      where: { titre: contains },
      select: { titre: true },
      take: 3,
    }),
  ]);

  return [
    ...etudiants.map((e) => ({ text: `${e.prenom} ${e.nom}`, type: 'etudiant' as const })),
    ...enseignants.map((e) => ({ text: `${e.prenom} ${e.nom}`, type: 'enseignant' as const })),
    ...themes.map((t) => ({ text: t.titre, type: 'theme' as const })),
  ];
}

interface SearchQuery {
  q: string;
  page?: number;
  limit?: number;
}

export async function globalSearch({ q, page = 1, limit = 20 }: SearchQuery) {
  const take = Math.floor(limit / 3);
  const skip = (page - 1) * take;
  const searchTerm = { contains: q, mode: 'insensitive' as const };

  const [etudiants, enseignants, themes] = await Promise.all([
    // ── Étudiants ──────────────────────────────────────────────────────────
    prisma.user.findMany({
      where: {
        role: 'ETUDIANT',
        is_active: true,
        OR: [
          { nom: searchTerm },
          { prenom: searchTerm },
          { email: searchTerm },
          { matricule: searchTerm },
        ],
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        matricule: true,
        specialite: { select: { id: true, nom: true } },
        affectations_etudiant: {
          select: {
            affectation: {
              select: {
                theme: { select: { id: true, titre: true, type_pfe: true } },
                encadrant: { select: { id: true, nom: true, prenom: true } },
              },
            },
          },
          take: 1,
        },
      },
      skip,
      take,
    }),

    // ── Enseignants ────────────────────────────────────────────────────────
    prisma.user.findMany({
      where: {
        role: { in: ['ENSEIGNANT', 'RESP_FILIERE'] },
        is_active: true,
        OR: [{ nom: searchTerm }, { prenom: searchTerm }, { email: searchTerm }],
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        specialite: { select: { id: true, nom: true } },
        _count: { select: { affectations_encadrant: true } },
      },
      skip,
      take,
    }),

    // ── Thèmes ─────────────────────────────────────────────────────────────
    prisma.theme.findMany({
      where: {
        OR: [{ titre: searchTerm }, { description: searchTerm }],
      },
      select: {
        id: true,
        titre: true,
        type_pfe: true,
        statut_validation: true,
        is_affecte: true,
        is_soutenu: true,
        propose_par: { select: { nom: true, prenom: true } },
        theme_specialites: {
          include: { specialite: { select: { id: true, nom: true } } },
        },
        affectation: {
          select: {
            encadrant: { select: { id: true, nom: true, prenom: true } },
            etudiants: {
              select: {
                etudiant: { select: { id: true, nom: true, prenom: true } },
              },
              take: 3,
            },
          },
        },
      },
      skip,
      take,
    }),
  ]);

  const etudiantsNorm = etudiants.map(({ affectations_etudiant, ...e }) => ({
    ...e,
    affectation: affectations_etudiant[0]?.affectation ?? null,
  }));

  const enseignantsNorm = enseignants.map(({ _count, ...e }) => ({
    ...e,
    nb_affectations: _count.affectations_encadrant,
  }));

  return {
    etudiants: etudiantsNorm,
    enseignants: enseignantsNorm,
    themes,
    query: q,
    total: etudiants.length + enseignants.length + themes.length,
  };
}
