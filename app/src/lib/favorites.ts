import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'favorites';

function loadFavorites(): string[] {
	if (!browser) return [];
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

function saveFavorites(favorites: string[]): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

function createFavoritesStore() {
	const { subscribe, set, update } = writable<string[]>(loadFavorites());

	return {
		subscribe,
		toggle: (gameId: string) => {
			update((favorites) => {
				const newFavorites = favorites.includes(gameId)
					? favorites.filter((id) => id !== gameId)
					: [...favorites, gameId];
				saveFavorites(newFavorites);
				return newFavorites;
			});
		},
		isFavorite: (gameId: string, favorites: string[]): boolean => {
			return favorites.includes(gameId);
		},
		init: () => {
			set(loadFavorites());
		}
	};
}

export const favorites = createFavoritesStore();
