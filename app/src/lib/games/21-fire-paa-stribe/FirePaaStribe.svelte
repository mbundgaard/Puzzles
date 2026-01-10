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
	const GAME_NUMBER = '21';
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

	// Constants
	const ROWS = 6;
	const COLS = 7;
	const PLAYER = 1;
	const AI = 2;
	const EMPTY = 0;

	// Game state
	let board = $state<number[][]>([]);
	let currentPlayer = $state(PLAYER);
	let gameOver = $state(false);
	let winningCells = $state<[number, number][]>([]);
	let difficulty = $state<'easy' | 'medium' | 'hard'>('medium');
	let isThinking = $state(false);
	let winner = $state<number | null>(null);

	// Status message
	let status = $derived.by(() => {
		if (gameOver) {
			if (winner === PLAYER) return t('status.won');
			if (winner === AI) return t('status.lost');
			return t('status.draw');
		}
		if (isThinking) return t('status.aiThinking');
		return t('status.yourTurn');
	});

	let statusClass = $derived.by(() => {
		if (gameOver) {
			if (winner === PLAYER) return 'winner';
			if (winner === AI) return 'loser';
			return 'draw';
		}
		if (isThinking) return 'thinking';
		return '';
	});

	function initBoard(): number[][] {
		return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
	}

	function getLowestEmptyRow(col: number, b: number[][]): number {
		for (let row = ROWS - 1; row >= 0; row--) {
			if (b[row][col] === EMPTY) {
				return row;
			}
		}
		return -1;
	}

	function checkWin(player: number, b: number[][]): [number, number][] | null {
		const directions: [number, number][] = [
			[0, 1],   // horizontal
			[1, 0],   // vertical
			[1, 1],   // diagonal down-right
			[1, -1]   // diagonal down-left
		];

		for (let row = 0; row < ROWS; row++) {
			for (let col = 0; col < COLS; col++) {
				if (b[row][col] !== player) continue;

				for (const [dr, dc] of directions) {
					const cells: [number, number][] = [[row, col]];
					let r = row + dr;
					let c = col + dc;

					while (
						r >= 0 && r < ROWS &&
						c >= 0 && c < COLS &&
						b[r][c] === player &&
						cells.length < 4
					) {
						cells.push([r, c]);
						r += dr;
						c += dc;
					}

					if (cells.length >= 4) {
						return cells;
					}
				}
			}
		}

		return null;
	}

	function isBoardFull(b: number[][]): boolean {
		return b[0].every(cell => cell !== EMPTY);
	}

	function getValidColumns(b: number[][]): number[] {
		const valid: number[] = [];
		for (let col = 0; col < COLS; col++) {
			if (b[0][col] === EMPTY) {
				valid.push(col);
			}
		}
		return valid;
	}

	function copyBoard(b: number[][]): number[][] {
		return b.map(row => [...row]);
	}

	function evaluateWindow(window: number[]): number {
		const aiCount = window.filter(c => c === AI).length;
		const playerCount = window.filter(c => c === PLAYER).length;
		const emptyCount = window.filter(c => c === EMPTY).length;

		if (aiCount === 4) return 100;
		if (aiCount === 3 && emptyCount === 1) return 10;
		if (aiCount === 2 && emptyCount === 2) return 2;

		if (playerCount === 4) return -100;
		if (playerCount === 3 && emptyCount === 1) return -10;
		if (playerCount === 2 && emptyCount === 2) return -2;

		return 0;
	}

	function evaluateBoard(b: number[][]): number {
		let score = 0;

		const directions: [number, number][] = [
			[0, 1],   // horizontal
			[1, 0],   // vertical
			[1, 1],   // diagonal down-right
			[1, -1]   // diagonal down-left
		];

		for (let row = 0; row < ROWS; row++) {
			for (let col = 0; col < COLS; col++) {
				for (const [dr, dc] of directions) {
					const window: number[] = [];

					for (let i = 0; i < 4; i++) {
						const r = row + dr * i;
						const c = col + dc * i;

						if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
							window.push(b[r][c]);
						}
					}

					if (window.length === 4) {
						score += evaluateWindow(window);
					}
				}
			}
		}

		// Prefer center column
		for (let row = 0; row < ROWS; row++) {
			if (b[row][3] === AI) score += 3;
			if (b[row][3] === PLAYER) score -= 3;
		}

		return score;
	}

	function minimax(
		b: number[][],
		depth: number,
		alpha: number,
		beta: number,
		isMaximizing: boolean
	): number {
		const aiWin = checkWin(AI, b);
		const playerWin = checkWin(PLAYER, b);

		if (aiWin) return 10000 + depth;
		if (playerWin) return -10000 - depth;
		if (isBoardFull(b) || depth === 0) {
			return evaluateBoard(b);
		}

		const validCols = getValidColumns(b);

		if (isMaximizing) {
			let maxScore = -Infinity;

			for (const col of validCols) {
				const row = getLowestEmptyRow(col, b);
				b[row][col] = AI;

				const score = minimax(b, depth - 1, alpha, beta, false);

				b[row][col] = EMPTY;

				maxScore = Math.max(maxScore, score);
				alpha = Math.max(alpha, score);

				if (beta <= alpha) break;
			}

			return maxScore;
		} else {
			let minScore = Infinity;

			for (const col of validCols) {
				const row = getLowestEmptyRow(col, b);
				b[row][col] = PLAYER;

				const score = minimax(b, depth - 1, alpha, beta, true);

				b[row][col] = EMPTY;

				minScore = Math.min(minScore, score);
				beta = Math.min(beta, score);

				if (beta <= alpha) break;
			}

			return minScore;
		}
	}

	function getBestMove(): number {
		let depth: number;

		switch (difficulty) {
			case 'easy': depth = 2; break;
			case 'medium': depth = 4; break;
			case 'hard': depth = 6; break;
			default: depth = 4;
		}

		let bestScore = -Infinity;
		let bestCols: number[] = [];

		const validCols = getValidColumns(board);
		const boardCopy = copyBoard(board);

		for (const col of validCols) {
			const row = getLowestEmptyRow(col, boardCopy);
			boardCopy[row][col] = AI;

			const score = minimax(boardCopy, depth - 1, -Infinity, Infinity, false);

			boardCopy[row][col] = EMPTY;

			if (score > bestScore) {
				bestScore = score;
				bestCols = [col];
			} else if (score === bestScore) {
				bestCols.push(col);
			}
		}

		// Randomly pick among equally good moves
		return bestCols[Math.floor(Math.random() * bestCols.length)];
	}

	function delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	function makeMove(col: number, player: number): boolean {
		const row = getLowestEmptyRow(col, board);
		if (row === -1) return false;

		board[row][col] = player;
		board = copyBoard(board);

		// Check for win
		const win = checkWin(player, board);
		if (win) {
			gameOver = true;
			winningCells = win;
			winner = player;

			if (player === PLAYER) {
				trackComplete(GAME_NUMBER);
				setTimeout(() => {
					showWinModal = true;
				}, 800);
			}
		} else if (isBoardFull(board)) {
			gameOver = true;
			winner = null;
		}

		return true;
	}

	async function handleColumnClick(col: number) {
		if (gameOver || currentPlayer !== PLAYER || isThinking) return;

		const row = getLowestEmptyRow(col, board);
		if (row === -1) return; // Column is full

		makeMove(col, PLAYER);

		if (!gameOver) {
			currentPlayer = AI;
			await aiTurn();
		}
	}

	async function aiTurn() {
		isThinking = true;
		await delay(500);

		const col = getBestMove();
		makeMove(col, AI);

		isThinking = false;

		if (!gameOver) {
			currentPlayer = PLAYER;
		}
	}

	function newGame() {
		board = initBoard();
		currentPlayer = PLAYER;
		gameOver = false;
		winningCells = [];
		isThinking = false;
		showWinModal = false;
		winner = null;

		trackStart(GAME_NUMBER);
	}

	function changeDifficulty(newDifficulty: 'easy' | 'medium' | 'hard') {
		difficulty = newDifficulty;
		newGame();
	}

	function isWinningCell(row: number, col: number): boolean {
		return winningCells.some(([r, c]) => r === row && c === col);
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<div class="difficulty-selector">
		<span>{t('difficulty.label')}:</span>
		<button
			class="difficulty-btn"
			class:active={difficulty === 'easy'}
			onclick={() => changeDifficulty('easy')}
		>
			{t('difficulty.easy')}
		</button>
		<button
			class="difficulty-btn"
			class:active={difficulty === 'medium'}
			onclick={() => changeDifficulty('medium')}
		>
			{t('difficulty.medium')}
		</button>
		<button
			class="difficulty-btn"
			class:active={difficulty === 'hard'}
			onclick={() => changeDifficulty('hard')}
		>
			{t('difficulty.hard')}
		</button>
	</div>

	<div class="board-wrapper">
		<div class="board">
			{#each board as row, rowIndex}
				{#each row as cell, colIndex}
					<button
						class="cell"
						class:player={cell === PLAYER}
						class:ai={cell === AI}
						class:winning={isWinningCell(rowIndex, colIndex)}
						class:disabled={gameOver || isThinking || currentPlayer !== PLAYER}
						onclick={() => handleColumnClick(colIndex)}
						aria-label="Column {colIndex + 1}"
					>
						{#if cell !== EMPTY}
							<div class="piece" class:player={cell === PLAYER} class:ai={cell === AI}></div>
						{/if}
					</button>
				{/each}
			{/each}
		</div>
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

	.status {
		font-size: 1.1rem;
		font-weight: 600;
		margin-bottom: 20px;
		padding: 10px 25px;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		border-radius: 25px;
		transition: all 0.3s ease;
	}

	.status.winner {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
	}

	.status.loser {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
	}

	.status.draw {
		background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
	}

	.status.thinking {
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	.difficulty-selector {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 20px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.difficulty-selector span {
		font-size: 0.85rem;
		color: white;
	}

	.difficulty-btn {
		padding: 8px 16px;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		color: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 20px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.difficulty-btn.active {
		background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
		color: white;
		border-color: transparent;
	}

	.difficulty-btn:active {
		transform: scale(0.95);
	}

	.board-wrapper {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
		width: 100%;
	}

	.board {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
		background: linear-gradient(145deg, #1e40af 0%, #1e3a8a 100%);
		padding: 12px;
		border-radius: 16px;
		box-shadow:
			inset 0 4px 8px rgba(0, 0, 0, 0.3),
			0 8px 20px rgba(0, 0, 0, 0.4);
		width: 100%;
		max-width: 360px;
	}

	.cell {
		aspect-ratio: 1;
		background: radial-gradient(circle at center, #0f172a 0%, #1e293b 100%);
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		position: relative;
		box-shadow:
			inset 0 4px 8px rgba(0, 0, 0, 0.5),
			inset 0 -2px 4px rgba(255, 255, 255, 0.1);
		transition: all 0.15s ease;
		border: none;
		padding: 0;
		min-width: 44px;
		min-height: 44px;
	}

	.cell:not(.disabled):hover {
		background: radial-gradient(circle at center, #1e293b 0%, #334155 100%);
	}

	.cell:active:not(.disabled) {
		transform: scale(0.95);
	}

	.cell.disabled {
		cursor: default;
		pointer-events: none;
	}

	.cell.winning {
		animation: glow 0.8s ease-in-out infinite alternate;
	}

	@keyframes glow {
		0% {
			box-shadow:
				inset 0 4px 8px rgba(0, 0, 0, 0.5),
				inset 0 -2px 4px rgba(255, 255, 255, 0.1),
				0 0 10px rgba(255, 255, 255, 0.5);
		}
		100% {
			box-shadow:
				inset 0 4px 8px rgba(0, 0, 0, 0.5),
				inset 0 -2px 4px rgba(255, 255, 255, 0.1),
				0 0 20px rgba(255, 255, 255, 0.8);
		}
	}

	.piece {
		width: 85%;
		height: 85%;
		border-radius: 50%;
		animation: drop 0.3s ease-out;
	}

	@keyframes drop {
		0% {
			transform: translateY(-100px);
			opacity: 0;
		}
		60% {
			transform: translateY(5px);
		}
		100% {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.piece.player {
		background: radial-gradient(circle at 30% 30%, #fde047 0%, #eab308 50%, #ca8a04 100%);
		box-shadow:
			inset 0 -4px 8px rgba(0, 0, 0, 0.3),
			inset 0 4px 8px rgba(255, 255, 255, 0.4),
			0 4px 8px rgba(0, 0, 0, 0.3);
	}

	.piece.ai {
		background: radial-gradient(circle at 30% 30%, #f87171 0%, #ef4444 50%, #dc2626 100%);
		box-shadow:
			inset 0 -4px 8px rgba(0, 0, 0, 0.3),
			inset 0 4px 8px rgba(255, 255, 255, 0.3),
			0 4px 8px rgba(0, 0, 0, 0.3);
	}

	.controls {
		margin-bottom: 20px;
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
		.board {
			max-width: 320px;
			padding: 8px;
			gap: 3px;
		}

		.cell {
			min-width: 38px;
			min-height: 38px;
		}
	}

	@media (max-width: 350px) {
		.board {
			max-width: 280px;
		}

		.cell {
			min-width: 32px;
			min-height: 32px;
		}
	}
</style>
