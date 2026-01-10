<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Translations } from '$lib/i18n';
	import { trackStart, trackComplete } from '$lib/api';
	import WinModal from '$lib/components/WinModal.svelte';

	interface Props {
		translations: Translations;
	}

	let { translations }: Props = $props();

	// Constants
	const GAME_NUMBER = '23';

	// Difficulty configurations
	const difficulties = {
		easy: { size: 15, speed: 200, target: 10, points: 2 },
		medium: { size: 12, speed: 150, target: 15, points: 3 },
		hard: { size: 10, speed: 100, target: 20, points: 4 }
	};

	type Difficulty = keyof typeof difficulties;

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

	// Game state
	let showStartScreen = $state(true);
	let difficulty = $state<Difficulty>('medium');
	let size = $state(12);
	let speed = $state(150);
	let target = $state(15);
	let points = $state(3);
	let snake = $state<{ x: number; y: number }[]>([]);
	let food = $state<{ x: number; y: number } | null>(null);
	let direction = $state({ x: 1, y: 0 });
	let nextDirection = $state({ x: 1, y: 0 });
	let score = $state(0);
	let gameRunning = $state(false);
	let gameOver = $state(false);
	let gameLoop: ReturnType<typeof setInterval> | null = null;
	let showWinModal = $state(false);

	// Derived: create board cells
	let boardCells = $derived.by(() => {
		const cells: { x: number; y: number; isSnake: boolean; isHead: boolean; isFood: boolean }[] =
			[];
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const isHead = snake.length > 0 && snake[0].x === x && snake[0].y === y;
				const isSnake = !isHead && snake.some((seg) => seg.x === x && seg.y === y);
				const isFood = food !== null && food.x === x && food.y === y;
				cells.push({ x, y, isSnake, isHead, isFood });
			}
		}
		return cells;
	});

	function selectDifficulty(diff: Difficulty) {
		difficulty = diff;
		startGame();
	}

	function startGame() {
		const config = difficulties[difficulty];
		size = config.size;
		speed = config.speed;
		target = config.target;
		points = config.points;

		score = 0;

		// Initialize snake in center
		const centerX = Math.floor(size / 2);
		const centerY = Math.floor(size / 2);
		snake = [
			{ x: centerX, y: centerY },
			{ x: centerX - 1, y: centerY },
			{ x: centerX - 2, y: centerY }
		];

		direction = { x: 1, y: 0 };
		nextDirection = { x: 1, y: 0 };

		placeFood();

		showStartScreen = false;
		gameRunning = true;
		gameOver = false;

		if (gameLoop) {
			clearInterval(gameLoop);
		}
		gameLoop = setInterval(update, speed);

		trackStart(GAME_NUMBER);
	}

	function placeFood() {
		let x: number, y: number;
		do {
			x = Math.floor(Math.random() * size);
			y = Math.floor(Math.random() * size);
		} while (snake.some((seg) => seg.x === x && seg.y === y));

		food = { x, y };
	}

	function update() {
		if (!gameRunning) return;

		// Apply next direction
		direction = { ...nextDirection };

		// Calculate new head position
		const head = snake[0];
		const newHead = {
			x: head.x + direction.x,
			y: head.y + direction.y
		};

		// Check wall collision
		if (newHead.x < 0 || newHead.x >= size || newHead.y < 0 || newHead.y >= size) {
			handleGameOver();
			return;
		}

		// Check self collision
		if (snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
			handleGameOver();
			return;
		}

		// Add new head
		const newSnake = [newHead, ...snake];

		// Check food collision
		if (food && newHead.x === food.x && newHead.y === food.y) {
			score = score + 1;

			if (score >= target) {
				snake = newSnake;
				handleVictory();
				return;
			}

			snake = newSnake;
			placeFood();
		} else {
			// Remove tail if no food eaten
			newSnake.pop();
			snake = newSnake;
		}
	}

	function handleGameOver() {
		gameRunning = false;
		gameOver = true;
		if (gameLoop) {
			clearInterval(gameLoop);
			gameLoop = null;
		}
	}

	function handleVictory() {
		gameRunning = false;
		if (gameLoop) {
			clearInterval(gameLoop);
			gameLoop = null;
		}

		trackComplete(GAME_NUMBER);
		setTimeout(() => {
			showWinModal = true;
		}, 300);
	}

	function retry() {
		gameOver = false;
		showStartScreen = true;
	}

	function newGame() {
		showWinModal = false;
		gameOver = false;
		showStartScreen = true;
	}

	// Arrow button handlers
	function moveUp() {
		if (gameRunning && direction.y !== 1) {
			nextDirection = { x: 0, y: -1 };
		}
	}

	function moveDown() {
		if (gameRunning && direction.y !== -1) {
			nextDirection = { x: 0, y: 1 };
		}
	}

	function moveLeft() {
		if (gameRunning && direction.x !== 1) {
			nextDirection = { x: -1, y: 0 };
		}
	}

	function moveRight() {
		if (gameRunning && direction.x !== -1) {
			nextDirection = { x: 1, y: 0 };
		}
	}

	onDestroy(() => {
		if (gameLoop) {
			clearInterval(gameLoop);
		}
	});
</script>

<div class="game">
	<div class="status-bar">
		<div class="score-display">
			<span class="current-score">{score}</span>
			<span class="divider">/</span>
			<span class="target-score">{target}</span>
		</div>
	</div>

	<div class="board-wrapper">
		<div class="board" style="grid-template-columns: repeat({size}, 1fr)">
			{#each boardCells as cell}
				<div
					class="cell"
					class:snake={cell.isSnake}
					class:snake-head={cell.isHead}
					class:food={cell.isFood}
				></div>
			{/each}
		</div>

		{#if showStartScreen}
			<div class="start-screen">
				<h2>{t('selectDifficulty')}</h2>
				<div class="difficulty-buttons">
					<button class="diff-btn easy" onclick={() => selectDifficulty('easy')}>
						{t('difficulty.easy')}
					</button>
					<button class="diff-btn medium" onclick={() => selectDifficulty('medium')}>
						{t('difficulty.medium')}
					</button>
					<button class="diff-btn hard" onclick={() => selectDifficulty('hard')}>
						{t('difficulty.hard')}
					</button>
				</div>
			</div>
		{/if}
	</div>

	{#if !showStartScreen && !gameOver}
		<div class="controls">
			<div class="controls-row">
				<button class="arrow-btn" onclick={moveUp} aria-label={t('controls.up')}>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="18 15 12 9 6 15"></polyline>
					</svg>
				</button>
			</div>
			<div class="controls-row">
				<button class="arrow-btn" onclick={moveLeft} aria-label={t('controls.left')}>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="15 18 9 12 15 6"></polyline>
					</svg>
				</button>
				<button class="arrow-btn" onclick={moveDown} aria-label={t('controls.down')}>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="6 9 12 15 18 9"></polyline>
					</svg>
				</button>
				<button class="arrow-btn" onclick={moveRight} aria-label={t('controls.right')}>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</button>
			</div>
		</div>
	{/if}

	{#if gameOver}
		<div class="game-over-panel">
			<h2>{t('gameOver')}</h2>
			<p>{t('collected')} {score} {t('foodItems')}</p>
			<button class="btn" onclick={retry}>{t('tryAgain')}</button>
		</div>
	{/if}

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
	{points}
	gameNumber={GAME_NUMBER}
	onClose={newGame}
	onNewGame={newGame}
/>

<style>
	.game {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.status-bar {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 15px;
	}

	.score-display {
		display: flex;
		align-items: center;
		gap: 5px;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		padding: 10px 25px;
		border-radius: 15px;
		font-size: 1.3rem;
		font-weight: 700;
		color: #fff;
	}

	.current-score {
		color: #4ade80;
	}

	.divider {
		color: rgba(255, 255, 255, 0.5);
	}

	.target-score {
		color: rgba(255, 255, 255, 0.8);
	}

	.board-wrapper {
		position: relative;
		display: flex;
		justify-content: center;
		margin-bottom: 15px;
		width: 100%;
	}

	.board {
		display: grid;
		gap: 1px;
		background: rgba(255, 255, 255, 0.1);
		padding: 4px;
		border-radius: 10px;
		max-width: 100%;
	}

	.cell {
		width: 20px;
		height: 20px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 3px;
	}

	.cell.snake {
		background: linear-gradient(135deg, #4ade80, #22c55e);
		border-radius: 4px;
		box-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
	}

	.cell.snake-head {
		background: linear-gradient(135deg, #22c55e, #16a34a);
		border-radius: 5px;
		box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
	}

	.cell.food {
		background: linear-gradient(135deg, #ef4444, #dc2626);
		border-radius: 50%;
		box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(0.9);
		}
		50% {
			transform: scale(1);
		}
	}

	.start-screen {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(15, 15, 35, 0.95);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		border-radius: 10px;
		gap: 20px;
	}

	.start-screen h2 {
		color: #fff;
		font-size: 1.3rem;
		font-weight: 600;
	}

	.difficulty-buttons {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 80%;
		max-width: 200px;
	}

	.diff-btn {
		padding: 15px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		color: white;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.diff-btn:active {
		transform: scale(0.95);
	}

	.diff-btn.easy {
		background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
	}

	.diff-btn.medium {
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
	}

	.diff-btn.hard {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
	}

	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		margin-bottom: 15px;
	}

	.controls-row {
		display: flex;
		gap: 8px;
	}

	.arrow-btn {
		width: 56px;
		height: 56px;
		background: rgba(128, 128, 128, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.arrow-btn:active {
		background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
		transform: scale(0.95);
	}

	.arrow-btn svg {
		pointer-events: none;
	}

	.game-over-panel {
		background: rgba(15, 15, 35, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 15px;
		padding: 25px 40px;
		text-align: center;
		margin-bottom: 15px;
		animation: pop 0.3s ease;
	}

	@keyframes pop {
		from {
			transform: scale(0.8);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.game-over-panel h2 {
		color: #ef4444;
		font-size: 1.5rem;
		margin-bottom: 10px;
	}

	.game-over-panel p {
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 20px;
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
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
		padding: 15px 20px;
		border-radius: 12px;
		width: 100%;
	}

	.rules h3 {
		color: #4ade80;
		margin-bottom: 10px;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.rules ul {
		list-style: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
	}

	.rules li {
		padding: 4px 0;
		padding-left: 20px;
		position: relative;
	}

	.rules li::before {
		content: '';
		position: absolute;
		left: 5px;
		color: #4ade80;
	}

	/* Responsive adjustments */
	@media (max-width: 400px) {
		.cell {
			width: 16px;
			height: 16px;
		}
	}
</style>
