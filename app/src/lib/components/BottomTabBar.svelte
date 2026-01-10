<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { t, translate, type Translations } from '$lib/i18n';
	import { barsHidden } from '$lib/stores/scroll';

	let currentPath = $state('');
	let translations = $state<Translations>({});
	let hidden = $state(false);

	barsHidden.subscribe((value) => {
		hidden = value;
	});

	page.subscribe((value) => {
		currentPath = value.url.pathname;
	});

	t.subscribe((value) => {
		translations = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	const tabs = [
		{ id: 'games', path: `${base}/`, icon: 'games', labelKey: 'tabs.games' },
		{ id: 'leaderboard', path: `${base}/leaderboard`, icon: 'trophy', labelKey: 'leaderboard.title' },
		{ id: 'feedback', path: `${base}/feedback`, icon: 'star', labelKey: 'feedback.title' },
		{ id: 'settings', path: `${base}/settings`, icon: 'settings', labelKey: 'settings.title' }
	];

	function isActive(tabPath: string): boolean {
		if (tabPath === `${base}/`) {
			return currentPath === `${base}/` || currentPath === `${base}` || currentPath === `${base}/index.html` || currentPath.startsWith(`${base}/spil`);
		}
		return currentPath.startsWith(tabPath);
	}
</script>

<nav class="tab-bar" class:hidden>
	{#each tabs as tab}
		<a
			href={tab.path}
			class="tab"
			class:active={isActive(tab.path)}
			aria-current={isActive(tab.path) ? 'page' : undefined}
		>
			<div class="tab-icon">
				{#if tab.icon === 'games'}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="2" y="2" width="8" height="8" rx="1"/>
						<rect x="14" y="2" width="8" height="8" rx="1"/>
						<rect x="2" y="14" width="8" height="8" rx="1"/>
						<rect x="14" y="14" width="8" height="8" rx="1"/>
					</svg>
				{:else if tab.icon === 'star'}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
					</svg>
				{:else if tab.icon === 'trophy'}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
						<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
						<path d="M4 22h16"/>
						<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
						<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
						<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
					</svg>
				{:else if tab.icon === 'settings'}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
						<circle cx="12" cy="12" r="3"/>
					</svg>
				{/if}
			</div>
			<span class="tab-label">{tr(tab.labelKey)}</span>
		</a>
	{/each}
</nav>

<style>
	.tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-evenly;
		align-items: center;
		background: rgba(15, 15, 30, 0.95);
		backdrop-filter: blur(20px);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding: 8px 10px;
		padding-bottom: max(8px, env(safe-area-inset-bottom));
		z-index: 100;
		transition: transform 0.4s ease-out;
	}

	.tab-bar.hidden {
		transform: translateY(100%);
	}

	.tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 8px 0;
		text-decoration: none;
		color: rgba(255, 255, 255, 0.5);
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.tab:active {
		transform: scale(0.95);
	}

	.tab.active {
		color: #ec4899;
	}

	.tab-icon {
		width: 24px;
		height: 24px;
	}

	.tab-icon svg {
		width: 100%;
		height: 100%;
	}

	.tab.active .tab-icon svg {
		stroke-width: 2.5;
	}

	.tab-label {
		font-size: 0.7rem;
		font-weight: 500;
	}
</style>
