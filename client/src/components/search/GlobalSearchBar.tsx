import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, X, GraduationCap, User, BookOpen, ArrowRight, Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSearch, useSearchSuggestions } from '@/hooks/useSearch';
import type { SearchSuggestion } from '@/services/search.api';

// ─── Types internes ───────────────────────────────────────────────────────────

type ItemType = 'etudiant' | 'enseignant' | 'theme';

interface FlatItem {
  type: ItemType;
  id: string;
  label: string;
  sub: string;
}

// ─── Constantes de style ──────────────────────────────────────────────────────

const ICON_MAP: Record<ItemType, React.ElementType> = {
  etudiant: GraduationCap,
  enseignant: User,
  theme: BookOpen,
};

const COLOR_MAP: Record<ItemType, string> = {
  etudiant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  enseignant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  theme: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const BADGE_MAP: Record<ItemType, string> = {
  etudiant: 'Étudiant',
  enseignant: 'Enseignant',
  theme: 'Thème',
};

const SECTION_LABEL: Record<ItemType, string> = {
  etudiant: 'Étudiants',
  enseignant: 'Enseignants',
  theme: 'Thèmes',
};

// ─── Ligne de résultat (preview complet) ─────────────────────────────────────

function ResultRow({
  item, selected, onMouseEnter, onClick,
}: {
  item: FlatItem;
  selected: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const Icon = ICON_MAP[item.type];
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
        selected ? 'bg-accent' : 'hover:bg-accent/50',
      ].join(' ')}
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${COLOR_MAP[item.type]}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.label}</p>
        <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">{BADGE_MAP[item.type]}</Badge>
    </button>
  );
}

// ─── En-tête de section ───────────────────────────────────────────────────────

function SectionHeader({ type }: { type: ItemType }) {
  const Icon = ICON_MAP[type];
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40">
      <Icon className="h-3 w-3" />
      {SECTION_LABEL[type]}
    </div>
  );
}

// ─── Ligne de suggestion (1 caractère) ───────────────────────────────────────

function SuggestionRow({
  suggestion, query, selected, onMouseEnter, onClick,
}: {
  suggestion: SearchSuggestion;
  query: string;
  selected: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const Icon = ICON_MAP[suggestion.type];
  const text = suggestion.text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());

  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
        selected ? 'bg-accent' : 'hover:bg-accent/50',
      ].join(' ')}
    >
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${COLOR_MAP[suggestion.type]}`}>
        <Icon className="h-3 w-3" />
      </div>
      <span className="flex-1 text-sm truncate">
        {idx >= 0 ? (
          <>
            {text.slice(0, idx)}
            <span className="font-semibold text-foreground">{text.slice(idx, idx + query.length)}</span>
            {text.slice(idx + query.length)}
          </>
        ) : text}
      </span>
      <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">
        {BADGE_MAP[suggestion.type]}
      </Badge>
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function GlobalSearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const qFromUrl = new URLSearchParams(location.search).get('q') ?? '';
  const [value, setValue] = useState(qFromUrl);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const trimmed = value.trim();
  const showSuggestions = trimmed.length === 1;
  const showPreview = open && debouncedQ.length >= 2;

  // Sync input value when URL changes
  useEffect(() => { setValue(qFromUrl); }, [qFromUrl]);

  // Debounce 280 ms pour le preview complet
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(trimmed), 280);
    return () => clearTimeout(t);
  }, [trimmed]);

  // Ouvrir/fermer le preview complet selon debouncedQ
  useEffect(() => {
    setOpen(debouncedQ.length >= 2);
    setSelectedIndex(-1);
  }, [debouncedQ]);

  // Fermer tout quand le champ est vide
  useEffect(() => {
    if (trimmed.length === 0) {
      setOpen(false);
      setSelectedIndex(-1);
    }
  }, [trimmed]);

  // Clic extérieur → fermer
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K global
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        if (debouncedQ.length >= 2) setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [debouncedQ]);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: suggestions = [], isLoading: suggestionsLoading } = useSearchSuggestions(trimmed);
  const { data, isLoading: previewLoading } = useSearch(debouncedQ);

  // ── Liste plate du preview complet (max 2 par section) ──────────────────────
  const flatItems: FlatItem[] = [];
  if (data) {
    data.etudiants.slice(0, 2).forEach((e) => flatItems.push({
      type: 'etudiant', id: e.id,
      label: `${e.prenom} ${e.nom}`,
      sub: e.specialite?.nom ?? e.email,
    }));
    data.enseignants.slice(0, 2).forEach((e) => flatItems.push({
      type: 'enseignant', id: e.id,
      label: `${e.prenom} ${e.nom}`,
      sub: e.specialite?.nom ?? e.email,
    }));
    data.themes.slice(0, 2).forEach((t) => flatItems.push({
      type: 'theme', id: t.id,
      label: t.titre,
      sub: `${t.type_pfe === 'CLASSIQUE' ? 'Classique' : 'Startup'} · ${t.statut_validation === 'VALIDE' ? 'Validé' : 'Non validé'}`,
    }));
  }

  const voirTousIndex = flatItems.length;
  const hasResults = flatItems.length > 0;

  const sections: ItemType[] = [];
  if (data?.etudiants && data.etudiants.length > 0) sections.push('etudiant');
  if (data?.enseignants && data.enseignants.length > 0) sections.push('enseignant');
  if (data?.themes && data.themes.length > 0) sections.push('theme');

  const itemsByType: Record<ItemType, FlatItem[]> = {
    etudiant: flatItems.filter((i) => i.type === 'etudiant'),
    enseignant: flatItems.filter((i) => i.type === 'enseignant'),
    theme: flatItems.filter((i) => i.type === 'theme'),
  };

  let cursor = 0;
  const typeStartIndex: Record<ItemType, number> = { etudiant: 0, enseignant: 0, theme: 0 };
  for (const t of (['etudiant', 'enseignant', 'theme'] as ItemType[])) {
    typeStartIndex[t] = cursor;
    cursor += itemsByType[t].length;
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  const goToSearch = useCallback((q?: string) => {
    const term = (q ?? value).trim();
    if (term.length >= 2) {
      setOpen(false);
      setSelectedIndex(-1);
      navigate(`/recherche?q=${encodeURIComponent(term)}`);
    }
  }, [value, navigate]);

  const pickSuggestion = (text: string) => {
    setValue(text);
    setSelectedIndex(-1);
    navigate(`/recherche?q=${encodeURIComponent(text)}`);
  };

  // ── Clavier ─────────────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const anyOpen = showSuggestions || showPreview;
    if (!anyOpen && e.key !== 'Enter') return;

    if (showSuggestions) {
      const maxIdx = suggestions.length - 1;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, maxIdx));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, -1));
          break;
        case 'Escape':
          setSelectedIndex(-1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            pickSuggestion(suggestions[selectedIndex].text);
          } else {
            goToSearch();
          }
          break;
      }
      return;
    }

    if (showPreview) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, hasResults ? voirTousIndex : -1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, -1));
          break;
        case 'Escape':
          setOpen(false);
          setSelectedIndex(-1);
          break;
        case 'Enter':
          e.preventDefault();
          goToSearch();
          break;
      }
    }
  };

  const handleClear = () => {
    setValue('');
    setDebouncedQ('');
    setOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const isLoading = showSuggestions ? suggestionsLoading : previewLoading;

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); goToSearch(); }}>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => {
            if (trimmed.length === 1) setSelectedIndex(-1);
            if (debouncedQ.length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher…"
          autoComplete="off"
          spellCheck={false}
          className="h-8 pl-8 pr-16 w-44 focus:w-72 transition-[width] duration-200 text-sm bg-muted/40 border-muted focus:bg-background"
        />

        {isLoading && trimmed.length >= 1 ? (
          <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground pointer-events-none" />
        ) : value ? (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={handleClear}
            className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden lg:flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </form>

      {/* ── Dropdown suggestions (1 caractère) ──────────────────────────────── */}
      {showSuggestions && !showPreview && (
        <div className="absolute top-full right-0 mt-1.5 w-[320px] rounded-xl border bg-popover shadow-xl z-50 overflow-hidden">
          {suggestionsLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Suggestions…
            </div>
          )}
          {!suggestionsLoading && suggestions.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Aucune suggestion pour <span className="font-medium text-foreground">« {trimmed} »</span>
            </div>
          )}
          {!suggestionsLoading && suggestions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40">
                Suggestions
              </div>
              {suggestions.map((s, idx) => (
                <SuggestionRow
                  key={`${s.type}-${s.text}`}
                  suggestion={s}
                  query={trimmed}
                  selected={selectedIndex === idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => pickSuggestion(s.text)}
                />
              ))}
              <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-t bg-muted/20 text-[10px] text-muted-foreground">
                <span>Tapez un caractère de plus pour le preview complet</span>
                <span><kbd className="rounded border px-1 font-mono">↵</kbd> rechercher</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Dropdown preview complet (2+ caractères) ────────────────────────── */}
      {showPreview && (
        <div className="absolute top-full right-0 mt-1.5 w-[340px] rounded-xl border bg-popover shadow-xl z-50 overflow-hidden">

          {previewLoading && (
            <div className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recherche en cours…
            </div>
          )}

          {!previewLoading && !hasResults && (
            <div className="py-5 text-center text-sm text-muted-foreground">
              Aucun résultat pour{' '}
              <span className="font-medium text-foreground">« {debouncedQ} »</span>
            </div>
          )}

          {!previewLoading && hasResults && (
            <>
              {sections.map((sectionType, si) => (
                <div key={sectionType}>
                  {si > 0 && <div className="border-t" />}
                  <SectionHeader type={sectionType} />
                  {itemsByType[sectionType].map((item, localIdx) => {
                    const globalIdx = typeStartIndex[sectionType] + localIdx;
                    return (
                      <ResultRow
                        key={item.id}
                        item={item}
                        selected={selectedIndex === globalIdx}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        onClick={() => goToSearch()}
                      />
                    );
                  })}
                </div>
              ))}

              <div className="border-t">
                <button
                  type="button"
                  onMouseEnter={() => setSelectedIndex(voirTousIndex)}
                  onClick={() => goToSearch()}
                  className={[
                    'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    selectedIndex === voirTousIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'text-primary hover:bg-accent',
                  ].join(' ')}
                >
                  Voir tous les résultats
                  <Badge variant="secondary" className="text-xs">{data?.total}</Badge>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}

          {hasResults && (
            <div className="flex items-center justify-end gap-3 px-3 py-1.5 border-t bg-muted/20 text-[10px] text-muted-foreground">
              <span><kbd className="rounded border px-1 font-mono">↑↓</kbd> naviguer</span>
              <span><kbd className="rounded border px-1 font-mono">↵</kbd> voir tous</span>
              <span><kbd className="rounded border px-1 font-mono">Échap</kbd> fermer</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
