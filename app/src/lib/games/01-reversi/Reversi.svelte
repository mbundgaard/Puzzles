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
	const GAME_NUMBER = '01';
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
	const BLACK = 1; // Human
	const WHITE = 2; // AI
	const EMPTY = 0;

	const DIRECTIONS = [
		[-1, -1], [-1, 0], [-1, 1],
		[0, -1],          [0, 1],
		[1, -1],  [1, 0], [1, 1]
	];

	// Position weights for evaluation (8x8 board, scaled for other sizes)
	const POSITION_WEIGHTS_8 = [
		[100, -20,  10,   5,   5,  10, -20, 100],
		[-20, -50,  -2,  -2,  -2,  -2, -50, -20],
		[ 10,  -2,   5,   1,   1,   5,  -2,  10],
		[  5,  -2,   1,   0,   0,   1,  -2,   5],
		[  5,  -2,   1,   0,   0,   1,  -2,   5],
		[ 10,  -2,   5,   1,   1,   5,  -2,  10],
		[-20, -50,  -2,  -2,  -2,  -2, -50, -20],
		[100, -20,  10,   5,   5,  10, -20, 100]
	];

	// Game state
	let boardSize = $state(8);
	let board = $state<number[][]>([]);
	let currentPlayer = $state(BLACK);
	let gameOver = $state(false);
	let positionWeights = $state<number[][]>([]);
	let isThinking = $state(false);
	let passMessage = $state<string | null>(null);

	// Scores
	let scores = $derived.by(() => {
		let black = 0, white = 0;
		for (let i = 0; i < boardSize; i++) {
			for (let j = 0; j < boardSize; j++) {
				if (board[i]?.[j] === BLACK) black++;
				else if (board[i]?.[j] === WHITE) white++;
			}
		}
		return { black, white };
	});

	// Status message
	let status = $derived.by(() => {
		if (passMessage) return passMessage;
		if (gameOver) {
			if (scores.black > scores.white) return `${t('status.won')} ${scores.black} - ${scores.white}`;
			if (scores.white > scores.black) return `${t('status.lost')} ${scores.white} - ${scores.black}`;
			return `${t('status.draw')} ${scores.black} - ${scores.white}`;
		}
		if (isThinking) return t('status.aiThinking');
		return t('status.yourTurn');
	});

	let statusClass = $derived.by(() => {
		if (gameOver) {
			if (scores.black > scores.white) return 'winner';
			if (scores.white > scores.black) return 'loser';
			return 'draw';
		}
		if (isThinking) return 'thinking';
		return '';
	});

	// Valid moves for current player
	let validMoves = $derived.by(() => {
		if (gameOver) return [];
		return getValidMoves(currentPlayer, board);
	});

	function generatePositionWeights(size: number): number[][] {
		const weights: number[][] = [];
		for (let i = 0; i < size; i++) {
			weights[i] = [];
			for (let j = 0; j < size; j++) {
				const mappedI = Math.floor(i * 8 / size);
				const mappedJ = Math.floor(j * 8 / size);
				weights[i][j] = POSITION_WEIGHTS_8[mappedI][mappedJ];
			}
		}
		// Ensure corners are highly valued
		weights[0][0] = 100;
		weights[0][size - 1] = 100;
		weights[size - 1][0] = 100;
		weights[size - 1][size - 1] = 100;
		return weights;
	}

	function initBoard(size: number): number[][] {
		const newBoard: number[][] = [];
		for (let i = 0; i < size; i++) {
			newBoard[i] = [];
			for (let j = 0; j < size; j++) {
				newBoard[i][j] = EMPTY;
			}
		}
		// Set up initial pieces in the center
		const mid = size / 2;
		newBoard[mid - 1][mid - 1] = WHITE;
		newBoard[mid - 1][mid] = BLACK;
		newBoard[mid][mid - 1] = BLACK;
		newBoard[mid][mid] = WHITE;
		return newBoard;
	}

	function isValidPosition(row: number, col: number, size: number): boolean {
		return row >= 0 && row < size && col >= 0 && col < size;
	}

	function getFlippedPieces(row: number, col: number, player: number, b: number[][]): [number, number][] {
		if (b[row][col] !== EMPTY) return [];

		const opponent = player === BLACK ? WHITE : BLACK;
		const allFlipped: [number, number][] = [];

		for (const [dr, dc] of DIRECTIONS) {
			const flipped: [number, number][] = [];
			let r = row + dr;
			let c = col + dc;

			while (isValidPosition(r, c, b.length) && b[r][c] === opponent) {
				flipped.push([r, c]);
				r += dr;
				c += dc;
			}

			if (flipped.length > 0 && isValidPosition(r, c, b.length) && b[r][c] === player) {
				allFlipped.push(...flipped);
			}
		}

		return allFlipped;
	}

	function isValidMove(row: number, col: number, player: number, b: number[][]): boolean {
		return getFlippedPieces(row, col, player, b).length > 0;
	}

	function getValidMoves(player: number, b: number[][]): [number, number][] {
		const moves: [number, number][] = [];
		const size = b.length;
		for (let i = 0; i < size; i++) {
			for (let j = 0; j < size; j++) {
				if (isValidMove(i, j, player, b)) {
					moves.push([i, j]);
				}
			}
		}
		return moves;
	}

	function makeMove(row: number, col: number, player: number, b: number[][]): [number, number][] | null {
		const flipped = getFlippedPieces(row, col, player, b);
		if (flipped.length === 0) return null;

		b[row][col] = player;
		for (const [r, c] of flipped) {
			b[r][c] = player;
		}
		return flipped;
	}

	function copyBoard(b: number[][]): number[][] {
		return b.map(row => [...row]);
	}

	function countPieces(b: number[][]): { black: number; white: number } {
		let black = 0, white = 0;
		const size = b.length;
		for (let i = 0; i < size; i++) {
			for (let j = 0; j < size; j++) {
				if (b[i][j] === BLACK) black++;
				else if (b[i][j] === WHITE) white++;
			}
		}
		return { black, white };
	}

	function evaluate(b: number[][], player: number): number {
		const opponent = player === BLACK ? WHITE : BLACK;
		const size = b.length;
		let score = 0;

		// Piece count
		const pieces = countPieces(b);
		const pieceScore = player === WHITE ?
			pieces.white - pieces.black :
			pieces.black - pieces.white;

		// Position-based score
		let posScore = 0;
		for (let i = 0; i < size; i++) {
			for (let j = 0; j < size; j++) {
				if (b[i][j] === player) {
					posScore += positionWeights[i][j];
				} else if (b[i][j] === opponent) {
					posScore -= positionWeights[i][j];
				}
			}
		}

		// Mobility
		const myMoves = getValidMoves(player, b).length;
		const oppMoves = getValidMoves(opponent, b).length;
		const mobilityScore = myMoves - oppMoves;

		// Corner occupancy
		const corners: [number, number][] = [
			[0, 0], [0, size - 1],
			[size - 1, 0], [size - 1, size - 1]
		];
		let cornerScore = 0;
		for (const [r, c] of corners) {
			if (b[r][c] === player) cornerScore += 25;
			else if (b[r][c] === opponent) cornerScore -= 25;
		}

		score = pieceScore * 1 + posScore * 2 + mobilityScore * 5 + cornerScore * 10;
		return score;
	}

	function minimax(
		b: number[][],
		depth: number,
		alpha: number,
		beta: number,
		maximizingPlayer: boolean,
		player: number
	): { score: number; move?: [number, number] } {
		const opponent = player === BLACK ? WHITE : BLACK;
		const moves = getValidMoves(maximizingPlayer ? player : opponent, b);

		if (depth === 0) {
			return { score: evaluate(b, player) };
		}

		const oppMoves = getValidMoves(maximizingPlayer ? opponent : player, b);

		if (moves.length === 0 && oppMoves.length === 0) {
			const pieces = countPieces(b);
			const diff = player === WHITE ?
				pieces.white - pieces.black :
				pieces.black - pieces.white;
			return { score: diff * 1000 };
		}

		if (moves.length === 0) {
			return minimax(b, depth - 1, alpha, beta, !maximizingPlayer, player);
		}

		if (maximizingPlayer) {
			let maxEval = -Infinity;
			let bestMove = moves[0];

			for (const [row, col] of moves) {
				const newBoard = copyBoard(b);
				makeMove(row, col, player, newBoard);
				const result = minimax(newBoard, depth - 1, alpha, beta, false, player);

				if (result.score > maxEval) {
					maxEval = result.score;
					bestMove = [row, col];
				}
				alpha = Math.max(alpha, result.score);
				if (beta <= alpha) break;
			}
			return { score: maxEval, move: bestMove };
		} else {
			let minEval = Infinity;
			let bestMove = moves[0];

			for (const [row, col] of moves) {
				const newBoard = copyBoard(b);
				makeMove(row, col, opponent, newBoard);
				const result = minimax(newBoard, depth - 1, alpha, beta, true, player);

				if (result.score < minEval) {
					minEval = result.score;
					bestMove = [row, col];
				}
				beta = Math.min(beta, result.score);
				if (beta <= alpha) break;
			}
			return { score: minEval, move: bestMove };
		}
	}

	function getBestMove(player: number): [number, number] | undefined {
		const size = board.length;
		const pieces = countPieces(board);
		const emptyCount = size * size - pieces.black - pieces.white;

		let depth: number;
		if (size === 6) {
			depth = emptyCount < 10 ? 8 : 6;
		} else if (size === 8) {
			depth = emptyCount < 12 ? 6 : 5;
		} else {
			depth = emptyCount < 15 ? 5 : 4;
		}

		const result = minimax(
			copyBoard(board),
			depth,
			-Infinity,
			Infinity,
			true,
			player
		);
		return result.move;
	}

	function delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async function handleCellClick(row: number, col: number) {
		if (currentPlayer !== BLACK || gameOver || isThinking) return;
		if (!isValidMove(row, col, BLACK, board)) return;

		const flipped = makeMove(row, col, BLACK, board);
		if (flipped) {
			board = copyBoard(board);
			currentPlayer = WHITE;
			await handleTurnSwitch();
		}
	}

	async function handleTurnSwitch() {
		while (!gameOver) {
			const currentMoves = getValidMoves(currentPlayer, board);
			const opponent = currentPlayer === BLACK ? WHITE : BLACK;
			const opponentMoves = getValidMoves(opponent, board);

			if (currentMoves.length === 0 && opponentMoves.length === 0) {
				gameOver = true;
				if (scores.black > scores.white) {
					trackComplete(GAME_NUMBER);
					setTimeout(() => {
						showWinModal = true;
					}, 800);
				}
				return;
			}

			if (currentMoves.length === 0) {
				const who = currentPlayer === BLACK ? t('status.you') : t('status.ai');
				passMessage = `${who} ${t('status.pass')}`;
				await delay(1500);
				passMessage = null;
				currentPlayer = opponent;
				continue;
			}

			if (currentPlayer === WHITE) {
				await aiTurn();
				currentPlayer = BLACK;
			} else {
				return;
			}
		}
	}

	async function aiTurn() {
		isThinking = true;
		await delay(500);

		const move = getBestMove(WHITE);
		if (move) {
			const [row, col] = move;
			makeMove(row, col, WHITE, board);
			board = copyBoard(board);
		}

		isThinking = false;
	}

	function newGame() {
		positionWeights = generatePositionWeights(boardSize);
		board = initBoard(boardSize);
		currentPlayer = BLACK;
		gameOver = false;
		isThinking = false;
		passMessage = null;
		showWinModal = false;

		trackStart(GAME_NUMBER);
	}

	function changeBoardSize(size: number) {
		boardSize = size;
		newGame();
	}

	function isValidMoveCell(row: number, col: number): boolean {
		return validMoves.some(([r, c]) => r === row && c === col);
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<div class="score-board">
		<div class="player">
			<div class="disk black"></div>
			<span class="label">{t('score.you')}</span>
			<span class="score-value">{scores.black}</span>
		</div>
		<div class="player">
			<div class="disk white"></div>
			<span class="label">{t('score.ai')}</span>
			<span class="score-value">{scores.white}</span>
		</div>
	</div>

	<div class="board-wrapper">
		<div class="board size-{boardSize}" style="grid-template-columns: repeat({boardSize}, 1fr)">
			{#each board as row, rowIndex}
				{#each row as cell, colIndex}
					<button
						class="cell"
						class:valid-move={currentPlayer === BLACK && !gameOver && !isThinking && isValidMoveCell(rowIndex, colIndex)}
						class:disabled={gameOver || isThinking}
						onclick={() => handleCellClick(rowIndex, colIndex)}
						aria-label="Cell {rowIndex},{colIndex}"
					>
						{#if cell === BLACK}
							<div class="piece black"></div>
						{:else if cell === WHITE}
							<div class="piece white"></div>
						{/if}
					</button>
				{/each}
			{/each}
		</div>
	</div>

	<div class="board-size-selector">
		<span>{t('boardSize.label')}:</span>
		<button
			class="size-btn"
			class:active={boardSize === 6}
			onclick={() => changeBoardSize(6)}
		>
			6x6
		</button>
		<button
			class="size-btn"
			class:active={boardSize === 8}
			onclick={() => changeBoardSize(8)}
		>
			8x8
		</button>
		<button
			class="size-btn"
			class:active={boardSize === 10}
			onclick={() => changeBoardSize(10)}
		>
			10x10
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

	.score-board {
		display: flex;
		justify-content: center;
		gap: 40px;
		margin-bottom: 20px;
	}

	.player {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 20px;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		border-radius: 12px;
	}

	.disk {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		box-shadow:
			inset 0 -2px 4px rgba(0, 0, 0, 0.4),
			inset 0 2px 4px rgba(255, 255, 255, 0.2),
			0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.disk.black {
		background: linear-gradient(145deg, #404040 0%, #1a1a1a 100%);
	}

	.disk.white {
		background: linear-gradient(145deg, #ffffff 0%, #c8c8c8 100%);
	}

	.label {
		font-weight: 600;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.score-value {
		font-size: 1.3rem;
		font-weight: 700;
		min-width: 30px;
		text-align: center;
	}

	.board-wrapper {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
		width: 100%;
	}

	.board {
		display: grid;
		gap: 2px;
		background: #1a1a1a;
		padding: 8px;
		border-radius: 12px;
		box-shadow:
			inset 0 4px 8px rgba(0, 0, 0, 0.5),
			0 4px 12px rgba(0, 0, 0, 0.3);
		width: 100%;
		max-width: 400px;
	}

	.cell {
		aspect-ratio: 1;
		background: #2e8b2e;
		border-radius: 4px;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		position: relative;
		box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.2);
		transition: background 0.15s ease;
		border: none;
		padding: 0;
		min-width: 44px;
		min-height: 44px;
	}

	.cell:active:not(.disabled) {
		transform: scale(0.95);
	}

	.cell.valid-move {
		background: #3d9e3d;
	}

	.cell.valid-move::after {
		content: '';
		width: 35%;
		height: 35%;
		background: rgba(0, 0, 0, 0.25);
		border-radius: 50%;
		position: absolute;
	}

	.cell.valid-move:active::after {
		background: rgba(0, 0, 0, 0.4);
	}

	.cell.disabled {
		cursor: default;
		pointer-events: none;
	}

	.piece {
		width: 80%;
		height: 80%;
		border-radius: 50%;
		box-shadow:
			inset 0 -4px 8px rgba(0, 0, 0, 0.4),
			inset 0 4px 8px rgba(255, 255, 255, 0.2),
			0 3px 6px rgba(0, 0, 0, 0.4);
		transition: transform 0.3s ease;
	}

	.piece.black {
		background: linear-gradient(145deg, #404040 0%, #1a1a1a 100%);
	}

	.piece.white {
		background: linear-gradient(145deg, #ffffff 0%, #c8c8c8 100%);
	}

	.board-size-selector {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 20px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.board-size-selector span {
		font-size: 0.85rem;
		color: white;
	}

	.size-btn {
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

	.size-btn.active {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		color: white;
		border-color: transparent;
	}

	.size-btn:active {
		transform: scale(0.95);
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

	/* Board size adjustments */
	.board.size-6 .cell {
		min-width: 50px;
		min-height: 50px;
	}

	.board.size-10 .cell {
		min-width: 36px;
		min-height: 36px;
	}

	/* Responsive adjustments */
	@media (max-width: 450px) {
		.board.size-8 .cell {
			min-width: 38px;
			min-height: 38px;
		}

		.board.size-6 .cell {
			min-width: 44px;
			min-height: 44px;
		}

		.board.size-10 .cell {
			min-width: 30px;
			min-height: 30px;
		}

		.score-board {
			gap: 20px;
		}

		.player {
			padding: 8px 14px;
		}
	}
</style>
