/**
 * Hjernespil API Client for SvelteKit
 */

const API_BASE = 'https://puzzlesapi.azurewebsites.net/api';
const NICKNAME_KEY = 'hjernespil_nickname';

declare const __BUILD_VERSION__: number;

// ============ Version Check ============

export async function checkForUpdates(): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE}/version`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ version: __BUILD_VERSION__ })
		});
		const data = await response.json();
		return data.newVersionExists === true;
	} catch {
		return false;
	}
}

export function getBuildVersion(): number {
	return __BUILD_VERSION__;
}

// ============ Types ============

export interface LeaderboardEntry {
	nickname: string;
	points: number;
}

export interface LeaderboardResponse {
	period: string;
	entries: LeaderboardEntry[];
	totalPoints: number;
}

export interface WinResponse {
	success: boolean;
	message?: string;
	error?: string;
}

// ============ Nickname Management ============

export function getNickname(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(NICKNAME_KEY);
}

export function setNickname(nickname: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(NICKNAME_KEY, nickname);
}

export function isValidNickname(nickname: string): boolean {
	return nickname && nickname.trim().length >= 2 && nickname.trim().length <= 20;
}

// ============ Leaderboard ============

export async function getLeaderboard(game: string | null = null, top: number = 10): Promise<LeaderboardResponse> {
	try {
		const params = new URLSearchParams({ top: top.toString() });
		if (game) params.set('game', game);

		const response = await fetch(`${API_BASE}/leaderboard?${params}`);
		return await response.json();
	} catch (error) {
		console.warn('Failed to get leaderboard:', error);
		return { period: '', entries: [], totalPoints: 0 };
	}
}

// ============ Win Recording ============

export async function recordWin(game: string, nickname: string, points: number = 1): Promise<WinResponse> {
	try {
		const response = await fetch(`${API_BASE}/win`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ game, nickname, points })
		});
		return await response.json();
	} catch (error) {
		console.warn('Failed to record win:', error);
		return { success: false, error: 'Netværksfejl' };
	}
}

// ============ Event Tracking ============

export async function trackEvent(game: string, event: 'start' | 'complete'): Promise<void> {
	try {
		const nickname = getNickname();
		await fetch(`${API_BASE}/event`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				game,
				event,
				nickname: nickname || undefined
			})
		});
	} catch {
		// Silently fail - don't disrupt gameplay
	}
}

export function trackStart(game: string): void {
	trackEvent(game, 'start');
}

export function trackComplete(game: string): void {
	trackEvent(game, 'complete');
}

// ============ Feedback ============

export interface FeedbackOptions {
	rating: number;
	text?: string;
	nickname?: string;
}

export interface FeedbackResponse {
	success: boolean;
	message?: string;
	error?: string;
}

export async function submitFeedback(game: string | null, options: FeedbackOptions): Promise<FeedbackResponse> {
	try {
		const nickname = options.nickname || getNickname();
		const response = await fetch(`${API_BASE}/feedback`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				game: game || undefined,
				rating: options.rating,
				text: options.text || undefined,
				nickname: nickname || undefined
			})
		});
		return await response.json();
	} catch (error) {
		console.warn('Failed to submit feedback:', error);
		return { success: false, error: 'Netværksfejl' };
	}
}

// ============ Helpers ============

export function formatPeriod(period: string): string {
	if (!period) return '';
	const [year, month] = period.split('-');
	const months = ['Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'December'];
	return `${months[parseInt(month, 10) - 1]} ${year}`;
}
