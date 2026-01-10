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
	created: string;
	updated?: string;
	ai?: boolean;
}

export type Badge = 'new' | 'updated' | null;

const BADGE_DAYS = 4;

export function getGameBadge(game: GameInfo): Badge {
	const now = Date.now();
	const createdDate = new Date(game.created).getTime();
	const daysSinceCreated = (now - createdDate) / (1000 * 60 * 60 * 24);

	if (daysSinceCreated <= BADGE_DAYS) return 'new';

	if (game.updated) {
		const updatedDate = new Date(game.updated).getTime();
		const daysSinceUpdated = (now - updatedDate) / (1000 * 60 * 60 * 24);
		if (daysSinceUpdated <= BADGE_DAYS) return 'updated';
	}

	return null;
}

export function getSortedGames(): GameInfo[] {
	return [...games].sort((a, b) => {
		const aDate = a.updated || a.created;
		const bDate = b.updated || b.created;
		return bDate.localeCompare(aDate);
	});
}

export const games: GameInfo[] = [
	{
		id: '04-quiz-master',
		number: '04',
		icon: '🏆',
		languages: ['da', 'en', 'fr'],
		component: () => import('./04-quiz-master/QuizMaster.svelte'),
		accentColor: '#ffd700',
		points: 7,
		created: '2026-01-10',
		ai: true
	},
	{
		id: '01-reversi',
		number: '01',
		icon: '⚫',
		languages: ['da', 'en', 'fr'],
		component: () => import('./01-reversi/Reversi.svelte'),
		accentColor: '#4ade80',
		points: 3,
		created: '2025-12-28'
	},
	{
		id: '02-tents',
		number: '02',
		icon: '⛺',
		languages: ['da', 'en', 'fr'],
		component: () => import('./02-tents/Tents.svelte'),
		accentColor: '#22c55e',
		points: 3,
		created: '2025-12-28'
	},
	{
		id: '03-sudoku',
		number: '03',
		icon: '9️⃣',
		languages: ['da', 'en', 'fr'],
		component: () => import('./03-sudoku/Sudoku.svelte'),
		accentColor: '#667eea',
		points: 3,
		created: '2026-01-10'
	},
	{
		id: '05-2048',
		number: '05',
		icon: '🎮',
		languages: ['da', 'en', 'fr'],
		component: () => import('./05-2048/Game2048.svelte'),
		accentColor: '#ffd700',
		points: 3,
		created: '2025-12-28'
	},
	{
		id: '06-minestryger',
		number: '06',
		icon: '💣',
		languages: ['da', 'en', 'fr'],
		component: () => import('./06-minestryger/Minestryger.svelte'),
		accentColor: '#ef4444',
		points: 3,
		created: '2025-12-28'
	},
	{
		id: '07-hukommelse',
		number: '07',
		icon: '🃏',
		languages: ['da', 'en', 'fr'],
		component: () => import('./07-hukommelse/Hukommelse.svelte'),
		accentColor: '#06b6d4',
		points: 3,
		created: '2025-12-28'
	},
	{
		id: '08-kabale',
		number: '08',
		icon: '🌸',
		languages: ['da', 'en', 'fr'],
		component: () => import('./08-kabale/Kabale.svelte'),
		accentColor: '#ec4899',
		points: 3,
		created: '2025-12-28'
	},
	{
		id: '09-kalaha',
		number: '09',
		icon: '🥜',
		languages: ['da', 'en', 'fr'],
		component: () => import('./09-kalaha/Kalaha.svelte'),
		accentColor: '#b45309',
		points: 3,
		created: '2025-12-28'
	},
	{
		id: '10-ordleg',
		number: '10',
		icon: '📝',
		languages: ['da', 'en', 'fr'],
		component: () => import('./10-ordleg/Ordleg.svelte'),
		accentColor: '#22c55e',
		points: 5,
		created: '2025-12-28',
		updated: '2026-01-08',
		ai: true
	},
	{
		id: '11-tictactoe',
		number: '11',
		icon: '❌',
		languages: ['da', 'en', 'fr'],
		component: () => import('./11-tictactoe/TicTacToe.svelte'),
		accentColor: '#ec4899',
		points: 1,
		created: '2025-12-28'
	},
	{
		id: '12-roerfoering',
		number: '12',
		icon: '🔧',
		languages: ['da', 'en', 'fr'],
		component: () => import('./12-roerfoering/Roerfoering.svelte'),
		accentColor: '#06b6d4',
		points: 3,
		created: '2025-12-28',
		updated: '2025-12-30'
	},
	{
		id: '13-skubbepuslespil',
		number: '13',
		icon: '🔢',
		languages: ['da', 'en', 'fr'],
		component: () => import('./13-skubbepuslespil/Skubbepuslespil.svelte'),
		accentColor: '#f59e0b',
		points: 3,
		created: '2025-12-28'
	},
	{
		id: '14-mastermind',
		number: '14',
		icon: '🔮',
		languages: ['da', 'en', 'fr'],
		component: () => import('./14-mastermind/Mastermind.svelte'),
		accentColor: '#f43f5e',
		points: 3,
		created: '2025-12-28'
	},
	{
		id: '17-pind',
		number: '17',
		icon: '🎯',
		languages: ['da', 'en', 'fr'],
		component: () => import('./17-pind/Pind.svelte'),
		accentColor: '#a855f7',
		points: 3,
		created: '2025-12-29'
	},
	{
		id: '18-dam',
		number: '18',
		icon: '⚫',
		languages: ['da', 'en', 'fr'],
		component: () => import('./18-dam/Dam.svelte'),
		accentColor: '#ef4444',
		points: 3,
		created: '2025-12-29'
	},
	{
		id: '19-moelle',
		number: '19',
		icon: '⚪',
		languages: ['da', 'en', 'fr'],
		component: () => import('./19-moelle/Moelle.svelte'),
		accentColor: '#8b5cf6',
		points: 3,
		created: '2025-12-29'
	},
	{
		id: '21-fire-paa-stribe',
		number: '21',
		icon: '🔴',
		languages: ['da', 'en', 'fr'],
		component: () => import('./21-fire-paa-stribe/FirePaaStribe.svelte'),
		accentColor: '#fbbf24',
		points: 3,
		created: '2025-12-29'
	},
	{
		id: '22-hanoi',
		number: '22',
		icon: '🗼',
		languages: ['da', 'en', 'fr'],
		component: () => import('./22-hanoi/Hanoi.svelte'),
		accentColor: '#8b5cf6',
		points: 3,
		created: '2025-12-30'
	},
	{
		id: '23-slange',
		number: '23',
		icon: '🐍',
		languages: ['da', 'en', 'fr'],
		component: () => import('./23-slange/Slange.svelte'),
		accentColor: '#22c55e',
		points: 4,
		created: '2025-12-30'
	},
	{
		id: '24-tangram',
		number: '24',
		icon: '🧩',
		languages: ['da', 'en', 'fr'],
		component: () => import('./24-tangram/Tangram.svelte'),
		accentColor: '#a855f7',
		points: 5,
		created: '2025-12-30'
	},
	{
		id: '25-saenke-slagskibe',
		number: '25',
		icon: '🚢',
		languages: ['da', 'en', 'fr'],
		component: () => import('./25-saenke-slagskibe/SaenkeSlagskibe.svelte'),
		accentColor: '#0ea5e9',
		points: 5,
		created: '2025-12-31',
		updated: '2026-01-10'
	},
	{
		id: '26-gaet-dyret',
		number: '26',
		icon: '🦁',
		languages: ['da', 'en', 'fr'],
		component: () => import('./26-gaet-dyret/GaetDyret.svelte'),
		accentColor: '#f59e0b',
		points: 5,
		created: '2026-01-02',
		updated: '2026-01-03',
		ai: true
	},
	{
		id: '27-ordsogning',
		number: '27',
		icon: '🔤',
		languages: ['da', 'en', 'fr'],
		component: () => import('./27-ordsogning/Ordsogning.svelte'),
		accentColor: '#a855f7',
		points: 5,
		created: '2026-01-03',
		updated: '2026-01-10',
		ai: true
	},
	{
		id: '28-labyrint',
		number: '28',
		icon: '🌀',
		languages: ['da', 'en', 'fr'],
		component: () => import('./28-labyrint/Labyrint.svelte'),
		accentColor: '#06b6d4',
		points: 3,
		created: '2026-01-05'
	},
	{
		id: '29-maskevaerk',
		number: '29',
		icon: '🧶',
		languages: ['da', 'en', 'fr'],
		component: () => import('./29-maskevaerk/Maskevaerk.svelte'),
		accentColor: '#f9a8d4',
		points: 3,
		created: '2026-01-09',
		ai: true
	}
];

export function getGame(id: string): GameInfo | undefined {
	return games.find((g) => g.id === id);
}

export function getGameByNumber(number: string): GameInfo | undefined {
	return games.find((g) => g.number === number);
}
