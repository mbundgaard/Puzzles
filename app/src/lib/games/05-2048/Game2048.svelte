<script lang="ts">
	import type { Translations } from '$lib/i18n';
	import { trackStart, trackComplete } from '$lib/api';
	import WinModal from '$lib/components/WinModal.svelte';

	interface Props {
		translations: Translations;
	}

	let { translations }: Props = $props();

	// Win modal state
	let showWinModal = $state(false);
	const GAME_NUMBER = '05';
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
	let grid = $state<number[][]>([]);
	let score = $state(0);
	let best = $state(0);
	let won = $state(false);
	let gameOver = $state(false);
	let showVictoryOverlay = $state(false);

	// Tile colors based on value
	function getTileClass(value: number): string {
		if (value === 0) return '';
		if (value <= 2048) return `t${value}`;
		return 'tsuper';
	}

	// Initialize best score from localStorage
	function loadBest(): number {
		if (typeof localStorage !== 'undefined') {
			return parseInt(localStorage.getItem('2048-best') || '0');
		}
		return 0;
	}

	function saveBest(value: number) {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('2048-best', value.toString());
		}
	}

	// Add a random tile (90% chance of 2, 10% chance of 4)
	function addRandomTile() {
		const empty: { r: number; c: number }[] = [];
		for (let r = 0; r < SIZE; r++) {
			for (let c = 0; c < SIZE; c++) {
				if (grid[r][c] === 0) {
					empty.push({ r, c });
				}
			}
		}
		if (empty.length === 0) return;
		const { r, c } = empty[Math.floor(Math.random() * empty.length)];
		grid[r][c] = Math.random() < 0.9 ? 2 : 4;
	}

	// Slide and merge a single row to the left
	function slideAndMerge(row: number[]): number[] {
		let arr = row.filter(x => x !== 0);
		for (let i = 0; i < arr.length - 1; i++) {
			if (arr[i] === arr[i + 1]) {
				arr[i] *= 2;
				score += arr[i];
				arr.splice(i + 1, 1);
			}
		}
		while (arr.length < SIZE) arr.push(0);
		return arr;
	}

	// Transpose the grid
	function transpose(g: number[][]): number[][] {
		return g[0].map((_, i) => g.map(row => row[i]));
	}

	// Move functions
	function moveLeft() {
		for (let r = 0; r < SIZE; r++) {
			grid[r] = slideAndMerge(grid[r]);
		}
	}

	function moveRight() {
		for (let r = 0; r < SIZE; r++) {
			grid[r] = slideAndMerge([...grid[r]].reverse()).reverse();
		}
	}

	function moveUp() {
		grid = transpose(grid);
		moveLeft();
		grid = transpose(grid);
	}

	function moveDown() {
		grid = transpose(grid);
		moveRight();
		grid = transpose(grid);
	}

	// Check if player has reached 2048
	function hasWon(): boolean {
		for (let r = 0; r < SIZE; r++) {
			for (let c = 0; c < SIZE; c++) {
				if (grid[r][c] === 2048) return true;
			}
		}
		return false;
	}

	// Check if no moves are possible
	function isGameOver(): boolean {
		for (let r = 0; r < SIZE; r++) {
			for (let c = 0; c < SIZE; c++) {
				if (grid[r][c] === 0) return false;
				if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
				if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
			}
		}
		return true;
	}

	// Update best score if needed
	function updateBest() {
		if (score > best) {
			best = score;
			saveBest(best);
		}
	}

	// Handle move in a direction
	function move(direction: 'up' | 'down' | 'left' | 'right') {
		if (gameOver) return;

		const oldGrid = JSON.stringify(grid);

		if (direction === 'left') moveLeft();
		else if (direction === 'right') moveRight();
		else if (direction === 'up') moveUp();
		else if (direction === 'down') moveDown();

		// Only add new tile if grid changed
		if (JSON.stringify(grid) !== oldGrid) {
			addRandomTile();
			updateBest();
			// Force reactivity
			grid = [...grid.map(row => [...row])];

			// Check for win
			if (!won && hasWon()) {
				won = true;
				trackComplete(GAME_NUMBER);
				setTimeout(() => {
					showVictoryOverlay = true;
					showWinModal = true;
				}, 300);
			}

			// Check for game over
			if (isGameOver()) {
				gameOver = true;
			}
		}
	}

	// Continue playing after winning
	function continueGame() {
		showVictoryOverlay = false;
	}

	// Start a new game
	function newGame() {
		grid = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
		score = 0;
		won = false;
		gameOver = false;
		showVictoryOverlay = false;
		showWinModal = false;
		addRandomTile();
		addRandomTile();
		grid = [...grid.map(row => [...row])];
		trackStart(GAME_NUMBER);
	}

	// Handle keyboard input
	function handleKeydown(e: KeyboardEvent) {
		const moves: Record<string, 'up' | 'down' | 'left' | 'right'> = {
			ArrowUp: 'up',
			ArrowDown: 'down',
			ArrowLeft: 'left',
			ArrowRight: 'right'
		};
		if (moves[e.key]) {
			e.preventDefault();
			move(moves[e.key]);
		}
	}

	// Initialize game
	best = loadBest();
	newGame();
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game">
	<div class="score-panel">
		<div class="score-box">
			<span class="label">{t('score')}</span>
			<span class="value">{score}</span>
		</div>
		<div class="score-box">
			<span class="label">{t('best')}</span>
			<span class="value">{best}</span>
		</div>
	</div>

	<div class="board-wrapper">
		<div class="board">
			{#each grid as row, r}
				{#each row as cell, c}
					<div class="tile {getTileClass(cell)}">
						{#if cell !== 0}
							{cell}
						{/if}
					</div>
				{/each}
			{/each}
		</div>

		{#if gameOver && !won}
			<div class="overlay">
				<div class="overlay-content">
					<h2>{t('status.gameOver')}</h2>
					<p>{t('score')}: {score}</p>
					<button class="btn" onclick={newGame}>{t('newGame')}</button>
				</div>
			</div>
		{/if}

		{#if showVictoryOverlay}
			<div class="overlay victory">
				<div class="overlay-content">
					<h2>{t('status.won')}</h2>
					<button class="btn" onclick={continueGame}>{t('continue')}</button>
					<button class="btn secondary" onclick={newGame}>{t('newGame')}</button>
				</div>
			</div>
		{/if}
	</div>

	<div class="arrow-controls">
		<button class="arrow-btn" onclick={() => move('up')} aria-label="Up">
			<svg viewBox="0 0 24 24" fill="currentColor">
				<path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
			</svg>
		</button>
		<div class="arrow-row">
			<button class="arrow-btn" onclick={() => move('left')} aria-label="Left">
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
				</svg>
			</button>
			<button class="arrow-btn" onclick={() => move('right')} aria-label="Right">
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
				</svg>
			</button>
		</div>
		<button class="arrow-btn" onclick={() => move('down')} aria-label="Down">
			<svg viewBox="0 0 24 24" fill="currentColor">
				<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
			</svg>
		</button>
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

	.score-panel {
		display: flex;
		gap: 15px;
		margin-bottom: 20px;
	}

	.score-box {
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		border-radius: 12px;
		padding: 10px 20px;
		text-align: center;
		min-width: 80px;
	}

	.score-box .label {
		display: block;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
		text-transform: uppercase;
		margin-bottom: 4px;
	}

	.score-box .value {
		display: block;
		font-size: 1.3rem;
		font-weight: 700;
		color: white;
	}

	.board-wrapper {
		position: relative;
		margin-bottom: 20px;
	}

	.board {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		background: rgba(30, 30, 50, 0.8);
		padding: 12px;
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.tile {
		width: 70px;
		height: 70px;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 1.5rem;
		font-weight: 700;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.1);
		color: white;
		transition: all 0.15s ease;
	}

	/* Tile colors - gradient style matching dark theme */
	.tile.t2 {
		background: linear-gradient(135deg, #3d5a80 0%, #2c4a6e 100%);
		color: white;
	}

	.tile.t4 {
		background: linear-gradient(135deg, #48639c 0%, #3a5287 100%);
		color: white;
	}

	.tile.t8 {
		background: linear-gradient(135deg, #7b68ee 0%, #6354c9 100%);
		color: white;
	}

	.tile.t16 {
		background: linear-gradient(135deg, #9370db 0%, #7b5fc4 100%);
		color: white;
	}

	.tile.t32 {
		background: linear-gradient(135deg, #ba55d3 0%, #9e45b3 100%);
		color: white;
	}

	.tile.t64 {
		background: linear-gradient(135deg, #da70d6 0%, #c050b0 100%);
		color: white;
	}

	.tile.t128 {
		background: linear-gradient(135deg, #ff69b4 0%, #e0509a 100%);
		color: white;
		font-size: 1.3rem;
	}

	.tile.t256 {
		background: linear-gradient(135deg, #ff6b9d 0%, #e04d7a 100%);
		color: white;
		font-size: 1.3rem;
	}

	.tile.t512 {
		background: linear-gradient(135deg, #ff7f50 0%, #e06030 100%);
		color: white;
		font-size: 1.3rem;
	}

	.tile.t1024 {
		background: linear-gradient(135deg, #ffa500 0%, #e08c00 100%);
		color: white;
		font-size: 1.1rem;
	}

	.tile.t2048 {
		background: linear-gradient(135deg, #ffd700 0%, #e0b800 100%);
		color: #1a1a2e;
		font-size: 1.1rem;
		box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
	}

	.tile.tsuper {
		background: linear-gradient(135deg, #ff4500 0%, #cc3700 100%);
		color: white;
		font-size: 0.9rem;
		box-shadow: 0 0 20px rgba(255, 69, 0, 0.6);
	}

	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(15, 15, 35, 0.9);
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 12px;
		backdrop-filter: blur(4px);
	}

	.overlay-content {
		text-align: center;
		padding: 30px;
	}

	.overlay-content h2 {
		font-size: 1.5rem;
		margin-bottom: 15px;
		color: white;
	}

	.overlay-content p {
		font-size: 1.1rem;
		margin-bottom: 20px;
		color: rgba(255, 255, 255, 0.8);
	}

	.overlay.victory h2 {
		color: #ffd700;
	}

	.arrow-controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		margin-bottom: 20px;
	}

	.arrow-row {
		display: flex;
		gap: 50px;
	}

	.arrow-btn {
		width: 56px;
		height: 56px;
		display: flex;
		justify-content: center;
		align-items: center;
		background: rgba(128, 128, 128, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		color: white;
	}

	.arrow-btn svg {
		width: 32px;
		height: 32px;
	}

	.arrow-btn:active {
		transform: scale(0.9);
		background: rgba(128, 128, 128, 0.5);
	}

	.controls {
		margin-bottom: 20px;
		display: flex;
		gap: 10px;
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn:active {
		transform: scale(0.95);
	}

	.btn.secondary {
		background: rgba(128, 128, 128, 0.3);
		margin-top: 10px;
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
		content: '';
		position: absolute;
		left: 0;
		color: #22c55e;
	}

	/* Responsive adjustments */
	@media (max-width: 400px) {
		.tile {
			width: 60px;
			height: 60px;
			font-size: 1.3rem;
		}

		.tile.t128,
		.tile.t256,
		.tile.t512 {
			font-size: 1.1rem;
		}

		.tile.t1024,
		.tile.t2048 {
			font-size: 0.95rem;
		}

		.tile.tsuper {
			font-size: 0.8rem;
		}

		.board {
			gap: 6px;
			padding: 10px;
		}

		.arrow-btn {
			width: 50px;
			height: 50px;
		}

		.arrow-btn svg {
			width: 28px;
			height: 28px;
		}
	}

	@media (max-width: 320px) {
		.tile {
			width: 50px;
			height: 50px;
			font-size: 1.1rem;
		}

		.tile.t128,
		.tile.t256,
		.tile.t512,
		.tile.t1024,
		.tile.t2048 {
			font-size: 0.9rem;
		}

		.tile.tsuper {
			font-size: 0.7rem;
		}
	}
</style>
