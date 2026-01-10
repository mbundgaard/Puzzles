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
	const GAME_NUMBER = '03';
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

	// Difficulty settings (number of cells to remove)
	const difficulties = {
		easy: 35,
		medium: 45,
		hard: 55
	};

	// Game state
	let difficulty = $state<'easy' | 'medium' | 'hard'>('medium');
	let board = $state<number[][]>([]);
	let solution = $state<number[][]>([]);
	let given = $state<boolean[][]>([]);
	let candidates = $state<Set<number>[][]>([]);
	let selectedCell = $state<{ row: number; col: number } | null>(null);
	let gameWon = $state(false);
	let notesMode = $state(false);

	// Derived values
	let status = $derived(gameWon ? t('status.won') : t('status.playing'));
	let statusClass = $derived(gameWon ? 'winner' : '');

	// Check if a cell is in the same row, column, or 3x3 box as the selected cell
	function isHighlighted(row: number, col: number): boolean {
		if (!selectedCell) return false;
		if (selectedCell.row === row || selectedCell.col === col) return true;
		const boxRow = Math.floor(selectedCell.row / 3);
		const boxCol = Math.floor(selectedCell.col / 3);
		if (Math.floor(row / 3) === boxRow && Math.floor(col / 3) === boxCol) return true;
		return false;
	}

	// Check if a cell has a duplicate in its row, column, or 3x3 box
	function hasConflict(row: number, col: number): boolean {
		const val = board[row][col];
		if (val === 0) return false;

		// Check row
		for (let c = 0; c < 9; c++) {
			if (c !== col && board[row][c] === val) return true;
		}
		// Check column
		for (let r = 0; r < 9; r++) {
			if (r !== row && board[r][col] === val) return true;
		}
		// Check 3x3 box
		const boxRow = Math.floor(row / 3) * 3;
		const boxCol = Math.floor(col / 3) * 3;
		for (let r = boxRow; r < boxRow + 3; r++) {
			for (let c = boxCol; c < boxCol + 3; c++) {
				if ((r !== row || c !== col) && board[r][c] === val) return true;
			}
		}
		return false;
	}

	function generateSolution(): number[][] {
		const grid = Array(9).fill(null).map(() => Array(9).fill(0));
		fillGrid(grid);
		return grid;
	}

	function fillGrid(grid: number[][]): boolean {
		const find = findEmpty(grid);
		if (!find) return true;

		const [row, col] = find;
		const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

		for (const num of nums) {
			if (isValid(grid, row, col, num)) {
				grid[row][col] = num;
				if (fillGrid(grid)) return true;
				grid[row][col] = 0;
			}
		}
		return false;
	}

	function findEmpty(grid: number[][]): [number, number] | null {
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				if (grid[r][c] === 0) return [r, c];
			}
		}
		return null;
	}

	function isValid(grid: number[][], row: number, col: number, num: number): boolean {
		// Check row
		for (let c = 0; c < 9; c++) {
			if (grid[row][c] === num) return false;
		}
		// Check column
		for (let r = 0; r < 9; r++) {
			if (grid[r][col] === num) return false;
		}
		// Check 3x3 box
		const boxRow = Math.floor(row / 3) * 3;
		const boxCol = Math.floor(col / 3) * 3;
		for (let r = boxRow; r < boxRow + 3; r++) {
			for (let c = boxCol; c < boxCol + 3; c++) {
				if (grid[r][c] === num) return false;
			}
		}
		return true;
	}

	function shuffle<T>(array: T[]): T[] {
		const arr = [...array];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	function removeNumbers(grid: number[][]): number[][] {
		const result = grid.map(row => [...row]);
		let toRemove = difficulties[difficulty];

		while (toRemove > 0) {
			const row = Math.floor(Math.random() * 9);
			const col = Math.floor(Math.random() * 9);
			if (result[row][col] !== 0) {
				result[row][col] = 0;
				toRemove--;
			}
		}
		return result;
	}

	function newGame() {
		solution = generateSolution();
		board = removeNumbers(solution);
		given = board.map(row => row.map(cell => cell !== 0));
		candidates = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set<number>()));
		selectedCell = null;
		gameWon = false;
		showWinModal = false;
		notesMode = false;

		trackStart(GAME_NUMBER);
	}

	function selectCell(row: number, col: number) {
		if (given[row][col] || gameWon) return;
		selectedCell = { row, col };
	}

	function enterNumber(num: number) {
		if (!selectedCell || gameWon) return;
		const { row, col } = selectedCell;
		if (given[row][col]) return;

		if (notesMode && num !== 0) {
			// Toggle candidate
			const cellCandidates = candidates[row][col];
			if (cellCandidates.has(num)) {
				cellCandidates.delete(num);
			} else {
				cellCandidates.add(num);
			}
			candidates = [...candidates]; // Trigger reactivity
		} else {
			// Enter number (or clear with 0)
			board[row][col] = num;
			// Clear candidates when entering a number
			candidates[row][col] = new Set<number>();
			board = [...board]; // Trigger reactivity

			if (checkWin()) {
				gameWon = true;
				trackComplete(GAME_NUMBER);
				setTimeout(() => {
					showWinModal = true;
				}, 500);
			}
		}
	}

	function checkWin(): boolean {
		// Check if all cells are filled and no conflicts exist
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				if (board[r][c] === 0) return false;
				if (hasConflict(r, c)) return false;
			}
		}
		return true;
	}

	function setDifficulty(diff: 'easy' | 'medium' | 'hard') {
		difficulty = diff;
		newGame();
	}

	function getCellClass(row: number, col: number): string {
		const classes = ['cell'];
		if (given[row]?.[col]) {
			classes.push('given');
		}
		if (selectedCell?.row === row && selectedCell?.col === col) {
			classes.push('selected');
		} else if (isHighlighted(row, col)) {
			classes.push('highlight');
		}
		// Add error class for duplicates (only for user-entered values)
		if (!given[row]?.[col] && hasConflict(row, col)) {
			classes.push('error');
		}
		// Add border classes for 3x3 box separation
		if ((col + 1) % 3 === 0 && col < 8) {
			classes.push('border-right');
		}
		if ((row + 1) % 3 === 0 && row < 8) {
			classes.push('border-bottom');
		}
		return classes.join(' ');
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

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

	<div class="board-wrapper">
		<div class="board">
			{#each { length: 9 } as _, row}
				{#each { length: 9 } as _, col}
					<button
						class={getCellClass(row, col)}
						onclick={() => selectCell(row, col)}
						disabled={gameWon}
						aria-label="Cell {row},{col}"
					>
						{#if board[row]?.[col] !== 0}
							{board[row][col]}
						{:else if candidates[row]?.[col]?.size > 0}
							<div class="candidates">
								{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
									<span class="candidate">{candidates[row][col].has(num) ? num : ''}</span>
								{/each}
							</div>
						{/if}
					</button>
				{/each}
			{/each}
		</div>
	</div>

	<div class="numpad">
		{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
			<button
				class="num-btn"
				onclick={() => enterNumber(num)}
				disabled={gameWon}
			>
				{num}
			</button>
		{/each}
		<button
			class="num-btn clear"
			onclick={() => enterNumber(0)}
			disabled={gameWon}
		>
			{t('clear')}
		</button>
	</div>

	<div class="mode-toggle">
		<button
			class="mode-btn"
			class:active={!notesMode}
			onclick={() => notesMode = false}
			disabled={gameWon}
		>
			{t('mode.pen')}
		</button>
		<button
			class="mode-btn"
			class:active={notesMode}
			onclick={() => notesMode = true}
			disabled={gameWon}
		>
			{t('mode.notes')}
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
		text-align: center;
	}

	.status.winner {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
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
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-color: transparent;
	}

	.diff-btn:active {
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
		grid-template-columns: repeat(9, 1fr);
		gap: 2px;
		background: rgba(255, 255, 255, 0.2);
		padding: 4px;
		border-radius: 12px;
		max-width: 360px;
		width: 100%;
	}

	.cell {
		aspect-ratio: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 1.2rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
		user-select: none;
		border: none;
		color: white;
	}

	.cell:active:not(:disabled):not(.given) {
		transform: scale(0.9);
	}

	.cell:disabled {
		cursor: default;
	}

	.cell.given {
		color: white;
		cursor: default;
		background: rgba(255, 255, 255, 0.15);
	}

	.cell.selected {
		background: rgba(102, 126, 234, 0.4);
	}

	.cell.highlight {
		background: rgba(102, 126, 234, 0.2);
	}

	.cell.error {
		background: rgba(239, 68, 68, 0.3);
		color: #fca5a5;
	}

	.candidates {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		width: 100%;
		height: 100%;
		padding: 1px;
	}

	.candidate {
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 0.45rem;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1;
	}

	.cell.border-right {
		border-right: 2px solid rgba(255, 255, 255, 0.3);
	}

	.cell.border-bottom {
		border-bottom: 2px solid rgba(255, 255, 255, 0.3);
	}

	.numpad {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 8px;
		margin-bottom: 20px;
		max-width: 300px;
		width: 100%;
	}

	.num-btn {
		aspect-ratio: 1;
		font-size: 1.3rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.num-btn:active:not(:disabled) {
		transform: scale(0.92);
		background: rgba(102, 126, 234, 0.4);
	}

	.num-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.num-btn.clear {
		font-size: 0.9rem;
	}

	.mode-toggle {
		display: flex;
		gap: 8px;
		margin-bottom: 20px;
	}

	.mode-btn {
		padding: 10px 24px;
		font-size: 0.9rem;
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

	.mode-btn.active {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-color: transparent;
	}

	.mode-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.mode-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.controls {
		margin-bottom: 20px;
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
		content: '\2022';
		position: absolute;
		left: 0;
		color: #667eea;
	}

	@media (max-width: 400px) {
		.cell {
			font-size: 1rem;
		}

		.num-btn {
			font-size: 1.1rem;
		}

		.status {
			font-size: 0.95rem;
			padding: 8px 20px;
		}
	}
</style>
