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
	const GAME_NUMBER = '28';
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

	// Maze configuration
	const COLS = 15;
	const ROWS = 15;
	const VISIBILITY_RADIUS = 3;

	// Game state
	interface MazeCell {
		visited: boolean;
		walls: {
			top: boolean;
			right: boolean;
			bottom: boolean;
			left: boolean;
		};
	}

	let maze = $state<MazeCell[][]>([]);
	let player = $state({ x: 1, y: 1 });
	let exit = $state({ x: COLS - 2, y: ROWS - 2 });
	let steps = $state(0);
	let gameOver = $state(false);

	// Generate maze using recursive backtracking
	function generateMaze(): MazeCell[][] {
		// Initialize maze with all walls
		const newMaze: MazeCell[][] = [];
		for (let y = 0; y < ROWS; y++) {
			newMaze[y] = [];
			for (let x = 0; x < COLS; x++) {
				newMaze[y][x] = {
					visited: false,
					walls: { top: true, right: true, bottom: true, left: true }
				};
			}
		}

		// Recursive backtracking maze generation
		const stack: { x: number; y: number }[] = [];
		const startX = 1;
		const startY = 1;

		newMaze[startY][startX].visited = true;
		stack.push({ x: startX, y: startY });

		while (stack.length > 0) {
			const current = stack[stack.length - 1];
			const neighbors = getUnvisitedNeighbors(newMaze, current.x, current.y);

			if (neighbors.length === 0) {
				stack.pop();
			} else {
				const next = neighbors[Math.floor(Math.random() * neighbors.length)];
				removeWall(newMaze, current, next);
				newMaze[next.y][next.x].visited = true;
				stack.push({ x: next.x, y: next.y });
			}
		}

		// Ensure exit is marked as visited
		newMaze[exit.y][exit.x].visited = true;

		return newMaze;
	}

	function getUnvisitedNeighbors(
		m: MazeCell[][],
		x: number,
		y: number
	): { x: number; y: number }[] {
		const neighbors: { x: number; y: number }[] = [];
		const directions = [
			{ dx: 0, dy: -1 },
			{ dx: 1, dy: 0 },
			{ dx: 0, dy: 1 },
			{ dx: -1, dy: 0 }
		];

		for (const dir of directions) {
			const nx = x + dir.dx;
			const ny = y + dir.dy;

			if (nx > 0 && nx < COLS - 1 && ny > 0 && ny < ROWS - 1) {
				if (!m[ny][nx].visited) {
					neighbors.push({ x: nx, y: ny });
				}
			}
		}

		return neighbors;
	}

	function removeWall(
		m: MazeCell[][],
		current: { x: number; y: number },
		next: { x: number; y: number }
	) {
		const dx = next.x - current.x;
		const dy = next.y - current.y;

		if (dx === 1) {
			m[current.y][current.x].walls.right = false;
			m[next.y][next.x].walls.left = false;
		} else if (dx === -1) {
			m[current.y][current.x].walls.left = false;
			m[next.y][next.x].walls.right = false;
		} else if (dy === 1) {
			m[current.y][current.x].walls.bottom = false;
			m[next.y][next.x].walls.top = false;
		} else if (dy === -1) {
			m[current.y][current.x].walls.top = false;
			m[next.y][next.x].walls.bottom = false;
		}
	}

	// Calculate Chebyshev distance
	function getDistance(x1: number, y1: number, x2: number, y2: number): number {
		return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
	}

	// Movement function
	function move(dx: number, dy: number) {
		if (gameOver) return;

		const newX = player.x + dx;
		const newY = player.y + dy;

		// Check bounds
		if (newX < 0 || newX >= COLS || newY < 0 || newY >= ROWS) {
			return;
		}

		// Check walls
		const currentCell = maze[player.y][player.x];

		if (dx === 1 && currentCell.walls.right) return;
		if (dx === -1 && currentCell.walls.left) return;
		if (dy === 1 && currentCell.walls.bottom) return;
		if (dy === -1 && currentCell.walls.top) return;

		// Move player
		player = { x: newX, y: newY };
		steps++;

		// Check for victory
		if (player.x === exit.x && player.y === exit.y) {
			victory();
		}
	}

	function victory() {
		gameOver = true;
		trackComplete(GAME_NUMBER);
		setTimeout(() => {
			showWinModal = true;
		}, 500);
	}

	function newGame() {
		steps = 0;
		gameOver = false;
		showWinModal = false;
		player = { x: 1, y: 1 };
		exit = { x: COLS - 2, y: ROWS - 2 };
		maze = generateMaze();
		trackStart(GAME_NUMBER);
	}

	// Get cell classes for rendering
	function getCellClasses(x: number, y: number): string {
		const classes: string[] = ['cell'];

		if (maze[y] && maze[y][x]) {
			const cell = maze[y][x];

			if (cell.walls.top) classes.push('wall-top');
			if (cell.walls.right) classes.push('wall-right');
			if (cell.walls.bottom) classes.push('wall-bottom');
			if (cell.walls.left) classes.push('wall-left');
		}

		const distance = getDistance(x, y, player.x, player.y);
		const isExit = x === exit.x && y === exit.y;
		const isPlayer = x === player.x && y === player.y;
		const isStart = x === 1 && y === 1;

		if (isPlayer) {
			classes.push('player');
		} else if (isExit) {
			classes.push('exit');
		} else if (isStart && distance <= VISIBILITY_RADIUS) {
			classes.push('start');
		}

		if (distance > VISIBILITY_RADIUS && !isExit) {
			classes.push('fog');
		} else if (distance === VISIBILITY_RADIUS && !isExit) {
			classes.push('dim');
		}

		return classes.join(' ');
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="stats">
		<div class="stat">
			<span class="stat-label">{t('steps')}</span>
			<span class="stat-value">{steps}</span>
		</div>
	</div>

	<div class="board-wrapper">
		<div class="board" style="grid-template-columns: repeat({COLS}, 1fr);">
			{#each Array(ROWS) as _, y}
				{#each Array(COLS) as _, x}
					<div class={getCellClasses(x, y)}></div>
				{/each}
			{/each}
		</div>
	</div>

	<div class="controls">
		<div class="controls-row">
			<button class="arrow-btn" onclick={() => move(0, -1)} aria-label={t('controls.up')}>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="18 15 12 9 6 15"></polyline>
				</svg>
			</button>
		</div>
		<div class="controls-row">
			<button class="arrow-btn" onclick={() => move(-1, 0)} aria-label={t('controls.left')}>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
			</button>
			<button class="arrow-btn" onclick={() => move(0, 1)} aria-label={t('controls.down')}>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="6 9 12 15 18 9"></polyline>
				</svg>
			</button>
			<button class="arrow-btn" onclick={() => move(1, 0)} aria-label={t('controls.right')}>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="9 18 15 12 9 6"></polyline>
				</svg>
			</button>
		</div>
	</div>

	<button class="btn" onclick={newGame}>{t('newGame')}</button>

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
		color: #06b6d4;
	}

	.board-wrapper {
		position: relative;
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
	}

	.board {
		display: grid;
		gap: 0;
		background: rgba(0, 0, 0, 0.3);
		padding: 2px;
		border-radius: 8px;
		overflow: hidden;
	}

	.cell {
		width: 22px;
		height: 22px;
		background: rgba(255, 255, 255, 0.05);
		position: relative;
		transition: background 0.15s ease, opacity 0.3s ease;
	}

	/* Wall borders */
	.cell.wall-top {
		border-top: 2px solid #06b6d4;
	}
	.cell.wall-bottom {
		border-bottom: 2px solid #06b6d4;
	}
	.cell.wall-left {
		border-left: 2px solid #06b6d4;
	}
	.cell.wall-right {
		border-right: 2px solid #06b6d4;
	}

	/* Fog of war */
	.cell.fog {
		background: #0a0a15 !important;
		border-color: #0a0a15 !important;
	}

	.cell.dim {
		opacity: 0.6;
	}

	/* Player */
	.cell.player {
		background: linear-gradient(135deg, #06b6d4, #0891b2);
		border-radius: 50%;
		box-shadow: 0 0 15px rgba(6, 182, 212, 0.6);
		animation: playerPulse 1.5s ease-in-out infinite;
	}

	@keyframes playerPulse {
		0%, 100% { box-shadow: 0 0 10px rgba(6, 182, 212, 0.6); }
		50% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.8); }
	}

	/* Exit */
	.cell.exit {
		background: linear-gradient(135deg, #22c55e, #16a34a);
		border-radius: 4px;
		box-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
		animation: exitPulse 2s ease-in-out infinite;
	}

	@keyframes exitPulse {
		0%, 100% { box-shadow: 0 0 8px rgba(34, 197, 94, 0.5); }
		50% { box-shadow: 0 0 18px rgba(34, 197, 94, 0.8); }
	}

	/* Start */
	.cell.start {
		background: rgba(6, 182, 212, 0.2);
	}

	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		margin-bottom: 20px;
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
		background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
		transform: scale(0.95);
	}

	.arrow-btn svg {
		pointer-events: none;
	}

	.btn {
		width: 100%;
		max-width: 340px;
		padding: 14px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
		color: white;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-bottom: 20px;
	}

	.btn:active {
		transform: scale(0.98);
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
		padding: 0;
		margin: 0;
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
		color: #06b6d4;
	}

	/* Landscape mode */
	@media (orientation: landscape) and (max-height: 500px) {
		.stats {
			margin-bottom: 10px;
		}

		.board-wrapper {
			margin-bottom: 10px;
		}

		.cell {
			width: 18px;
			height: 18px;
		}

		.controls {
			margin-bottom: 10px;
			gap: 4px;
		}

		.controls-row {
			gap: 4px;
		}

		.arrow-btn {
			width: 44px;
			height: 44px;
		}

		.btn {
			margin-bottom: 10px;
			padding: 10px;
		}

		.rules {
			display: none;
		}
	}

	/* Small mobile screens */
	@media (max-width: 360px) {
		.cell {
			width: 18px;
			height: 18px;
		}

		.arrow-btn {
			width: 48px;
			height: 48px;
		}
	}
</style>
