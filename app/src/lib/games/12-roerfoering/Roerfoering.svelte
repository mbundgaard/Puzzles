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
	const GAME_NUMBER = '12';

	// Difficulty settings: points by difficulty
	const DIFFICULTY_CONFIG = {
		easy: { points: 1, minPathLength: 12 },
		medium: { points: 2, minPathLength: 14 },
		hard: { points: 3, minPathLength: 16 }
	};

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

	// Types
	interface Pipe {
		connections: number[];
		id: number;
	}

	interface Position {
		row: number;
		col: number;
	}

	type Difficulty = 'easy' | 'medium' | 'hard';

	// Game state
	const size = 6;
	let difficulty = $state<Difficulty>('easy');
	let board = $state<(Pipe | null)[][]>([]);
	let tray = $state<Pipe[]>([]);
	let selectedPipe = $state<number | null>(null);
	let startPos = $state<Position>({ row: 0, col: 0 });
	let endPos = $state<Position>({ row: 5, col: 5 });
	let gameOver = $state(false);
	let fixedCells = $state<Set<string>>(new Set());
	let connectedCells = $state<Set<string>>(new Set());

	// Derived values
	let points = $derived(DIFFICULTY_CONFIG[difficulty].points);

	// Daily win limit functions
	function getTodayKey(): string {
		return new Date().toISOString().split('T')[0];
	}

	function isWonToday(diff: Difficulty): boolean {
		const key = `roerfoering-${diff}-won`;
		if (typeof localStorage === 'undefined') return false;
		return localStorage.getItem(key) === getTodayKey();
	}

	function markWonToday(diff: Difficulty): void {
		const key = `roerfoering-${diff}-won`;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(key, getTodayKey());
		}
	}

	function selectFirstAvailable(): void {
		const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
		for (const diff of difficulties) {
			if (!isWonToday(diff)) {
				difficulty = diff;
				newGame();
				return;
			}
		}
		// All won today
		difficulty = 'easy';
		gameOver = true;
	}

	function shuffleArray<T>(array: T[]): void {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	function getNeighbors(row: number, col: number): Position[] {
		const neighbors: Position[] = [];
		if (row > 0) neighbors.push({ row: row - 1, col });
		if (row < size - 1) neighbors.push({ row: row + 1, col });
		if (col > 0) neighbors.push({ row, col: col - 1 });
		if (col < size - 1) neighbors.push({ row, col: col + 1 });
		return neighbors;
	}

	function generatePath(): Position[] {
		const path: Position[] = [{ ...startPos }];
		const visited = new Set<string>();
		visited.add(`${startPos.row},${startPos.col}`);

		let current = { ...startPos };

		while (current.row !== endPos.row || current.col !== endPos.col) {
			const neighbors = getNeighbors(current.row, current.col)
				.filter(n => !visited.has(`${n.row},${n.col}`));

			if (neighbors.length === 0) {
				// Backtrack if stuck
				if (path.length > 1) {
					path.pop();
					current = path[path.length - 1];
					continue;
				}
				break;
			}

			// Add randomness but generally move towards end
			neighbors.sort((a, b) => {
				const distA = Math.abs(a.row - endPos.row) + Math.abs(a.col - endPos.col);
				const distB = Math.abs(b.row - endPos.row) + Math.abs(b.col - endPos.col);
				// Add significant randomness to create winding paths
				return (distA - distB) + (Math.random() - 0.5) * 6;
			});

			const next = neighbors[0];
			path.push(next);
			visited.add(`${next.row},${next.col}`);
			current = next;
		}

		return path;
	}

	function generatePuzzle(): void {
		const minPathLength = DIFFICULTY_CONFIG[difficulty].minPathLength;

		// Generate a solved path first (retry if too short)
		let path: Position[];
		let attempts = 0;
		do {
			path = generatePath();
			attempts++;
		} while (path.length < minPathLength && attempts < 50);

		const pipes: Array<Pipe & { correctRow: number; correctCol: number }> = [];

		// Create pipes for the path
		for (let i = 0; i < path.length; i++) {
			const { row, col } = path[i];
			const connections = [0, 0, 0, 0]; // top, right, bottom, left

			if (i > 0) {
				const prev = path[i - 1];
				if (prev.row < row) connections[0] = 1;
				if (prev.row > row) connections[2] = 1;
				if (prev.col < col) connections[3] = 1;
				if (prev.col > col) connections[1] = 1;
			}

			if (i < path.length - 1) {
				const next = path[i + 1];
				if (next.row < row) connections[0] = 1;
				if (next.row > row) connections[2] = 1;
				if (next.col < col) connections[3] = 1;
				if (next.col > col) connections[1] = 1;
			}

			pipes.push({
				connections: connections,
				correctRow: row,
				correctCol: col,
				id: i
			});
		}

		// Always place start and end pipes on the board
		const startPipe = pipes[0];
		const endPipe = pipes[pipes.length - 1];

		board[startPipe.correctRow][startPipe.correctCol] = {
			connections: startPipe.connections,
			id: startPipe.id
		};
		fixedCells.add(`${startPipe.correctRow},${startPipe.correctCol}`);

		board[endPipe.correctRow][endPipe.correctCol] = {
			connections: endPipe.connections,
			id: endPipe.id
		};
		fixedCells.add(`${endPipe.correctRow},${endPipe.correctCol}`);

		// Get middle pipes (exclude start and end)
		const middlePipes = pipes.slice(1, -1);

		// Shuffle middle pipes to pick random ones to fix
		const shuffledIndices = [...Array(middlePipes.length).keys()];
		shuffleArray(shuffledIndices);

		// Put all middle pipes in tray (shuffled)
		for (let i = 0; i < shuffledIndices.length; i++) {
			const pipeIdx = shuffledIndices[i];
			const pipe = middlePipes[pipeIdx];
			tray.push({
				connections: pipe.connections,
				id: pipe.id
			});
		}

		shuffleArray(tray);
	}

	function newGame(): void {
		if (isWonToday(difficulty)) {
			// Can't play this difficulty again today
			return;
		}

		gameOver = false;
		selectedPipe = null;
		fixedCells = new Set();
		connectedCells = new Set();
		showWinModal = false;

		// Initialize empty board
		board = [];
		for (let r = 0; r < size; r++) {
			board.push([]);
			for (let c = 0; c < size; c++) {
				board[r].push(null);
			}
		}

		tray = [];
		generatePuzzle();

		// Track game start
		trackStart(GAME_NUMBER);
	}

	function handleCellClick(row: number, col: number): void {
		if (gameOver) return;
		if (fixedCells.has(`${row},${col}`)) return;

		const currentPipe = board[row][col];

		if (currentPipe !== null) {
			// Return pipe to tray
			tray = [...tray, currentPipe];
			board[row][col] = null;
			selectedPipe = null;
			board = [...board];
			return;
		}

		if (selectedPipe !== null) {
			// Place selected pipe
			const pipe = tray[selectedPipe];
			board[row][col] = pipe;
			tray = tray.filter((_, i) => i !== selectedPipe);
			selectedPipe = null;
			board = [...board];
			checkWin();
		}
	}

	function handleTrayClick(index: number): void {
		if (gameOver) return;
		if (selectedPipe === index) {
			selectedPipe = null;
		} else {
			selectedPipe = index;
		}
	}

	function createPipeSVG(connections: number[], isEndpoint: boolean, isStart: boolean): string {
		const [top, right, bottom, left] = connections;
		let paths = '';
		const cx = 25, cy = 25;

		if (top) paths += `<line class="pipe-line" x1="${cx}" y1="0" x2="${cx}" y2="${cy}"/>`;
		if (right) paths += `<line class="pipe-line" x1="${cx}" y1="${cy}" x2="50" y2="${cy}"/>`;
		if (bottom) paths += `<line class="pipe-line" x1="${cx}" y1="${cy}" x2="${cx}" y2="50"/>`;
		if (left) paths += `<line class="pipe-line" x1="0" y1="${cy}" x2="${cx}" y2="${cy}"/>`;

		if (isEndpoint) {
			const color = isStart ? '#22c55e' : '#ef4444';
			paths += `<circle class="endpoint" cx="${cx}" cy="${cy}" r="6" fill="${color}"/>`;
		} else {
			paths += `<circle class="pipe-center" cx="${cx}" cy="${cy}" r="4"/>`;
		}

		return paths;
	}

	function checkWin(): void {
		// Must use all pipes
		if (tray.length > 0) return;

		// Check if path connects start to end
		const visited = new Set<string>();
		const queue: Position[] = [startPos];
		visited.add(`${startPos.row},${startPos.col}`);

		while (queue.length > 0) {
			const current = queue.shift()!;
			const currentPipe = board[current.row][current.col];

			if (!currentPipe) continue;

			const directions = [
				{ dr: -1, dc: 0, myDir: 0, theirDir: 2 },
				{ dr: 0, dc: 1, myDir: 1, theirDir: 3 },
				{ dr: 1, dc: 0, myDir: 2, theirDir: 0 },
				{ dr: 0, dc: -1, myDir: 3, theirDir: 1 }
			];

			for (const dir of directions) {
				if (!currentPipe.connections[dir.myDir]) continue;

				const nr = current.row + dir.dr;
				const nc = current.col + dir.dc;

				if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
				if (visited.has(`${nr},${nc}`)) continue;

				const neighborPipe = board[nr][nc];
				if (!neighborPipe) continue;

				if (neighborPipe.connections[dir.theirDir]) {
					visited.add(`${nr},${nc}`);
					queue.push({ row: nr, col: nc });
				}
			}
		}

		if (visited.has(`${endPos.row},${endPos.col}`)) {
			gameOver = true;
			connectedCells = visited;

			// Mark as won today
			markWonToday(difficulty);

			// Track completion
			trackComplete(GAME_NUMBER);

			// Show win modal after a short delay
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		}
	}

	function setDifficulty(diff: Difficulty): void {
		if (isWonToday(diff)) return;
		difficulty = diff;
		newGame();
	}

	function allWonToday(): boolean {
		return isWonToday('easy') && isWonToday('medium') && isWonToday('hard');
	}

	// Initialize game
	selectFirstAvailable();
</script>

<div class="game">
	{#if allWonToday()}
		<div class="status winner">{t('allWonToday')}</div>
	{:else}
		<div class="status" class:winner={gameOver}>
			{gameOver ? t('won') : t('status')}
		</div>
	{/if}

	<div class="board" class:won={gameOver}>
		{#each Array(size) as _, row}
			{#each Array(size) as _, col}
				{@const isStart = row === startPos.row && col === startPos.col}
				{@const isEnd = row === endPos.row && col === endPos.col}
				{@const isFixed = fixedCells.has(`${row},${col}`)}
				{@const isConnected = connectedCells.has(`${row},${col}`)}
				{@const pipe = board[row]?.[col]}
				<button
					class="cell"
					class:start={isStart}
					class:end={isEnd}
					class:fixed={isFixed}
					class:has-pipe={pipe !== null}
					class:connected={isConnected}
					onclick={() => handleCellClick(row, col)}
					disabled={gameOver || isFixed}
					aria-label="Cell {row},{col}"
				>
					{#if pipe}
						<svg viewBox="0 0 50 50">
							{@html createPipeSVG(pipe.connections, isStart || isEnd, isStart)}
						</svg>
					{/if}
				</button>
			{/each}
		{/each}
	</div>

	<div class="tray">
		{#if tray.length === 0}
			<div class="tray-empty">{t('trayEmpty')}</div>
		{:else}
			{#each tray as pipe, index}
				<button
					class="tray-pipe"
					class:selected={selectedPipe === index}
					onclick={() => handleTrayClick(index)}
					disabled={gameOver}
					aria-label="Pipe {index}"
				>
					<svg viewBox="0 0 50 50">
						{@html createPipeSVG(pipe.connections, false, false)}
					</svg>
				</button>
			{/each}
		{/if}
	</div>

	<div class="controls">
		<div class="level-selector">
			<button
				class="level-btn"
				class:active={difficulty === 'easy' && !isWonToday('easy')}
				class:won-today={isWonToday('easy')}
				onclick={() => setDifficulty('easy')}
				disabled={isWonToday('easy')}
			>
				{t('difficulty.easy')}
			</button>
			<button
				class="level-btn"
				class:active={difficulty === 'medium' && !isWonToday('medium')}
				class:won-today={isWonToday('medium')}
				onclick={() => setDifficulty('medium')}
				disabled={isWonToday('medium')}
			>
				{t('difficulty.medium')}
			</button>
			<button
				class="level-btn"
				class:active={difficulty === 'hard' && !isWonToday('hard')}
				class:won-today={isWonToday('hard')}
				onclick={() => setDifficulty('hard')}
				disabled={isWonToday('hard')}
			>
				{t('difficulty.hard')}
			</button>
		</div>
		{#if !allWonToday()}
			<button class="btn" onclick={newGame}>{t('newGame')}</button>
		{/if}
	</div>

	<div class="rules">
		<h3>{t('rules.title')}</h3>
		<ul>
			<li>{t('rules.rule1')}</li>
			<li>{t('rules.rule2')}</li>
			<li>{t('rules.rule3')}</li>
			<li>{t('rules.rule4')}</li>
			<li>{t('rules.rule5')}</li>
		</ul>
	</div>
</div>

<WinModal
	isOpen={showWinModal}
	points={points}
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

	.status {
		font-size: 0.9rem;
		font-weight: 600;
		margin-bottom: 15px;
		padding: 10px 20px;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		border-radius: 25px;
		transition: all 0.3s ease;
		text-align: center;
		color: white;
	}

	.status.winner {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		animation: celebrate 0.5s ease;
	}

	@keyframes celebrate {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	.board {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 3px;
		width: 100%;
		max-width: 320px;
		margin-bottom: 15px;
		background: rgba(255, 255, 255, 0.05);
		padding: 8px;
		border-radius: 15px;
	}

	.board.won .connected :global(.pipe-line) {
		stroke: #22d3ee;
		filter: drop-shadow(0 0 5px rgba(34, 211, 238, 0.5));
	}

	.board.won .connected :global(.pipe-center) {
		fill: #22d3ee;
	}

	.cell {
		aspect-ratio: 1;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
		border: none;
		padding: 0;
	}

	.cell:active:not(:disabled) {
		transform: scale(0.95);
	}

	.cell.has-pipe {
		background: rgba(6, 182, 212, 0.15);
	}

	.cell.fixed {
		background: rgba(139, 92, 246, 0.2);
		cursor: default;
	}

	.cell.fixed::after {
		content: '';
		position: absolute;
		top: 2px;
		right: 2px;
		width: 6px;
		height: 6px;
		background: #8b5cf6;
		border-radius: 50%;
	}

	.cell svg {
		width: 100%;
		height: 100%;
	}

	.cell.start {
		background: rgba(34, 197, 94, 0.2);
		border: 2px solid #22c55e;
	}

	.cell.end {
		background: rgba(239, 68, 68, 0.2);
		border: 2px solid #ef4444;
	}

	:global(.pipe-line) {
		stroke: rgba(255, 255, 255, 0.5);
		stroke-width: 6;
		stroke-linecap: round;
		fill: none;
	}

	:global(.pipe-center) {
		fill: rgba(255, 255, 255, 0.5);
	}

	:global(.endpoint) {
		/* fill is set inline */
	}

	/* Tray */
	.tray {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
		width: 100%;
		max-width: 320px;
		min-height: 60px;
		margin-bottom: 15px;
		background: rgba(255, 255, 255, 0.05);
		padding: 10px;
		border-radius: 15px;
	}

	.tray-pipe {
		width: 50px;
		height: 50px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		border: 2px solid transparent;
		padding: 0;
	}

	.tray-pipe:active:not(:disabled) {
		transform: scale(0.95);
	}

	.tray-pipe.selected {
		border-color: #22d3ee;
		background: rgba(6, 182, 212, 0.2);
		box-shadow: 0 0 10px rgba(34, 211, 238, 0.4);
	}

	.tray-pipe svg {
		width: 100%;
		height: 100%;
	}

	.tray-empty {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.85rem;
		padding: 10px;
	}

	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 15px;
		margin-bottom: 20px;
	}

	.level-selector {
		display: flex;
		gap: 8px;
	}

	.level-btn {
		padding: 10px 20px;
		height: 44px;
		border-radius: 12px;
		border: 2px solid rgba(6, 182, 212, 0.3);
		background: rgba(6, 182, 212, 0.1);
		color: rgba(255, 255, 255, 0.7);
		font-family: 'Poppins', sans-serif;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.level-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.level-btn.active {
		background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
		border-color: transparent;
		color: white;
	}

	.level-btn.won-today {
		background: rgba(34, 197, 94, 0.2);
		color: rgba(34, 197, 94, 0.8);
		border-color: rgba(34, 197, 94, 0.3);
		cursor: default;
	}

	.level-btn.won-today::after {
		content: ' \2713';
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
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
		.status {
			margin-bottom: 10px;
			padding: 6px 15px;
			font-size: 0.8rem;
		}

		.board {
			max-width: 280px;
			margin-bottom: 10px;
			padding: 6px;
		}

		.tray {
			max-width: 280px;
			margin-bottom: 10px;
			min-height: 50px;
			padding: 8px;
		}

		.tray-pipe {
			width: 40px;
			height: 40px;
		}

		.controls {
			flex-direction: row;
			gap: 10px;
			margin-bottom: 10px;
		}

		.rules {
			display: none;
		}
	}
</style>
