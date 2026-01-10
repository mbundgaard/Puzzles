<script lang="ts">
	import type { Translations } from '$lib/i18n';
	import { trackStart, trackComplete } from '$lib/api';
	import WinModal from '$lib/components/WinModal.svelte';
	import { onDestroy } from 'svelte';

	interface Props {
		translations: Translations;
	}

	let { translations }: Props = $props();

	// Win modal state
	let showWinModal = $state(false);
	const GAME_NUMBER = '13';
	const POINTS = 3;

	// Helper to get translation
	function t(key: string): string {
		const keys = key.split('.');
		let value: unknown = translations;
		for (const k of keys) {
			if (value && typeof value === 'object' && k in value) {
				value = (value as Record<string, unknown>)[k];
			} else {
				return key;
			}
		}
		return typeof value === 'string' ? value : key;
	}

	// Game constants
	const SIZE = 4;

	// Game state
	let tiles = $state<number[]>([]);
	let emptyPos = $state(15);
	let moves = $state(0);
	let time = $state(0);
	let timer: ReturnType<typeof setInterval> | null = null;
	let gameOver = $state(false);
	let started = $state(false);
	let won = $state(false);

	// Computed: get movable tile positions
	let movableTiles = $derived.by(() => {
		const movable: number[] = [];
		const row = Math.floor(emptyPos / SIZE);
		const col = emptyPos % SIZE;

		if (row > 0) movable.push(emptyPos - SIZE); // Above
		if (row < SIZE - 1) movable.push(emptyPos + SIZE); // Below
		if (col > 0) movable.push(emptyPos - 1); // Left
		if (col < SIZE - 1) movable.push(emptyPos + 1); // Right

		return movable;
	});

	// Format time display
	let timeDisplay = $derived.by(() => {
		const minutes = Math.floor(time / 60);
		const seconds = time % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	function newGame() {
		stopTimer();
		moves = 0;
		time = 0;
		gameOver = false;
		started = false;
		won = false;
		showWinModal = false;

		// Create solved state
		tiles = [];
		for (let i = 1; i <= 15; i++) {
			tiles.push(i);
		}
		tiles.push(0); // Empty tile
		emptyPos = 15;

		// Shuffle by making random valid moves (ensures solvability)
		shuffle(100);

		// Track game start
		trackStart(GAME_NUMBER);
	}

	function shuffle(moveCount: number) {
		let currentEmptyPos = emptyPos;
		const newTiles = [...tiles];

		for (let i = 0; i < moveCount; i++) {
			const neighbors = getMovableTilesForPos(currentEmptyPos);
			const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];

			// Swap tiles
			[newTiles[randomNeighbor], newTiles[currentEmptyPos]] = [newTiles[currentEmptyPos], newTiles[randomNeighbor]];
			currentEmptyPos = randomNeighbor;
		}

		tiles = newTiles;
		emptyPos = currentEmptyPos;
	}

	function getMovableTilesForPos(pos: number): number[] {
		const movable: number[] = [];
		const row = Math.floor(pos / SIZE);
		const col = pos % SIZE;

		if (row > 0) movable.push(pos - SIZE);
		if (row < SIZE - 1) movable.push(pos + SIZE);
		if (col > 0) movable.push(pos - 1);
		if (col < SIZE - 1) movable.push(pos + 1);

		return movable;
	}

	function startTimer() {
		timer = setInterval(() => {
			time++;
		}, 1000);
	}

	function stopTimer() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	function handleTileClick(index: number) {
		if (gameOver) return;
		if (!movableTiles.includes(index)) return;

		// Swap tiles
		const newTiles = [...tiles];
		[newTiles[index], newTiles[emptyPos]] = [newTiles[emptyPos], newTiles[index]];
		tiles = newTiles;
		emptyPos = index;

		moves++;

		if (!started) {
			started = true;
			startTimer();
		}

		checkWin();
	}

	function checkWin() {
		for (let i = 0; i < 15; i++) {
			if (tiles[i] !== i + 1) return;
		}

		// Win!
		gameOver = true;
		won = true;
		stopTimer();
		trackComplete(GAME_NUMBER);

		// Show win modal after a short delay
		setTimeout(() => {
			showWinModal = true;
		}, 800);
	}

	function isTileCorrect(index: number): boolean {
		const tile = tiles[index];
		return tile !== 0 && tile === index + 1;
	}

	// Initialize game
	newGame();

	// Cleanup timer on destroy
	onDestroy(() => {
		stopTimer();
	});
</script>

<div class="game">
	<div class="stats">
		<div class="stat">
			<span class="stat-label">{t('moves')}</span>
			<span class="stat-value">{moves}</span>
		</div>
		<div class="stat">
			<span class="stat-label">{t('time')}</span>
			<span class="stat-value">{timeDisplay}</span>
		</div>
	</div>

	<div class="board" class:won>
		{#each tiles as tile, index}
			<button
				class="tile"
				class:empty={tile === 0}
				class:movable={movableTiles.includes(index) && tile !== 0}
				class:correct={isTileCorrect(index)}
				onclick={() => handleTileClick(index)}
				disabled={tile === 0 || gameOver}
				aria-label={tile === 0 ? 'Empty' : `Tile ${tile}`}
			>
				{tile === 0 ? '' : tile}
			</button>
		{/each}
	</div>

	<div class="controls">
		<button class="btn" onclick={newGame}>{t('newGame')}</button>
	</div>

	<div class="rules">
		<h3>{t('rules.title')}</h3>
		<ul>
			<li>{t('rules.rule1')}</li>
			<li>{t('rules.rule2')}</li>
			<li>{t('rules.rule3')}</li>
			<li>{t('rules.rule4')}</li>
		</ul>
	</div>
</div>

<WinModal
	isOpen={showWinModal}
	points={POINTS}
	gameNumber={GAME_NUMBER}
	onClose={() => showWinModal = false}
/>

<style>
	.game {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stats {
		display: flex;
		gap: 30px;
		margin-bottom: 20px;
	}

	.stat {
		text-align: center;
		background: rgba(255, 255, 255, 0.05);
		padding: 10px 25px;
		border-radius: 15px;
	}

	.stat-label {
		display: block;
		font-size: 0.75rem;
		color: white;
		margin-bottom: 4px;
	}

	.stat-value {
		font-size: 1.4rem;
		font-weight: 700;
		color: #fbbf24;
	}

	.board {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		width: 100%;
		max-width: 320px;
		margin-bottom: 25px;
		background: rgba(255, 255, 255, 0.05);
		padding: 12px;
		border-radius: 20px;
	}

	.tile {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.8rem;
		font-weight: 700;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(145deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.15) 100%);
		border: 2px solid rgba(245, 158, 11, 0.4);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.15s ease;
		color: white;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.tile:active:not(.empty):not(:disabled) {
		transform: scale(0.95);
	}

	.tile.empty {
		background: rgba(255, 255, 255, 0.03);
		border: 2px dashed rgba(255, 255, 255, 0.1);
		cursor: default;
	}

	.tile.movable {
		background: linear-gradient(145deg, rgba(245, 158, 11, 0.5) 0%, rgba(245, 158, 11, 0.3) 100%);
		border-color: rgba(245, 158, 11, 0.6);
	}

	.tile.correct {
		background: linear-gradient(145deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.2) 100%);
		border-color: rgba(34, 197, 94, 0.5);
	}

	/* Win animation */
	.board.won .tile:not(.empty) {
		animation: celebrate 0.5s ease;
	}

	@keyframes celebrate {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	.controls {
		margin-bottom: 20px;
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn:active {
		transform: scale(0.95);
	}

	.rules {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 15px;
		padding: 20px;
		width: 100%;
	}

	.rules h3 {
		margin-bottom: 15px;
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.rules ul {
		list-style: none;
	}

	.rules li {
		padding: 6px 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
		padding-left: 20px;
		position: relative;
	}

	.rules li::before {
		content: '\2022';
		position: absolute;
		left: 0;
		color: #f59e0b;
	}
</style>
