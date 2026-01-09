<script lang="ts">
	import { base } from '$app/paths';
	import { t, translate, type Translations } from '$lib/i18n';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';
	import Leaderboard from '$lib/components/Leaderboard.svelte';

	let translations = $state<Translations>({});
	let showLeaderboard = $state(false);

	t.subscribe((value) => {
		translations = value;
	});

	const games = [
		{
			id: '11-tictactoe',
			icon: '⭕',
			accentColor: '#ec4899'
		}
	];
</script>

<svelte:head>
	<title>{translate(translations, 'app.title')}</title>
</svelte:head>

<div class="home">
	<!-- Animated background -->
	<div class="background">
		<div class="orb orb-1"></div>
		<div class="orb orb-2"></div>
		<div class="orb orb-3"></div>
	</div>

	<header>
		<div class="header-row">
			<button class="icon-btn" onclick={() => showLeaderboard = true} aria-label="Rangliste">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
					<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
					<path d="M4 22h16"/>
					<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
					<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
					<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
				</svg>
			</button>
			<h1 class="title">{translate(translations, 'app.title')}</h1>
			<LanguageSelector />
		</div>
		<p class="subtitle">{translate(translations, 'app.subtitle')}</p>
	</header>

	<Leaderboard isOpen={showLeaderboard} onClose={() => showLeaderboard = false} />

	<main>
		<div class="game-grid">
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
					<div class="game-arrow">›</div>
				</a>
			{/each}
		</div>
	</main>

	<footer>
		<a href="/Puzzles/app_classic/" class="classic-link">
			{translate(translations, 'app.classicVersion')} →
		</a>
	</footer>
</div>

<style>
	.home {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	/* Animated background */
	.background {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
	}

	.orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.5;
		animation: pulse 8s ease-in-out infinite;
	}

	.orb-1 {
		width: 300px;
		height: 300px;
		background: #9333ea;
		top: -100px;
		left: -100px;
	}

	.orb-2 {
		width: 250px;
		height: 250px;
		background: #ec4899;
		bottom: 20%;
		right: -80px;
		animation-delay: -3s;
	}

	.orb-3 {
		width: 200px;
		height: 200px;
		background: #06b6d4;
		bottom: -50px;
		left: 30%;
		animation-delay: -5s;
	}

	@keyframes pulse {
		0%, 100% {
			transform: scale(1);
			opacity: 0.5;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.7;
		}
	}

	header {
		padding: 30px 20px 20px;
		text-align: center;
	}

	.header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 600px;
		margin: 0 auto 10px;
	}

	.icon-btn {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(128, 128, 128, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.icon-btn:active {
		transform: scale(0.95);
		background: rgba(128, 128, 128, 0.5);
	}

	.icon-btn svg {
		width: 22px;
		height: 22px;
	}

	.title {
		font-size: 2rem;
		font-weight: 800;
		background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #d946ef 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.subtitle {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.95rem;
	}

	main {
		flex: 1;
		padding: 20px;
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

	.game-arrow {
		font-size: 1.5rem;
		color: rgba(255, 255, 255, 0.3);
		transition: transform 0.2s ease;
	}

	.game-card:active .game-arrow {
		transform: translateX(4px);
		color: var(--accent-color);
	}

	footer {
		padding: 20px;
		text-align: center;
	}

	.classic-link {
		color: rgba(255, 255, 255, 0.5);
		text-decoration: none;
		font-size: 0.85rem;
		transition: color 0.2s ease;
	}

	.classic-link:active {
		color: rgba(255, 255, 255, 0.8);
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
	}
</style>
