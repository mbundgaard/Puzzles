<script lang="ts">
	import { base } from '$app/paths';
	import { t, translate, type Translations } from '$lib/i18n';
	import InstallBanner from '$lib/components/InstallBanner.svelte';
	import { getSortedGames, getGameBadge } from '$lib/games/registry';

	let translations = $state<Translations>({});

	t.subscribe((value) => {
		translations = value;
	});

	// Games sorted by most recent activity (newest/updated first)
	const games = getSortedGames();
</script>

<svelte:head>
	<title>{translate(translations, 'app.title')}</title>
</svelte:head>

<div class="home">
	<div class="game-grid">
			<InstallBanner />
			{#each games as game}
				{@const badge = getGameBadge(game)}
				<a
					href="{base}/spil/{game.id}"
					class="game-card"
					style="--accent-color: {game.accentColor}"
				>
					<div class="game-icon">{game.icon}</div>
					<div class="game-info">
						<div class="game-name">
							{translate(translations, `games.${game.id}.title`)}
							{#if badge === 'new'}
								<span class="badge badge-new">✨</span>
							{:else if badge === 'updated'}
								<span class="badge badge-updated">💫</span>
							{/if}
						</div>
						<div class="game-desc">{translate(translations, `games.${game.id}.description`)}</div>
					</div>
					<span class="game-number">#{game.id.split('-')[0]}</span>
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
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.game-desc {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.badge {
		font-size: 0.9rem;
		line-height: 1;
	}

	.game-number {
		position: absolute;
		bottom: 8px;
		right: 40px;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.2);
		font-weight: 500;
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

		.game-number {
			right: 10px;
			bottom: 6px;
		}

		.game-icon {
			width: 60px;
			height: 60px;
			font-size: 2.5rem;
		}

		.game-name {
			justify-content: center;
		}
	}
</style>
