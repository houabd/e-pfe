import { prisma } from '../config/database';

export type SuggestionType = 'etudiant' | 'enseignant' | 'theme';
export interface Suggestion { text: string; type: SuggestionType }

type StringFilter = { contains?: string; startsWith?: string; mode: 'insensitive' };
type UserWhereOR = { nom?: StringFilter; prenom?: StringFilter; email?: StringFilter; matricule?: StringFilter };

function buildNameOR(term: string, mode: 'startsWith' | 'contains', extraFields: (keyof UserWhereOR)[] = []): UserWhereOR[] {
  const filter = (t: string): StringFilter => ({ [mode]: t, mode: 'insensitive' });
  const conditions: UserWhereOR[] = [
    { nom: filter(term) },
    { prenom: filter(term) },
    ...extraFields.map((f) => ({ [f]: { contains: term, mode: 'insensitive' as const } })),
  ];

  const words = term.trim().split(/\s+/);
  if (words.length >= 2) {
    const c = (t: string): StringFilter => ({ contains: t, mode: 'insensitive' });
    for (let i = 1; i < words.length; i++) {
      const left = words.slice(0, i).join(' ');
      const right = words.slice(i).join(' ');
      conditions.push(
        { prenom: c(left), nom: c(right) },
        { prenom: c(right), nom: c(left) },
      );
    }
  }

  return conditions;
}

export async function getSuggestions(q: string): Promise<Suggestion[]> {
  const term = q.trim();
  const contains = { contains: term, mode: 'insensitive' as const };

  const [etudiants, enseignants, themes] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'ETUDIANT', is_active: true, OR: buildNameOR(term, 'startsWith') },
      select: { nom: true, prenom: true },
      take: 4,
    }),
    prisma.user.findMany({
      where: { role: { in: ['ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'] as import('@prisma/client').Role[] }, is_active: true, OR: buildNameOR(term, 'startsWith') },
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
        OR: buildNameOR(q, 'contains', ['email', 'matricule']),
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
        startup_membres: {
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
        role: { in: ['ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'] as import('@prisma/client').Role[] },
        is_active: true,
        OR: buildNameOR(q, 'contains', ['email']),
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        specialite: { select: { id: true, nom: true } },
        _count: { select: { affectations_encadrant: true, themes_proposes: true } },
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

  const etudiantsNorm = etudiants.map(({ affectations_etudiant, startup_membres, ...e }) => ({
    ...e,
    affectation: affectations_etudiant[0]?.affectation ?? startup_membres[0]?.affectation ?? null,
  }));

  const enseignantsNorm = enseignants.map(({ _count, ...e }) => ({
    ...e,
    nb_affectations: _count.affectations_encadrant,
    nb_themes: _count.themes_proposes,
  }));

  return {
    etudiants: etudiantsNorm,
    enseignants: enseignantsNorm,
    themes,
    query: q,
    total: etudiants.length + enseignants.length + themes.length,
  };
}
