import { writable, derived, get } from 'svelte/store';
import da from './da.json';
import en from './en.json';
import fr from './fr.json';

export type Language = 'da' | 'en' | 'fr';

export interface Translations {
	[key: string]: string | Translations;
}

const sharedTranslations: Record<Language, Translations> = { da, en, fr };

// Create language store
function createLanguageStore() {
	const { subscribe, set } = writable<Language>('da');

	return {
		subscribe,
		set: (lang: Language) => {
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('language', lang);
			}
			set(lang);
		},
		init: () => {
			if (typeof window === 'undefined') return;

			// 1. Check URL parameter
			const urlParams = new URLSearchParams(window.location.search);
			const urlLang = urlParams.get('lang');
			if (urlLang && isValidLanguage(urlLang)) {
				set(urlLang);
				return;
			}

			// 2. Check localStorage
			const savedLang = localStorage.getItem('language');
			if (savedLang && isValidLanguage(savedLang)) {
				set(savedLang);
				return;
			}

			// 3. Check browser language
			const browserLang = navigator.language.split('-')[0];
			if (isValidLanguage(browserLang)) {
				set(browserLang);
				return;
			}

			// 4. Default to Danish
			set('da');
		}
	};
}

function isValidLanguage(lang: string): lang is Language {
	return ['da', 'en', 'fr'].includes(lang);
}

export const language = createLanguageStore();

// Derived store for current translations
export const t = derived(language, ($lang) => {
	return sharedTranslations[$lang] || sharedTranslations.da;
});

// Helper function to get nested translation value
export function translate(translations: Translations, key: string): string {
	const keys = key.split('.');
	let value: unknown = translations;

	for (const k of keys) {
		if (value && typeof value === 'object' && k in value) {
			value = (value as Record<string, unknown>)[k];
		} else {
			return key; // Return key if not found
		}
	}

	return typeof value === 'string' ? value : key;
}

// Load game-specific translations
const gameTranslationsCache: Record<string, Record<Language, Translations>> = {};

export async function loadGameTranslations(gameId: string): Promise<Translations> {
	const currentLang = get(language);

	// Check cache first
	if (gameTranslationsCache[gameId]?.[currentLang]) {
		return gameTranslationsCache[gameId][currentLang];
	}

	try {
		// Dynamic import of game translations
		const module = await import(`../games/${gameId}/i18n/${currentLang}.json`);
		if (!gameTranslationsCache[gameId]) {
			gameTranslationsCache[gameId] = {} as Record<Language, Translations>;
		}
		gameTranslationsCache[gameId][currentLang] = module.default;
		return module.default;
	} catch {
		// Fallback to Danish
		if (currentLang !== 'da') {
			console.warn(`No ${currentLang} translation for ${gameId}, using Danish`);
			try {
				const fallback = await import(`../games/${gameId}/i18n/da.json`);
				return fallback.default;
			} catch {
				return {};
			}
		}
		return {};
	}
}

// Available languages for selector
export const availableLanguages = [
	{ code: 'da' as Language, flag: '🇩🇰', name: 'Dansk' },
	{ code: 'en' as Language, flag: '🇬🇧', name: 'English' },
	{ code: 'fr' as Language, flag: '🇫🇷', name: 'Français' }
];
