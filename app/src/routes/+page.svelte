<script lang="ts">
	import { base } from '$app/paths';
	import { t, translate, type Translations } from '$lib/i18n';
	import InstallBanner from '$lib/components/InstallBanner.svelte';

	let translations = $state<Translations>({});

	t.subscribe((value) => {
		translations = value;
	});

	// Games sorted by most recent activity (matching classic app order)
	const games = [
		{ id: '29-maskevaerk', icon: '🧶', accentColor: '#f9a8d4', ai: true },
		{ id: '10-ordleg', icon: '📝', accentColor: '#22c55e', ai: true },
		{ id: '24-tangram', icon: '🧩', accentColor: '#a855f7' },
		{ id: '28-labyrint', icon: '🌀', accentColor: '#06b6d4' },
		{ id: '26-gaet-dyret', icon: '🦁', accentColor: '#f59e0b', ai: true },
		{ id: '27-ordsogning', icon: '🔤', accentColor: '#a855f7', ai: true },
		{ id: '25-saenke-slagskibe', icon: '🚢', accentColor: '#0ea5e9' },
		{ id: '12-roerfoering', icon: '🔧', accentColor: '#06b6d4' },
		{ id: '23-slange', icon: '🐍', accentColor: '#22c55e' },
		{ id: '22-hanoi', icon: '🗼', accentColor: '#8b5cf6' },
		{ id: '21-fire-paa-stribe', icon: '🔴', accentColor: '#fbbf24' },
		{ id: '19-moelle', icon: '⚪', accentColor: '#8b5cf6' },
		{ id: '18-dam', icon: '⚫', accentColor: '#ef4444' },
		{ id: '17-pind', icon: '🎯', accentColor: '#a855f7' },
		{ id: '14-mastermind', icon: '🔮', accentColor: '#f43f5e' },
		{ id: '13-skubbepuslespil', icon: '🔢', accentColor: '#f59e0b' },
		{ id: '11-tictactoe', icon: '❌', accentColor: '#ec4899' },
		{ id: '09-kalaha', icon: '🥜', accentColor: '#b45309' },
		{ id: '08-kabale', icon: '🌸', accentColor: '#ec4899' },
		{ id: '07-hukommelse', icon: '🃏', accentColor: '#06b6d4' },
		{ id: '06-minestryger', icon: '💣', accentColor: '#ef4444' },
		{ id: '01-reversi', icon: '⚫', accentColor: '#4ade80' }
	];
</script>

<svelte:head>
	<title>{translate(translations, 'app.title')}</title>
</svelte:head>

<div class="home">
	<div class="game-grid">
			<InstallBanner />
			{#each games as game}
				<a
					href="{base}/spil/{game.id}"
					class="game-card"
					style="--accent-color: {game.accentColor}"
				>
					<div class="game-icon">{game.icon}</div>
					<div class="game-info">
						<div class="game-name">{translate(translations, `games.${game.id}.title`)}</div>
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
	}

	.game-desc {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
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
	}
</style>
