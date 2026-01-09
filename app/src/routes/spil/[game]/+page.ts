import { games } from '$lib/games/registry';

// Tell SvelteKit which game pages to prerender
export function entries() {
	return games.map((game) => ({ game: game.id }));
}
