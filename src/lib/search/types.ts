export interface HabitSearchResult {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
}

export interface ReflectionSearchResult {
  id: string;
  entryDate: string;
  excerpt: string;
}

export interface SearchResults {
  habits: HabitSearchResult[];
  reflections: ReflectionSearchResult[];
}

export const EMPTY_SEARCH_RESULTS: SearchResults = {
  habits: [],
  reflections: [],
};

export function isEmptyResults(results: SearchResults): boolean {
  return results.habits.length === 0 && results.reflections.length === 0;
}
