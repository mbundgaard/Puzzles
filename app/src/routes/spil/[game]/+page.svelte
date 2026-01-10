<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getGame } from '$lib/games/registry';
	import { language, loadGameTranslations, t, translate, type Translations } from '$lib/i18n';
	import { getNickname } from '$lib/api';
	import GameShell from '$lib/components/GameShell.svelte';
	import NameModal from '$lib/components/NameModal.svelte';
	import type { ComponentType } from 'svelte';

	let gameId = $derived($page.params.game);
	let gameInfo = $derived(getGame(gameId));

	let GameComponent = $state<ComponentType | null>(null);
	let gameTranslations = $state<Translations>({});
	let appTranslations = $state<Translations>({});
	let currentLang = $state<string>('da');
	let showNamePrompt = $state(false);

	language.subscribe((value) => {
		currentLang = value;
	});

	t.subscribe((value) => {
		appTranslations = value;
	});

	function tr(key: string): string {
		return translate(appTranslations, key);
	}

	function handleNameModalClose() {
		showNamePrompt = false;
	}

	onMount(async () => {
		// Check if nickname exists, prompt if not
		if (!getNickname()) {
			showNamePrompt = true;
		}

		if (gameInfo) {
			const module = await gameInfo.component();
			GameComponent = module.default;
			gameTranslations = await loadGameTranslations(gameId);
		}
	});

	// Reload translations when language changes
	$effect(() => {
		if (gameInfo && currentLang) {
			loadGameTranslations(gameId).then((t) => {
				gameTranslations = t;
			});
		}
	});
</script>

<svelte:head>
	<title>{gameTranslations.title || gameId} - Hjernespil</title>
</svelte:head>

{#if gameInfo && GameComponent}
	<GameShell title={gameTranslations.title as string || gameId}>
		<GameComponent translations={gameTranslations} />
	</GameShell>
{:else if !gameInfo}
	<div class="not-migrated">
		<h1>{tr('notMigrated.title')}</h1>
		<p>{tr('notMigrated.message')}</p>
		<p class="hint">{tr('notMigrated.hint')}</p>
		<a href="/Puzzles/" class="back-btn">← {tr('notMigrated.back')}</a>
	</div>
{:else}
	<div class="loading">
		<div class="spinner"></div>
	</div>
{/if}

<NameModal isOpen={showNamePrompt} onClose={handleNameModalClose} />

<style>
	.not-migrated {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 20px;
		gap: 8px;
	}

	.not-migrated h1 {
		font-size: 1.8rem;
		margin: 0;
		background: linear-gradient(135deg, #ec4899, #8b5cf6);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.not-migrated p {
		margin: 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 1rem;
	}

	.not-migrated .hint {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.not-migrated .back-btn {
		margin-top: 24px;
		padding: 12px 24px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		color: white;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.not-migrated .back-btn:active {
		transform: scale(0.98);
		background: rgba(255, 255, 255, 0.15);
	}

	.loading {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.2);
		border-top-color: #ec4899;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
