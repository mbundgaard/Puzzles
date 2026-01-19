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
	const GAME_NUMBER = '11';
	const POINTS = 1;
	const MAX_PIECES = 3;

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

	// Adjacent cells for each position (for movement phase)
	const ADJACENT: number[][] = [
		[1, 3, 4],       // 0: top-left
		[0, 2, 3, 4, 5], // 1: top-center
		[1, 4, 5],       // 2: top-right
		[0, 1, 4, 6, 7], // 3: middle-left
		[0, 1, 2, 3, 5, 6, 7, 8], // 4: center (all surrounding)
		[1, 2, 4, 7, 8], // 5: middle-right
		[3, 4, 7],       // 6: bottom-left
		[3, 4, 5, 6, 8], // 7: bottom-center
		[4, 5, 7]        // 8: bottom-right
	];

	// Game state
	let board = $state<(string | null)[]>(Array(9).fill(null));
	let currentPlayer = $state<'X' | 'O'>('X');
	let gamePhase = $state<'placing' | 'moving'>('placing');
	let selectedPiece = $state<number | null>(null);
	let gameOver = $state(false);
	let difficulty = $state<'easy' | 'medium' | 'hard'>('easy');
	let scores = $state({ player: 0, ai: 0 });
	let winner = $state<string | null>(null);
	let winningPattern = $state<number[] | null>(null);
	let moveCount = $state(0);

	const WIN_PATTERNS = [
		[0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
		[0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
		[0, 4, 8], [2, 4, 6]              // Diagonals
	];

	// Count pieces for a player
	function countPieces(player: string): number {
		return board.filter(cell => cell === player).length;
	}

	// Check if all pieces are placed
	let allPiecesPlaced = $derived(countPieces('X') >= MAX_PIECES && countPieces('O') >= MAX_PIECES);

	// Get valid moves for a piece at given position
	function getValidMoves(fromIndex: number): number[] {
		return ADJACENT[fromIndex].filter(i => board[i] === null);
	}

	// Check if a player has any valid moves
	function hasValidMoves(player: string): boolean {
		for (let i = 0; i < 9; i++) {
			if (board[i] === player && getValidMoves(i).length > 0) {
				return true;
			}
		}
		return false;
	}

	// Status message
	let status = $derived.by(() => {
		if (winner === 'X') return t('status.won');
		if (winner === 'O') return t('status.lost');
		if (currentPlayer === 'O') return t('status.aiThinking');
		if (gamePhase === 'placing') {
			const remaining = MAX_PIECES - countPieces('X');
			return t('status.placePieces').replace('{n}', String(remaining));
		}
		if (selectedPiece !== null) return t('status.moveSelected');
		return t('status.selectPiece');
	});

	let statusClass = $derived.by(() => {
		if (winner === 'X') return 'winner';
		if (winner === 'O') return 'loser';
		return '';
	});

	function newGame() {
		board = Array(9).fill(null);
		currentPlayer = 'X';
		gamePhase = 'placing';
		selectedPiece = null;
		gameOver = false;
		winner = null;
		winningPattern = null;
		showWinModal = false;
		moveCount = 0;

		// Track game start
		trackStart(GAME_NUMBER);
	}

	function handleCellClick(index: number) {
		if (gameOver || currentPlayer !== 'X') return;

		if (gamePhase === 'placing') {
			// Placing phase: place a piece on empty cell
			if (board[index] !== null) return;
			if (countPieces('X') >= MAX_PIECES) return;

			placePiece(index, 'X');
		} else {
			// Moving phase
			if (selectedPiece === null) {
				// Select a piece to move
				if (board[index] === 'X' && getValidMoves(index).length > 0) {
					selectedPiece = index;
				}
			} else {
				// Move the selected piece
				if (index === selectedPiece) {
					// Deselect
					selectedPiece = null;
				} else if (board[index] === 'X' && getValidMoves(index).length > 0) {
					// Select different piece
					selectedPiece = index;
				} else if (board[index] === null && ADJACENT[selectedPiece].includes(index)) {
					// Valid move - execute it
					movePiece(selectedPiece, index, 'X');
					selectedPiece = null;
				}
			}
		}
	}

	function placePiece(index: number, player: 'X' | 'O') {
		board[index] = player;
		board = [...board];
		moveCount++;

		const result = checkWinner();
		if (result) {
			endGame(result);
			return;
		}

		// Check if we should switch to moving phase
		if (countPieces('X') >= MAX_PIECES && countPieces('O') >= MAX_PIECES) {
			gamePhase = 'moving';
		}

		if (!gameOver) {
			currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
			if (currentPlayer === 'O') {
				setTimeout(() => aiTurn(), 500);
			}
		}
	}

	function movePiece(from: number, to: number, player: 'X' | 'O') {
		board[from] = null;
		board[to] = player;
		board = [...board];
		moveCount++;

		const result = checkWinner();
		if (result) {
			endGame(result);
			return;
		}

		// Check if opponent has valid moves
		const opponent = player === 'X' ? 'O' : 'X';
		if (!hasValidMoves(opponent)) {
			// Opponent has no moves - they lose
			endGame(player);
			return;
		}

		if (!gameOver) {
			currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
			if (currentPlayer === 'O') {
				setTimeout(() => aiTurn(), 500);
			}
		}
	}

	function aiTurn() {
		if (gameOver) return;

		if (gamePhase === 'placing') {
			aiPlace();
		} else {
			aiMove();
		}
	}

	function aiPlace() {
		if (countPieces('O') >= MAX_PIECES) return;

		let move: number | null = null;

		switch (difficulty) {
			case 'easy':
				move = getRandomEmptyCell();
				break;
			case 'medium':
				move = Math.random() < 0.6 ? getBestPlacement() : getRandomEmptyCell();
				break;
			case 'hard':
				move = getBestPlacement();
				break;
		}

		if (move !== null) {
			placePiece(move, 'O');
		}
	}

	function aiMove() {
		if (!hasValidMoves('O')) {
			endGame('X');
			return;
		}

		let bestMove: { from: number; to: number } | null = null;

		switch (difficulty) {
			case 'easy':
				bestMove = getRandomMove('O');
				break;
			case 'medium':
				bestMove = Math.random() < 0.6 ? getBestMove('O') : getRandomMove('O');
				break;
			case 'hard':
				bestMove = getBestMove('O');
				break;
		}

		if (bestMove) {
			movePiece(bestMove.from, bestMove.to, 'O');
		}
	}

	function getRandomEmptyCell(): number | null {
		const available = board
			.map((val, idx) => (val === null ? idx : null))
			.filter((val): val is number => val !== null);
		if (available.length === 0) return null;
		return available[Math.floor(Math.random() * available.length)];
	}

	function getBestPlacement(): number | null {
		// Simple heuristic: center > corners > edges
		// Also check for winning/blocking moves
		const empty = board
			.map((val, idx) => (val === null ? idx : null))
			.filter((val): val is number => val !== null);

		// Check for winning move
		for (const idx of empty) {
			board[idx] = 'O';
			if (checkWinnerOnBoard(board) === 'O') {
				board[idx] = null;
				return idx;
			}
			board[idx] = null;
		}

		// Check for blocking move
		for (const idx of empty) {
			board[idx] = 'X';
			if (checkWinnerOnBoard(board) === 'X') {
				board[idx] = null;
				return idx;
			}
			board[idx] = null;
		}

		// Prefer center
		if (empty.includes(4)) return 4;

		// Then corners
		const corners = [0, 2, 6, 8].filter(i => empty.includes(i));
		if (corners.length > 0) {
			return corners[Math.floor(Math.random() * corners.length)];
		}

		// Then edges
		return empty[Math.floor(Math.random() * empty.length)];
	}

	function getRandomMove(player: string): { from: number; to: number } | null {
		const pieces = board
			.map((val, idx) => (val === player ? idx : null))
			.filter((val): val is number => val !== null);

		const validMoves: { from: number; to: number }[] = [];
		for (const from of pieces) {
			for (const to of getValidMoves(from)) {
				validMoves.push({ from, to });
			}
		}

		if (validMoves.length === 0) return null;
		return validMoves[Math.floor(Math.random() * validMoves.length)];
	}

	function getBestMove(player: string): { from: number; to: number } | null {
		const opponent = player === 'X' ? 'O' : 'X';
		const pieces = board
			.map((val, idx) => (val === player ? idx : null))
			.filter((val): val is number => val !== null);

		let bestMove: { from: number; to: number } | null = null;
		let bestScore = -Infinity;

		for (const from of pieces) {
			for (const to of getValidMoves(from)) {
				// Simulate move
				board[from] = null;
				board[to] = player;

				// Check for immediate win
				if (checkWinnerOnBoard(board) === player) {
					board[from] = player;
					board[to] = null;
					return { from, to };
				}

				// Evaluate position
				let score = evaluatePosition(player);

				// Check if opponent can win after this move
				let opponentCanWin = false;
				const oppPieces = board
					.map((val, idx) => (val === opponent ? idx : null))
					.filter((val): val is number => val !== null);

				for (const oppFrom of oppPieces) {
					for (const oppTo of ADJACENT[oppFrom].filter(i => board[i] === null)) {
						board[oppFrom] = null;
						board[oppTo] = opponent;
						if (checkWinnerOnBoard(board) === opponent) {
							opponentCanWin = true;
						}
						board[oppFrom] = opponent;
						board[oppTo] = null;
						if (opponentCanWin) break;
					}
					if (opponentCanWin) break;
				}

				if (opponentCanWin) {
					score -= 100;
				}

				// Undo move
				board[from] = player;
				board[to] = null;

				if (score > bestScore) {
					bestScore = score;
					bestMove = { from, to };
				}
			}
		}

		return bestMove || getRandomMove(player);
	}

	function evaluatePosition(player: string): number {
		let score = 0;
		const opponent = player === 'X' ? 'O' : 'X';

		for (const pattern of WIN_PATTERNS) {
			const playerCount = pattern.filter(i => board[i] === player).length;
			const opponentCount = pattern.filter(i => board[i] === opponent).length;

			if (opponentCount === 0) {
				score += playerCount * playerCount;
			}
			if (playerCount === 0) {
				score -= opponentCount * opponentCount;
			}
		}

		// Prefer center
		if (board[4] === player) score += 3;

		return score;
	}

	function checkWinner(): string | null {
		return checkWinnerOnBoard(board);
	}

	function checkWinnerOnBoard(b: (string | null)[]): string | null {
		for (const pattern of WIN_PATTERNS) {
			const [a, bIdx, c] = pattern;
			if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) {
				return b[a];
			}
		}
		return null;
	}

	function getWinningPattern(): number[] | null {
		for (const pattern of WIN_PATTERNS) {
			const [a, b, c] = pattern;
			if (board[a] && board[a] === board[b] && board[a] === board[c]) {
				return pattern;
			}
		}
		return null;
	}

	function endGame(result: string) {
		gameOver = true;
		winner = result;
		winningPattern = getWinningPattern();

		if (result === 'X') {
			scores.player++;
			scores = { ...scores };
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		} else if (result === 'O') {
			scores.ai++;
			scores = { ...scores };
		}
	}

	function setDifficulty(diff: 'easy' | 'medium' | 'hard') {
		difficulty = diff;
		newGame();
	}

	// Get cell class for styling
	function getCellClass(index: number): string {
		let classes = 'cell';
		if (board[index] === 'X') classes += ' x';
		if (board[index] === 'O') classes += ' o';
		if (winningPattern?.includes(index)) classes += ' winning';
		if (gameOver) classes += ' disabled';
		if (selectedPiece === index) classes += ' selected';
		if (gamePhase === 'moving' && selectedPiece !== null && board[index] === null && ADJACENT[selectedPiece].includes(index)) {
			classes += ' valid-move';
		}
		if (gamePhase === 'moving' && currentPlayer === 'X' && board[index] === 'X' && getValidMoves(index).length > 0 && selectedPiece === null) {
			classes += ' selectable';
		}
		return classes;
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<div class="phase-indicator">
		{#if gamePhase === 'placing'}
			<span class="phase">{t('phase.placing')}</span>
			<span class="piece-count">X: {countPieces('X')}/{MAX_PIECES} | O: {countPieces('O')}/{MAX_PIECES}</span>
		{:else}
			<span class="phase">{t('phase.moving')}</span>
		{/if}
	</div>

	<div class="board">
		{#each board as cell, index}
			<button
				class={getCellClass(index)}
				onclick={() => handleCellClick(index)}
				aria-label="Cell {index + 1}"
			>
				{cell || ''}
			</button>
		{/each}
	</div>

	<div class="score">
		<div class="score-item">
			<span class="score-label">{t('score.you')} (X)</span>
			<span class="score-value">{scores.player}</span>
		</div>
		<div class="score-item">
			<span class="score-label">{t('score.ai')} (O)</span>
			<span class="score-value">{scores.ai}</span>
		</div>
	</div>

	<div class="difficulty">
		<span>{t('difficulty.label')}:</span>
		<button
			class="diff-btn"
			class:active={difficulty === 'easy'}
			onclick={() => setDifficulty('easy')}
		>
			{t('difficulty.easy')}
		</button>
		<button
			class="diff-btn"
			class:active={difficulty === 'medium'}
			onclick={() => setDifficulty('medium')}
		>
			{t('difficulty.medium')}
		</button>
		<button
			class="diff-btn"
			class:active={difficulty === 'hard'}
			onclick={() => setDifficulty('hard')}
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
		margin-bottom: 10px;
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

	.phase-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 15px;
		gap: 4px;
	}

	.phase {
		font-size: 0.85rem;
		font-weight: 600;
		color: #a855f7;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.piece-count {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.board {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		width: 100%;
		max-width: 300px;
		margin-bottom: 25px;
	}

	.cell {
		aspect-ratio: 1;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 15px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s ease;
		border: 2px solid rgba(255, 255, 255, 0.1);
		color: white;
		font-family: 'Poppins', sans-serif;
	}

	.cell:active:not(.disabled) {
		transform: scale(0.95);
	}

	.cell.x {
		color: #ec4899;
		text-shadow: 0 0 20px rgba(236, 72, 153, 0.5);
	}

	.cell.o {
		color: #06b6d4;
		text-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
	}

	.cell.winning {
		animation: pulse 0.5s ease infinite alternate;
		background: rgba(34, 197, 94, 0.2);
		border-color: #22c55e;
	}

	.cell.selected {
		border-color: #ec4899;
		background: rgba(236, 72, 153, 0.2);
		box-shadow: 0 0 15px rgba(236, 72, 153, 0.4);
	}

	.cell.valid-move {
		border-color: #22c55e;
		background: rgba(34, 197, 94, 0.15);
		animation: pulse-soft 1s ease infinite;
	}

	.cell.selectable {
		border-color: rgba(236, 72, 153, 0.5);
	}

	@keyframes pulse {
		from { transform: scale(1); }
		to { transform: scale(1.05); }
	}

	@keyframes pulse-soft {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	.cell.disabled {
		cursor: default;
		pointer-events: none;
	}

	.score {
		display: flex;
		gap: 30px;
		margin-bottom: 20px;
	}

	.score-item {
		text-align: center;
		background: rgba(255, 255, 255, 0.05);
		padding: 10px 25px;
		border-radius: 12px;
	}

	.score-label {
		display: block;
		font-size: 0.75rem;
		color: white;
		margin-bottom: 4px;
	}

	.score-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.difficulty {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 20px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.difficulty span {
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
		background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%);
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
		background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%);
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
		content: '•';
		position: absolute;
		left: 0;
		color: #ec4899;
	}
</style>
