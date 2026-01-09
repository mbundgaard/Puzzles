<script lang="ts">
	import type { Translations } from '$lib/i18n';

	interface Props {
		translations: Translations;
	}

	let { translations }: Props = $props();

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
	let board = $state<(string | null)[]>(Array(9).fill(null));
	let currentPlayer = $state<'X' | 'O'>('X');
	let gameOver = $state(false);
	let difficulty = $state<'easy' | 'medium' | 'hard'>('easy');
	let scores = $state({ player: 0, ai: 0, draw: 0 });
	let winner = $state<string | null>(null);
	let winningPattern = $state<number[] | null>(null);

	const WIN_PATTERNS = [
		[0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
		[0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
		[0, 4, 8], [2, 4, 6]              // Diagonals
	];

	// Status message
	let status = $derived.by(() => {
		if (winner === 'X') return t('status.won');
		if (winner === 'O') return t('status.lost');
		if (winner === 'draw') return t('status.draw');
		if (currentPlayer === 'O') return t('status.aiThinking');
		return t('status.yourTurn');
	});

	let statusClass = $derived.by(() => {
		if (winner === 'X') return 'winner';
		if (winner === 'O') return 'loser';
		if (winner === 'draw') return 'draw';
		return '';
	});

	function newGame() {
		board = Array(9).fill(null);
		currentPlayer = 'X';
		gameOver = false;
		winner = null;
		winningPattern = null;

		// Track game start
		trackEvent('start');
	}

	function handleCellClick(index: number) {
		if (gameOver || currentPlayer !== 'X' || board[index]) return;

		makeMove(index, 'X');

		if (!gameOver) {
			currentPlayer = 'O';
			setTimeout(() => aiMove(), 500);
		}
	}

	function makeMove(index: number, player: 'X' | 'O') {
		board[index] = player;
		board = [...board]; // Trigger reactivity

		const result = checkWinner();
		if (result) {
			endGame(result);
		} else if (!board.includes(null)) {
			endGame('draw');
		}
	}

	function aiMove() {
		if (gameOver) return;

		let move: number | null = null;

		switch (difficulty) {
			case 'easy':
				move = getRandomMove();
				break;
			case 'medium':
				move = Math.random() < 0.6 ? getBestMove() : getRandomMove();
				break;
			case 'hard':
				move = getBestMove();
				break;
		}

		if (move !== null) {
			makeMove(move, 'O');
		}

		if (!gameOver) {
			currentPlayer = 'X';
		}
	}

	function getRandomMove(): number | null {
		const available = board
			.map((val, idx) => (val === null ? idx : null))
			.filter((val): val is number => val !== null);
		if (available.length === 0) return null;
		return available[Math.floor(Math.random() * available.length)];
	}

	function getBestMove(): number | null {
		let bestScore = -Infinity;
		let bestMove: number | null = null;

		for (let i = 0; i < 9; i++) {
			if (board[i] === null) {
				board[i] = 'O';
				const score = minimax(board, 0, false);
				board[i] = null;
				if (score > bestScore) {
					bestScore = score;
					bestMove = i;
				}
			}
		}

		return bestMove;
	}

	function minimax(b: (string | null)[], depth: number, isMaximizing: boolean): number {
		const result = checkWinnerOnBoard(b);
		if (result === 'O') return 10 - depth;
		if (result === 'X') return depth - 10;
		if (!b.includes(null)) return 0;

		if (isMaximizing) {
			let bestScore = -Infinity;
			for (let i = 0; i < 9; i++) {
				if (b[i] === null) {
					b[i] = 'O';
					const score = minimax(b, depth + 1, false);
					b[i] = null;
					bestScore = Math.max(score, bestScore);
				}
			}
			return bestScore;
		} else {
			let bestScore = Infinity;
			for (let i = 0; i < 9; i++) {
				if (b[i] === null) {
					b[i] = 'X';
					const score = minimax(b, depth + 1, true);
					b[i] = null;
					bestScore = Math.min(score, bestScore);
				}
			}
			return bestScore;
		}
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
			trackEvent('complete');
			// Could show win modal here
		} else if (result === 'O') {
			scores.ai++;
			scores = { ...scores };
		} else {
			scores.draw++;
			scores = { ...scores };
		}
	}

	function setDifficulty(diff: 'easy' | 'medium' | 'hard') {
		difficulty = diff;
		newGame();
	}

	async function trackEvent(event: 'start' | 'complete') {
		try {
			await fetch('https://puzzlesapi.azurewebsites.net/api/event', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ game: '11', event })
			});
		} catch {
			// Ignore tracking errors
		}
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<div class="board">
		{#each board as cell, index}
			<button
				class="cell"
				class:x={cell === 'X'}
				class:o={cell === 'O'}
				class:winning={winningPattern?.includes(index)}
				class:disabled={gameOver}
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
			<span class="score-label">{t('score.draw')}</span>
			<span class="score-value">{scores.draw}</span>
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
		</ul>
	</div>
</div>

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

	@keyframes pulse {
		from { transform: scale(1); }
		to { transform: scale(1.05); }
	}

	.cell.disabled {
		cursor: default;
		pointer-events: none;
	}

	.score {
		display: flex;
		gap: 20px;
		margin-bottom: 20px;
	}

	.score-item {
		text-align: center;
		background: rgba(255, 255, 255, 0.05);
		padding: 10px 20px;
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
