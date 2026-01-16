<script lang="ts">
	import { base } from '$app/paths';
	import { t, translate, type Translations } from '$lib/i18n';
	import InstallBanner from '$lib/components/InstallBanner.svelte';
	import { getSortedGames, getGameBadge, type GameInfo, type Badge } from '$lib/games/registry';
	import { favorites } from '$lib/favorites';
	import { onMount } from 'svelte';
	import { getRecentGameChangelog } from '$lib/changelog';

	let translations = $state<Translations>({});
	let favoriteIds = $state<string[]>([]);
	let badgePopup = $state<{ badge: Badge; gameName: string; gameId: string } | null>(null);

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

	function showBadgePopup(e: Event, badge: Badge, gameName: string, gameId: string) {
		e.preventDefault();
		e.stopPropagation();
		badgePopup = { badge, gameName, gameId };
	}

	function closeBadgePopup() {
		badgePopup = null;
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
						<button
							class="badge badge-new"
							onclick={(e) => showBadgePopup(e, badge, translate(translations, `games.${game.id}.title`), game.id)}
							aria-label={translate(translations, 'badge.new')}
						>✨</button>
					{:else if badge === 'updated'}
						<button
							class="badge badge-updated"
							onclick={(e) => showBadgePopup(e, badge, translate(translations, `games.${game.id}.title`), game.id)}
							aria-label={translate(translations, 'badge.updated')}
						>💫</button>
					{/if}
				</a>
			{/each}
	</div>
</div>

{#if badgePopup}
	{@const recentChanges = getRecentGameChangelog(badgePopup.gameId, 1)}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div class="badge-overlay" onclick={closeBadgePopup} role="dialog" aria-modal="true">
		<div class="badge-popup">
			<div class="badge-popup-icon">
				{badgePopup.badge === 'new' ? '✨' : '💫'}
			</div>
			<div class="badge-popup-title">{badgePopup.gameName}</div>
			<div class="badge-popup-text">
				{#if badgePopup.badge === 'updated' && recentChanges.length > 0}
					{translate(translations, `changelog.${recentChanges[0].issue}`)}
				{:else}
					{translate(translations, badgePopup.badge === 'new' ? 'badge.new' : 'badge.updated')}
				{/if}
			</div>
			<button class="badge-popup-close" onclick={closeBadgePopup}>OK</button>
		</div>
	</div>
{/if}

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
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		border-radius: 50%;
		transition: all 0.2s ease;
		z-index: 5;
	}

	.badge:active {
		transform: scale(1.2);
	}

	.badge-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.badge-popup {
		background: linear-gradient(145deg, #1e1e3f 0%, #0f0f23 100%);
		border-radius: 20px;
		padding: 25px;
		text-align: center;
		max-width: 280px;
		width: 100%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		animation: popIn 0.3s ease;
	}

	@keyframes popIn {
		from { transform: scale(0.9); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}

	.badge-popup-icon {
		font-size: 3rem;
		margin-bottom: 10px;
	}

	.badge-popup-title {
		font-size: 1.2rem;
		font-weight: 600;
		color: white;
		margin-bottom: 8px;
	}

	.badge-popup-text {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.95rem;
		margin-bottom: 20px;
	}

	.badge-popup-close {
		padding: 10px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.badge-popup-close:active {
		transform: scale(0.95);
	}

	.favorite-btn {
		position: absolute;
		top: 8px;
		right: 8px;
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
			top: 8px;
			left: 8px;
			right: auto;
		}
	}
</style>
