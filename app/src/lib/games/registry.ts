import type { Language } from '$lib/i18n';
import type { ComponentType } from 'svelte';

export interface GameInfo {
	id: string;
	number: string;
	icon: string;
	languages: Language[];
	component: () => Promise<{ default: ComponentType }>;
	accentColor: string;
	points: number;
}

export const games: GameInfo[] = [
	{
		id: '11-tictactoe',
		number: '11',
		icon: '⭕',
		languages: ['da', 'en', 'fr'],
		component: () => import('./11-tictactoe/TicTacToe.svelte'),
		accentColor: '#ec4899',
		points: 1
	}
];

export function getGame(id: string): GameInfo | undefined {
	return games.find((g) => g.id === id);
}

export function getGameByNumber(number: string): GameInfo | undefined {
	return games.find((g) => g.number === number);
}
