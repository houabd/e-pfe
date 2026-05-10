import { useQuery } from '@tanstack/react-query';
import { globalSearch, getSearchSuggestions } from '@/services/search.api';

export function useSearch(q: string, page = 1) {
  return useQuery({
    queryKey: ['search', q, page],
    queryFn: () => globalSearch(q, page),
    enabled: q.trim().length >= 2,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useSearchSuggestions(q: string) {
  return useQuery({
    queryKey: ['search-suggestions', q],
    queryFn: () => getSearchSuggestions(q),
    enabled: q.trim().length === 1,
    staleTime: 60 * 1000,
  });
}
