<script lang="ts">
	import { base } from '$app/paths';
	import { t, translate, type Translations } from '$lib/i18n';
	import InstallBanner from '$lib/components/InstallBanner.svelte';
	import { getSortedGames, getGameBadge, type GameInfo } from '$lib/games/registry';
	import { favorites } from '$lib/favorites';
	import { onMount } from 'svelte';

	let translations = $state<Translations>({});
	let favoriteIds = $state<string[]>([]);

	t.subscribe((value) => {
		translations = value;
	});

	favorites.subscribe((value) => {
		favoriteIds = value;
	});

	onMount(() => {
		favorites.init();
	});

	// Games sorted by favorites first, then by most recent activity
	const baseGames = getSortedGames();

	function getSortedGamesWithFavorites(favs: string[]): GameInfo[] {
		return [...baseGames].sort((a, b) => {
			const aFav = favs.includes(a.id);
			const bFav = favs.includes(b.id);
			if (aFav && !bFav) return -1;
			if (!aFav && bFav) return 1;
			// Keep original sort order within each group
			const aDate = a.updated || a.created;
			const bDate = b.updated || b.created;
			return bDate.localeCompare(aDate);
		});
	}

	function toggleFavorite(e: Event, gameId: string) {
		e.preventDefault();
		e.stopPropagation();
		favorites.toggle(gameId);
	}

	function isFavorite(gameId: string): boolean {
		return favoriteIds.includes(gameId);
	}
</script>

<svelte:head>
	<title>{translate(translations, 'app.title')}</title>
</svelte:head>

<div class="home">
	<div class="game-grid">
			<InstallBanner />
			{#each getSortedGamesWithFavorites(favoriteIds) as game}
				{@const badge = getGameBadge(game)}
				{@const fav = isFavorite(game.id)}
				<a
					href="{base}/spil/{game.id}"
					class="game-card"
					style="--accent-color: {game.accentColor}"
				>
					<button
						class="favorite-btn"
						class:is-favorite={fav}
						onclick={(e) => toggleFavorite(e, game.id)}
						aria-label={translate(translations, fav ? 'favorites.remove' : 'favorites.add')}
					>
						{#if fav}
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
							</svg>
						{:else}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
							</svg>
						{/if}
					</button>
					<div class="game-icon">{game.icon}</div>
					<div class="game-info">
						<div class="game-name">{translate(translations, `games.${game.id}.title`)}</div>
						<div class="game-desc">{translate(translations, `games.${game.id}.description`)}</div>
					</div>
					{#if badge === 'new'}
						<span class="badge badge-new">✨</span>
					{:else if badge === 'updated'}
						<span class="badge badge-updated">💫</span>
					{/if}
					<div class="game-arrow">›</div>
				</a>
			{/each}
	</div>
</div>

<style>
	.home {
		padding: 0 20px 20px;
		max-width: 600px;
		margin: 0 auto;
		width: 100%;
	}

	.game-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
	}

	.game-card {
		display: flex;
		align-items: center;
		gap: 15px;
		padding: 16px 20px;
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		text-decoration: none;
		color: white;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.game-card::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 4px;
		background: var(--accent-color);
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.game-card:active {
		transform: scale(0.98);
		background: rgba(255, 255, 255, 0.12);
	}

	.game-card:active::before {
		opacity: 1;
	}

	.game-icon {
		font-size: 2rem;
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
	}

	.game-info {
		flex: 1;
	}

	.game-name {
		font-size: 1.1rem;
		font-weight: 600;
		margin-bottom: 2px;
	}

	.game-desc {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.badge {
		font-size: 1.1rem;
		line-height: 1;
	}

	.game-arrow {
		font-size: 1.5rem;
		color: rgba(255, 255, 255, 0.3);
		transition: transform 0.2s ease;
	}

	.game-card:active .game-arrow {
		transform: translateX(4px);
		color: var(--accent-color);
	}

	.favorite-btn {
		position: absolute;
		bottom: 6px;
		right: 58px;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.25);
		transition: all 0.2s ease;
		z-index: 10;
		padding: 0;
	}

	.favorite-btn svg {
		width: 14px;
		height: 14px;
	}

	.favorite-btn:hover {
		color: rgba(255, 255, 255, 0.5);
	}

	.favorite-btn:active {
		transform: scale(0.9);
	}

	.favorite-btn.is-favorite {
		color: #ef4444;
	}

	.favorite-btn.is-favorite:hover {
		color: #f87171;
	}

	@media (min-width: 500px) {
		.game-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.game-card {
			flex-direction: column;
			text-align: center;
			padding: 24px 16px;
		}

		.game-arrow {
			display: none;
		}

		.game-icon {
			width: 60px;
			height: 60px;
			font-size: 2.5rem;
		}

		.badge {
			position: absolute;
			top: 8px;
			right: 8px;
		}

		.favorite-btn {
			right: 28px;
			bottom: 4px;
		}
	}
</style>
