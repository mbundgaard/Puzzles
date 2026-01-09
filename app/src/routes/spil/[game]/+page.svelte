<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getGame } from '$lib/games/registry';
	import { language, loadGameTranslations, type Translations } from '$lib/i18n';
	import GameShell from '$lib/components/GameShell.svelte';
	import type { ComponentType } from 'svelte';

	let gameId = $derived($page.params.game);
	let gameInfo = $derived(getGame(gameId));

	let GameComponent = $state<ComponentType | null>(null);
	let gameTranslations = $state<Translations>({});
	let currentLang = $state<string>('da');

	language.subscribe((value) => {
		currentLang = value;
	});

	onMount(async () => {
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
	<div class="not-found">
		<h1>Spil ikke fundet</h1>
		<p>Spillet "{gameId}" findes ikke.</p>
		<a href="/Puzzles/app/">Tilbage til forsiden</a>
	</div>
{:else}
	<div class="loading">
		<div class="spinner"></div>
	</div>
{/if}

<style>
	.not-found {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 20px;
	}

	.not-found h1 {
		margin-bottom: 10px;
	}

	.not-found a {
		margin-top: 20px;
		color: #ec4899;
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
