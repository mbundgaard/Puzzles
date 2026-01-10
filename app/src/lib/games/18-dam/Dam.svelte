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
	const GAME_NUMBER = '18';
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
	const EMPTY = 0;
	const PLAYER = 1;      // Dark pieces, bottom
	const AI = 2;          // Light pieces, top
	const PLAYER_KING = 3;
	const AI_KING = 4;

	type Difficulty = 'easy' | 'medium' | 'hard';

	const DIFFICULTIES: Record<Difficulty, number> = {
		easy: 2,
		medium: 4,
		hard: 6
	};

	// Game state
	let board = $state<number[][]>([]);
	let selectedPiece = $state<{ row: number; col: number } | null>(null);
	let validMoves = $state<Array<{ row: number; col: number; capturedRow?: number; capturedCol?: number }>>([]);
	let isPlayerTurn = $state(true);
	let mustCapture = $state<Array<{ row: number; col: number }>>([]);
	let multiJumpPiece = $state<{ row: number; col: number } | null>(null);
	let gameOver = $state(false);
	let difficulty = $state<Difficulty>('medium');
	let isThinking = $state(false);

	// Derived state
	let playerPieces = $derived.by(() => {
		let count = 0;
		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				if (isPlayerPiece(board[row]?.[col])) count++;
			}
		}
		return count;
	});

	let aiPieces = $derived.by(() => {
		let count = 0;
		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				if (isAIPiece(board[row]?.[col])) count++;
			}
		}
		return count;
	});

	let status = $derived.by(() => {
		if (gameOver) {
			if (playerPieces > aiPieces || aiPieces === 0) return t('status.won');
			return t('status.lost');
		}
		if (isThinking) return t('status.aiThinking');
		if (mustCapture.length > 0) return t('status.mustCapture');
		return t('status.yourTurn');
	});

	let statusClass = $derived.by(() => {
		if (gameOver) {
			if (playerPieces > aiPieces || aiPieces === 0) return 'winner';
			return 'loser';
		}
		if (isThinking) return 'thinking';
		return '';
	});

	// Helper functions
	function isPlayerPiece(piece: number | undefined): boolean {
		return piece === PLAYER || piece === PLAYER_KING;
	}

	function isAIPiece(piece: number | undefined): boolean {
		return piece === AI || piece === AI_KING;
	}

	function isKing(piece: number | undefined): boolean {
		return piece === PLAYER_KING || piece === AI_KING;
	}

	function getValidMoves(row: number, col: number, boardState: number[][] = board): { moves: Array<{ row: number; col: number }>; captures: Array<{ row: number; col: number; capturedRow: number; capturedCol: number }> } {
		const piece = boardState[row]?.[col];
		if (!piece || piece === EMPTY) return { moves: [], captures: [] };

		const isPlayer = isPlayerPiece(piece);
		const isPieceKing = isKing(piece);
		const moves: Array<{ row: number; col: number }> = [];
		const captures: Array<{ row: number; col: number; capturedRow: number; capturedCol: number }> = [];

		const directions: [number, number][] = [];
		if (isPlayer || isPieceKing) {
			directions.push([-1, -1], [-1, 1]); // Up
		}
		if (!isPlayer || isPieceKing) {
			directions.push([1, -1], [1, 1]); // Down
		}

		for (const [dr, dc] of directions) {
			const newRow = row + dr;
			const newCol = col + dc;

			if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
				const target = boardState[newRow][newCol];

				if (target === EMPTY) {
					moves.push({ row: newRow, col: newCol });
				} else if ((isPlayer && isAIPiece(target)) || (!isPlayer && isPlayerPiece(target))) {
					// Can capture
					const jumpRow = newRow + dr;
					const jumpCol = newCol + dc;

					if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
						if (boardState[jumpRow][jumpCol] === EMPTY) {
							captures.push({
								row: jumpRow,
								col: jumpCol,
								capturedRow: newRow,
								capturedCol: newCol
							});
						}
					}
				}
			}
		}

		return { moves, captures };
	}

	function getAllCaptures(isPlayer: boolean, boardState: number[][] = board): Array<{ row: number; col: number; captures: Array<{ row: number; col: number; capturedRow: number; capturedCol: number }> }> {
		const allCaptures: Array<{ row: number; col: number; captures: Array<{ row: number; col: number; capturedRow: number; capturedCol: number }> }> = [];
		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const piece = boardState[row][col];
				if ((isPlayer && isPlayerPiece(piece)) || (!isPlayer && isAIPiece(piece))) {
					const { captures } = getValidMoves(row, col, boardState);
					if (captures.length > 0) {
						allCaptures.push({ row, col, captures });
					}
				}
			}
		}
		return allCaptures;
	}

	function updateMustCapture(): void {
		mustCapture = [];
		if (!isPlayerTurn) return;

		const allCaptures = getAllCaptures(true);
		mustCapture = allCaptures.map(c => ({ row: c.row, col: c.col }));
	}

	function cloneBoard(boardState: number[][]): number[][] {
		return boardState.map(row => [...row]);
	}

	function handleClick(row: number, col: number): void {
		if (!isPlayerTurn || gameOver || isThinking) return;

		const piece = board[row][col];

		// If we're in multi-jump, only allow continuing with same piece
		if (multiJumpPiece) {
			if (row === multiJumpPiece.row && col === multiJumpPiece.col) {
				return;
			}

			// Check if clicking valid capture destination
			const move = validMoves.find(m => m.row === row && m.col === col);
			if (move && move.capturedRow !== undefined) {
				executeMove(multiJumpPiece.row, multiJumpPiece.col, move);
				return;
			}
			return;
		}

		// If clicking on player's piece
		if (isPlayerPiece(piece)) {
			// If must capture, only allow selecting pieces that can capture
			if (mustCapture.length > 0) {
				const canCapture = mustCapture.some(c => c.row === row && c.col === col);
				if (!canCapture) {
					return;
				}
			}

			selectedPiece = { row, col };
			const { moves, captures } = getValidMoves(row, col);

			// If forced capture, only show captures
			if (mustCapture.length > 0) {
				validMoves = captures;
			} else {
				validMoves = [...moves, ...captures];
			}
			return;
		}

		// If piece is selected and clicking on valid move
		if (selectedPiece) {
			const move = validMoves.find(m => m.row === row && m.col === col);
			if (move) {
				executeMove(selectedPiece.row, selectedPiece.col, move);
			}
		}
	}

	function executeMove(fromRow: number, fromCol: number, move: { row: number; col: number; capturedRow?: number; capturedCol?: number }): void {
		const piece = board[fromRow][fromCol];
		const newBoard = cloneBoard(board);
		newBoard[fromRow][fromCol] = EMPTY;

		// Check for king promotion
		let newPiece = piece;
		if (piece === PLAYER && move.row === 0) {
			newPiece = PLAYER_KING;
		} else if (piece === AI && move.row === 7) {
			newPiece = AI_KING;
		}

		newBoard[move.row][move.col] = newPiece;

		// Handle capture
		if (move.capturedRow !== undefined && move.capturedCol !== undefined) {
			newBoard[move.capturedRow][move.capturedCol] = EMPTY;
			board = newBoard;

			// Check for multi-jump
			const { captures } = getValidMoves(move.row, move.col, newBoard);
			if (captures.length > 0 && newPiece === piece) {
				// No multi-jump after promotion
				multiJumpPiece = { row: move.row, col: move.col };
				selectedPiece = multiJumpPiece;
				validMoves = captures;
				return;
			}
		} else {
			board = newBoard;
		}

		selectedPiece = null;
		validMoves = [];
		multiJumpPiece = null;

		// Check for game over
		if (checkGameOver()) return;

		// Switch turn
		isPlayerTurn = !isPlayerTurn;

		if (!isPlayerTurn) {
			isThinking = true;
			setTimeout(() => aiMove(), 500);
		} else {
			updateMustCapture();
		}
	}

	function checkGameOver(): boolean {
		let playerCount = 0;
		let aiCount = 0;
		let playerCanMove = false;
		let aiCanMove = false;

		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const piece = board[row][col];
				if (isPlayerPiece(piece)) {
					playerCount++;
					const { moves, captures } = getValidMoves(row, col);
					if (moves.length > 0 || captures.length > 0) playerCanMove = true;
				}
				if (isAIPiece(piece)) {
					aiCount++;
					const { moves, captures } = getValidMoves(row, col);
					if (moves.length > 0 || captures.length > 0) aiCanMove = true;
				}
			}
		}

		if (playerCount === 0 || !playerCanMove) {
			gameOver = true;
			return true;
		}

		if (aiCount === 0 || !aiCanMove) {
			gameOver = true;
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 500);
			return true;
		}

		return false;
	}

	function aiMove(): void {
		const depth = DIFFICULTIES[difficulty];
		const bestMove = minimax(board, depth, -Infinity, Infinity, false);

		if (bestMove.move) {
			executeAIMove(bestMove.move);
		} else {
			// AI has no moves
			gameOver = true;
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 500);
		}

		isThinking = false;
	}

	function executeAIMove(move: { fromRow: number; fromCol: number; toRow: number; toCol: number; captures: Array<{ row: number; col: number }> }): void {
		const piece = board[move.fromRow][move.fromCol];
		const newBoard = cloneBoard(board);
		newBoard[move.fromRow][move.fromCol] = EMPTY;

		let newPiece = piece;
		if (piece === AI && move.toRow === 7) {
			newPiece = AI_KING;
		}

		newBoard[move.toRow][move.toCol] = newPiece;

		if (move.captures && move.captures.length > 0) {
			for (const cap of move.captures) {
				newBoard[cap.row][cap.col] = EMPTY;
			}
		}

		board = newBoard;

		if (checkGameOver()) return;

		isPlayerTurn = true;
		updateMustCapture();
	}

	interface AIMove {
		fromRow: number;
		fromCol: number;
		toRow: number;
		toCol: number;
		captures: Array<{ row: number; col: number }>;
	}

	function minimax(boardState: number[][], depth: number, alpha: number, beta: number, isMaximizing: boolean): { score: number; move: AIMove | null } {
		if (depth === 0) {
			return { score: evaluateBoard(boardState), move: null };
		}

		const isAI = !isMaximizing;
		const allMoves = getAllMovesForSide(isAI, boardState);

		if (allMoves.length === 0) {
			return { score: isAI ? -1000 : 1000, move: null };
		}

		let bestMove: AIMove | null = null;

		if (isMaximizing) {
			let maxScore = -Infinity;
			for (const move of allMoves) {
				const newBoard = simulateMove(boardState, move);
				const result = minimax(newBoard, depth - 1, alpha, beta, false);
				if (result.score > maxScore) {
					maxScore = result.score;
					bestMove = move;
				}
				alpha = Math.max(alpha, result.score);
				if (beta <= alpha) break;
			}
			return { score: maxScore, move: bestMove };
		} else {
			let minScore = Infinity;
			for (const move of allMoves) {
				const newBoard = simulateMove(boardState, move);
				const result = minimax(newBoard, depth - 1, alpha, beta, true);
				if (result.score < minScore) {
					minScore = result.score;
					bestMove = move;
				}
				beta = Math.min(beta, result.score);
				if (beta <= alpha) break;
			}
			return { score: minScore, move: bestMove };
		}
	}

	function getAllMovesForSide(isAI: boolean, boardState: number[][]): AIMove[] {
		const moves: AIMove[] = [];
		const captures = getAllCaptures(!isAI, boardState);

		// If captures available, must capture
		if (captures.length > 0) {
			for (const piece of captures) {
				for (const cap of piece.captures) {
					// Check for multi-jumps
					const multiJumps = getMultiJumps(piece.row, piece.col, cap, boardState, isAI);
					moves.push(...multiJumps);
				}
			}
			return moves;
		}

		// No captures, get regular moves
		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const piece = boardState[row][col];
				if ((isAI && isAIPiece(piece)) || (!isAI && isPlayerPiece(piece))) {
					const { moves: pieceMoves } = getValidMoves(row, col, boardState);
					for (const m of pieceMoves) {
						moves.push({
							fromRow: row,
							fromCol: col,
							toRow: m.row,
							toCol: m.col,
							captures: []
						});
					}
				}
			}
		}

		return moves;
	}

	function getMultiJumps(fromRow: number, fromCol: number, firstCapture: { row: number; col: number; capturedRow: number; capturedCol: number }, boardState: number[][], _isAI: boolean): AIMove[] {
		const results: AIMove[] = [];
		const piece = boardState[fromRow][fromCol];

		const explore = (row: number, col: number, captures: Array<{ row: number; col: number; toRow: number; toCol: number }>, currentBoard: number[][]): void => {
			const newBoard = cloneBoard(currentBoard);
			const lastCap = captures[captures.length - 1];

			newBoard[row][col] = EMPTY;
			newBoard[lastCap.row][lastCap.col] = EMPTY;
			newBoard[lastCap.toRow][lastCap.toCol] = piece;

			// Check for more captures from new position
			const { captures: moreCaps } = getValidMoves(lastCap.toRow, lastCap.toCol, newBoard);

			if (moreCaps.length === 0) {
				results.push({
					fromRow,
					fromCol,
					toRow: lastCap.toRow,
					toCol: lastCap.toCol,
					captures: captures.map(c => ({ row: c.row, col: c.col }))
				});
			} else {
				for (const cap of moreCaps) {
					explore(lastCap.toRow, lastCap.toCol, [...captures, {
						row: cap.capturedRow,
						col: cap.capturedCol,
						toRow: cap.row,
						toCol: cap.col
					}], newBoard);
				}
			}
		};

		explore(fromRow, fromCol, [{
			row: firstCapture.capturedRow,
			col: firstCapture.capturedCol,
			toRow: firstCapture.row,
			toCol: firstCapture.col
		}], boardState);

		return results;
	}

	function simulateMove(boardState: number[][], move: AIMove): number[][] {
		const newBoard = cloneBoard(boardState);
		const piece = newBoard[move.fromRow][move.fromCol];

		newBoard[move.fromRow][move.fromCol] = EMPTY;

		let newPiece = piece;
		if (piece === PLAYER && move.toRow === 0) {
			newPiece = PLAYER_KING;
		} else if (piece === AI && move.toRow === 7) {
			newPiece = AI_KING;
		}

		newBoard[move.toRow][move.toCol] = newPiece;

		if (move.captures) {
			for (const cap of move.captures) {
				newBoard[cap.row][cap.col] = EMPTY;
			}
		}

		return newBoard;
	}

	function evaluateBoard(boardState: number[][]): number {
		let score = 0;

		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const piece = boardState[row][col];
				if (piece === PLAYER) {
					score -= 10 + (7 - row); // Bonus for advancement
				} else if (piece === PLAYER_KING) {
					score -= 25;
				} else if (piece === AI) {
					score += 10 + row; // Bonus for advancement
				} else if (piece === AI_KING) {
					score += 25;
				}
			}
		}

		return score;
	}

	function newGame(): void {
		const newBoard: number[][] = [];
		for (let row = 0; row < 8; row++) {
			newBoard[row] = [];
			for (let col = 0; col < 8; col++) {
				if ((row + col) % 2 === 1) {
					if (row < 3) {
						newBoard[row][col] = AI;
					} else if (row > 4) {
						newBoard[row][col] = PLAYER;
					} else {
						newBoard[row][col] = EMPTY;
					}
				} else {
					newBoard[row][col] = EMPTY;
				}
			}
		}

		board = newBoard;
		selectedPiece = null;
		validMoves = [];
		isPlayerTurn = true;
		multiJumpPiece = null;
		gameOver = false;
		isThinking = false;
		showWinModal = false;
		updateMustCapture();

		trackStart(GAME_NUMBER);
	}

	function changeDifficulty(newDifficulty: Difficulty): void {
		difficulty = newDifficulty;
		newGame();
	}

	function isValidMoveCell(row: number, col: number): boolean {
		return validMoves.some(m => m.row === row && m.col === col);
	}

	function isCaptureCell(row: number, col: number): boolean {
		return validMoves.some(m => m.row === row && m.col === col && m.capturedRow !== undefined);
	}

	function isMustCaptureCell(row: number, col: number): boolean {
		return mustCapture.some(c => c.row === row && c.col === col);
	}

	function isSelectedCell(row: number, col: number): boolean {
		return selectedPiece?.row === row && selectedPiece?.col === col;
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<div class="score-board">
		<div class="player">
			<div class="disk dark"></div>
			<span class="label">{t('score.you')}</span>
			<span class="score-value">{playerPieces}</span>
		</div>
		<div class="player">
			<div class="disk light"></div>
			<span class="label">{t('score.ai')}</span>
			<span class="score-value">{aiPieces}</span>
		</div>
	</div>

	<div class="board-wrapper">
		<div class="board">
			{#each board as row, rowIndex}
				{#each row as cell, colIndex}
					<button
						class="cell"
						class:dark={(rowIndex + colIndex) % 2 === 1}
						class:light={(rowIndex + colIndex) % 2 === 0}
						class:valid-move={isValidMoveCell(rowIndex, colIndex) && !isCaptureCell(rowIndex, colIndex)}
						class:valid-capture={isCaptureCell(rowIndex, colIndex)}
						class:must-capture={isMustCaptureCell(rowIndex, colIndex)}
						class:disabled={gameOver || isThinking || !isPlayerTurn}
						onclick={() => handleClick(rowIndex, colIndex)}
						aria-label="Cell {rowIndex},{colIndex}"
					>
						{#if cell !== EMPTY}
							<div
								class="piece"
								class:dark-piece={isPlayerPiece(cell)}
								class:light-piece={isAIPiece(cell)}
								class:king={isKing(cell)}
								class:selected={isSelectedCell(rowIndex, colIndex)}
							></div>
						{/if}
					</button>
				{/each}
			{/each}
		</div>
	</div>

	<div class="difficulty-selector">
		<span>{t('difficulty.label')}:</span>
		<button
			class="diff-btn"
			class:active={difficulty === 'easy'}
			onclick={() => changeDifficulty('easy')}
		>
			{t('difficulty.easy')}
		</button>
		<button
			class="diff-btn"
			class:active={difficulty === 'medium'}
			onclick={() => changeDifficulty('medium')}
		>
			{t('difficulty.medium')}
		</button>
		<button
			class="diff-btn"
			class:active={difficulty === 'hard'}
			onclick={() => changeDifficulty('hard')}
		>
			{t('difficulty.hard')}
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
			<li>{t('rules.rule5')}</li>
			<li>{t('rules.rule6')}</li>
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

	.disk.dark {
		background: linear-gradient(145deg, #8b0000 0%, #4a0000 100%);
	}

	.disk.light {
		background: linear-gradient(145deg, #f5f5dc 0%, #c8c8a8 100%);
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
		grid-template-columns: repeat(8, 1fr);
		gap: 0;
		background: #4a3728;
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
		border-radius: 2px;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		position: relative;
		transition: background 0.15s ease;
		border: none;
		padding: 0;
		min-width: 44px;
		min-height: 44px;
	}

	.cell.light {
		background: #d4a574;
		cursor: default;
	}

	.cell.dark {
		background: #8b4513;
	}

	.cell:active:not(.disabled):not(.light) {
		transform: scale(0.95);
	}

	.cell.valid-move::after {
		content: '';
		width: 30%;
		height: 30%;
		background: rgba(34, 197, 94, 0.6);
		border-radius: 50%;
		position: absolute;
	}

	.cell.valid-capture::after {
		content: '';
		width: 30%;
		height: 30%;
		background: rgba(239, 68, 68, 0.7);
		border-radius: 50%;
		position: absolute;
	}

	.cell.must-capture {
		animation: glow 1s ease-in-out infinite;
	}

	@keyframes glow {
		0%, 100% { box-shadow: inset 0 0 8px rgba(239, 68, 68, 0.5); }
		50% { box-shadow: inset 0 0 16px rgba(239, 68, 68, 0.8); }
	}

	.cell.disabled {
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
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		position: relative;
	}

	.piece.dark-piece {
		background: linear-gradient(145deg, #8b0000 0%, #4a0000 100%);
	}

	.piece.light-piece {
		background: linear-gradient(145deg, #f5f5dc 0%, #c8c8a8 100%);
	}

	.piece.king::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 40%;
		height: 40%;
		background: gold;
		border-radius: 50%;
		box-shadow:
			inset 0 -2px 4px rgba(0, 0, 0, 0.3),
			0 1px 3px rgba(0, 0, 0, 0.3);
	}

	.piece.selected {
		transform: scale(1.1);
		box-shadow:
			inset 0 -4px 8px rgba(0, 0, 0, 0.4),
			inset 0 4px 8px rgba(255, 255, 255, 0.2),
			0 0 20px rgba(34, 197, 94, 0.8),
			0 3px 6px rgba(0, 0, 0, 0.4);
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

	.diff-btn {
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

	.diff-btn.active {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		color: white;
		border-color: transparent;
	}

	.diff-btn:active {
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

	/* Responsive adjustments */
	@media (max-width: 450px) {
		.cell {
			min-width: 38px;
			min-height: 38px;
		}

		.score-board {
			gap: 20px;
		}

		.player {
			padding: 8px 14px;
		}
	}
</style>
