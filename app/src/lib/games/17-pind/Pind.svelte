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
	const GAME_NUMBER = '17';
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

	// Board types and layouts
	// 0 = invalid, 1 = valid position
	const layouts = {
		english: [
			[0, 0, 1, 1, 1, 0, 0],
			[0, 0, 1, 1, 1, 0, 0],
			[1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1],
			[0, 0, 1, 1, 1, 0, 0],
			[0, 0, 1, 1, 1, 0, 0]
		],
		european: [
			[0, 0, 1, 1, 1, 0, 0],
			[0, 1, 1, 1, 1, 1, 0],
			[1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1],
			[0, 1, 1, 1, 1, 1, 0],
			[0, 0, 1, 1, 1, 0, 0]
		]
	};

	type CellState = 'invalid' | 'hole' | 'peg';
	type BoardType = 'english' | 'european';
	type Move = { toX: number; toY: number; jumpX: number; jumpY: number };

	// Game state
	let board = $state<CellState[][]>([]);
	let boardType = $state<BoardType>('english');
	let selectedPeg = $state<{ x: number; y: number; moves: Move[] } | null>(null);
	let moves = $state(0);
	let history = $state<{ fromX: number; fromY: number; toX: number; toY: number; jumpX: number; jumpY: number }[]>([]);
	let gameOver = $state(false);
	let gameResult = $state<'perfect' | 'almost' | 'lost' | null>(null);

	// Derived state
	let pegCount = $derived.by(() => {
		let count = 0;
		for (let y = 0; y < 7; y++) {
			for (let x = 0; x < 7; x++) {
				if (board[y]?.[x] === 'peg') count++;
			}
		}
		return count;
	});

	let canUndo = $derived(history.length > 0);

	let validDestinations = $derived.by(() => {
		if (!selectedPeg) return new Set<string>();
		return new Set(selectedPeg.moves.map(m => `${m.toX},${m.toY}`));
	});

	function newGame() {
		const layout = layouts[boardType];
		const newBoard: CellState[][] = [];

		for (let y = 0; y < 7; y++) {
			const row: CellState[] = [];
			for (let x = 0; x < 7; x++) {
				if (layout[y][x] === 0) {
					row.push('invalid');
				} else if (x === 3 && y === 3) {
					row.push('hole'); // Center starts empty
				} else {
					row.push('peg');
				}
			}
			newBoard.push(row);
		}

		board = newBoard;
		selectedPeg = null;
		moves = 0;
		history = [];
		gameOver = false;
		gameResult = null;
		showWinModal = false;

		trackStart(GAME_NUMBER);
	}

	function getValidMoves(x: number, y: number): Move[] {
		const moveList: Move[] = [];
		const directions = [
			[0, -2, 0, -1], // Up
			[0, 2, 0, 1],   // Down
			[-2, 0, -1, 0], // Left
			[2, 0, 1, 0]    // Right
		];

		for (const [dx, dy, jx, jy] of directions) {
			const newX = x + dx;
			const newY = y + dy;
			const jumpX = x + jx;
			const jumpY = y + jy;

			if (newX >= 0 && newX < 7 && newY >= 0 && newY < 7) {
				if (board[newY]?.[newX] === 'hole' && board[jumpY]?.[jumpX] === 'peg') {
					moveList.push({ toX: newX, toY: newY, jumpX, jumpY });
				}
			}
		}

		return moveList;
	}

	function hasAnyValidMoves(): boolean {
		for (let y = 0; y < 7; y++) {
			for (let x = 0; x < 7; x++) {
				if (board[y]?.[x] === 'peg') {
					if (getValidMoves(x, y).length > 0) {
						return true;
					}
				}
			}
		}
		return false;
	}

	function handleCellClick(x: number, y: number) {
		if (gameOver) return;

		const cell = board[y]?.[x];
		if (!cell || cell === 'invalid') return;

		if (cell === 'peg') {
			if (selectedPeg && selectedPeg.x === x && selectedPeg.y === y) {
				// Deselect
				selectedPeg = null;
			} else {
				// Select new peg
				const pegMoves = getValidMoves(x, y);
				if (pegMoves.length > 0) {
					selectedPeg = { x, y, moves: pegMoves };
				} else {
					selectedPeg = null;
				}
			}
			return;
		}

		if (cell === 'hole' && selectedPeg) {
			// Try to make a move
			const move = selectedPeg.moves.find(m => m.toX === x && m.toY === y);
			if (move) {
				makeMove(selectedPeg.x, selectedPeg.y, move);
			}
			selectedPeg = null;

			// Check for game over
			setTimeout(() => checkGameOver(), 100);
		}
	}

	function makeMove(fromX: number, fromY: number, move: Move) {
		// Save state for undo
		history = [...history, {
			fromX, fromY,
			toX: move.toX, toY: move.toY,
			jumpX: move.jumpX, jumpY: move.jumpY
		}];

		// Execute move
		board[fromY][fromX] = 'hole';
		board[move.jumpY][move.jumpX] = 'hole';
		board[move.toY][move.toX] = 'peg';
		board = [...board]; // Trigger reactivity
		moves++;
	}

	function undo() {
		if (history.length === 0) return;

		const move = history[history.length - 1];
		history = history.slice(0, -1);

		board[move.fromY][move.fromX] = 'peg';
		board[move.jumpY][move.jumpX] = 'peg';
		board[move.toY][move.toX] = 'hole';
		board = [...board]; // Trigger reactivity

		moves--;
		selectedPeg = null;
		gameOver = false;
		gameResult = null;
	}

	function checkGameOver() {
		if (hasAnyValidMoves()) return;

		gameOver = true;

		if (pegCount === 1) {
			// Check if peg is in center
			const centerPeg = board[3]?.[3] === 'peg';

			if (centerPeg) {
				gameResult = 'perfect';
			} else {
				gameResult = 'almost';
			}

			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 500);
		} else {
			gameResult = 'lost';
		}
	}

	function changeBoardType(type: BoardType) {
		boardType = type;
		newGame();
	}

	function isJumpable(x: number, y: number): boolean {
		if (board[y]?.[x] !== 'peg') return false;
		return getValidMoves(x, y).length > 0;
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="controls">
		<select
			value={boardType}
			onchange={(e) => changeBoardType(e.currentTarget.value as BoardType)}
		>
			<option value="english">{t('board.english')}</option>
			<option value="european">{t('board.european')}</option>
		</select>
		<button class="btn primary" onclick={newGame}>{t('newGame')}</button>
	</div>

	<div class="stats">
		<span>{t('stats.moves')}: <strong>{moves}</strong></span>
		<span>{t('stats.pegs')}: <strong>{pegCount}</strong></span>
		<button
			class="btn undo"
			onclick={undo}
			disabled={!canUndo}
		>
			{t('undo')}
		</button>
	</div>

	{#if gameOver && gameResult}
		<div class="result" class:win={gameResult !== 'lost'} class:lose={gameResult === 'lost'}>
			{#if gameResult === 'perfect'}
				{t('status.perfect')}
			{:else if gameResult === 'almost'}
				{t('status.almostPerfect')}
			{:else}
				{t('status.gameOver')}
			{/if}
		</div>
		<div class="result-message">
			{#if gameResult === 'perfect'}
				{t('status.perfectMessage')}
			{:else if gameResult === 'almost'}
				{t('status.almostMessage')}
			{:else}
				{t('status.lostMessage').replace('{count}', String(pegCount))}
			{/if}
		</div>
	{/if}

	<div class="board-wrapper">
		<div class="board">
			{#each board as row, y}
				{#each row as cell, x}
					<button
						class="cell"
						class:invalid={cell === 'invalid'}
						class:hole={cell === 'hole'}
						class:peg={cell === 'peg'}
						class:selected={selectedPeg?.x === x && selectedPeg?.y === y}
						class:jumpable={cell === 'peg' && isJumpable(x, y)}
						class:valid-move={cell === 'hole' && validDestinations.has(`${x},${y}`)}
						onclick={() => handleCellClick(x, y)}
						disabled={cell === 'invalid'}
						aria-label="Cell {x},{y}"
					>
					</button>
				{/each}
			{/each}
		</div>
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

	.controls {
		display: flex;
		justify-content: center;
		gap: 15px;
		margin-bottom: 15px;
		flex-wrap: wrap;
	}

	.controls select {
		padding: 10px 20px;
		font-size: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		color: #fff;
		font-family: inherit;
		cursor: pointer;
	}

	.controls select option {
		background: #1a1a3e;
		color: #fff;
	}

	.btn {
		padding: 10px 25px;
		font-size: 1rem;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		font-family: inherit;
		font-weight: 600;
		transition: transform 0.2s;
	}

	.btn:active {
		transform: scale(0.95);
	}

	.btn.primary {
		background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
		color: white;
	}

	.btn.undo {
		padding: 8px 16px;
		font-size: 0.85rem;
		background: rgba(128, 128, 128, 0.3);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
	}

	.btn.undo:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn.undo:not(:disabled):active {
		background: rgba(128, 128, 128, 0.5);
	}

	.stats {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 20px;
		margin-bottom: 20px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.95rem;
		flex-wrap: wrap;
	}

	.stats strong {
		color: #c084fc;
	}

	.result {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 8px;
		text-align: center;
	}

	.result.win {
		color: #4ade80;
	}

	.result.lose {
		color: #fbbf24;
	}

	.result-message {
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 15px;
		text-align: center;
	}

	.board-wrapper {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
	}

	.board {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
		padding: 15px;
		background: linear-gradient(145deg, #4a3728, #3d2d20);
		border-radius: 12px;
		box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.cell {
		width: 44px;
		height: 44px;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		transition: all 0.15s;
		border-radius: 50%;
		border: none;
		padding: 0;
	}

	.cell.invalid {
		visibility: hidden;
		cursor: default;
		background: transparent;
	}

	.cell.hole {
		background: radial-gradient(circle at 30% 30%, #2d1f16, #1a1208);
		box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);
	}

	.cell.hole.valid-move {
		background: radial-gradient(circle at 30% 30%, #4a3728, #3d2d20);
		box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3), 0 0 8px rgba(168, 85, 247, 0.4);
	}

	.cell.peg {
		background: radial-gradient(circle at 30% 30%, #c084fc, #9333ea);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2);
	}

	.cell.peg:active {
		transform: scale(0.9);
	}

	.cell.peg.selected {
		background: radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b);
		box-shadow: 0 0 15px rgba(251, 191, 36, 0.6), 0 3px 8px rgba(0, 0, 0, 0.4);
		transform: scale(1.1);
	}

	.cell.peg.jumpable:not(.selected) {
		box-shadow: 0 0 10px rgba(168, 85, 247, 0.5), 0 3px 8px rgba(0, 0, 0, 0.4);
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
		color: #a855f7;
	}

	@media (max-width: 400px) {
		.cell {
			width: 38px;
			height: 38px;
		}

		.board {
			padding: 10px;
			gap: 3px;
		}
	}
</style>
