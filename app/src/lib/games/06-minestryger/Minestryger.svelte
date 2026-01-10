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
	const GAME_NUMBER = '06';
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

	// Difficulty settings
	const difficulties = {
		easy: { rows: 8, cols: 8, mines: 10 },
		medium: { rows: 10, cols: 10, mines: 20 },
		hard: { rows: 12, cols: 12, mines: 35 }
	};

	// Game state
	let difficulty = $state<'easy' | 'medium' | 'hard'>('medium');
	let grid = $state<number[][]>([]);
	let revealed = $state<boolean[][]>([]);
	let flagged = $state<boolean[][]>([]);
	let gameOver = $state(false);
	let gameWon = $state(false);
	let firstClick = $state(true);
	let flagMode = $state(false);

	// Derived values
	let rows = $derived(difficulties[difficulty].rows);
	let cols = $derived(difficulties[difficulty].cols);
	let totalMines = $derived(difficulties[difficulty].mines);

	let flagCount = $derived.by(() => {
		let count = 0;
		for (let r = 0; r < flagged.length; r++) {
			for (let c = 0; c < (flagged[r]?.length || 0); c++) {
				if (flagged[r][c]) count++;
			}
		}
		return count;
	});

	let minesRemaining = $derived(totalMines - flagCount);

	let status = $derived.by(() => {
		if (gameWon) return t('status.won');
		if (gameOver) return t('status.lost');
		if (flagMode) return t('status.flagMode');
		return t('status.revealMode');
	});

	let statusClass = $derived.by(() => {
		if (gameWon) return 'winner';
		if (gameOver) return 'loser';
		return '';
	});

	function newGame() {
		const { rows: r, cols: c } = difficulties[difficulty];
		grid = Array(r).fill(null).map(() => Array(c).fill(0));
		revealed = Array(r).fill(null).map(() => Array(c).fill(false));
		flagged = Array(r).fill(null).map(() => Array(c).fill(false));
		gameOver = false;
		gameWon = false;
		firstClick = true;
		showWinModal = false;

		trackStart(GAME_NUMBER);
	}

	function placeMines(excludeRow: number, excludeCol: number) {
		const r = difficulties[difficulty].rows;
		const c = difficulties[difficulty].cols;
		const mines = difficulties[difficulty].mines;

		let placed = 0;
		while (placed < mines) {
			const row = Math.floor(Math.random() * r);
			const col = Math.floor(Math.random() * c);
			// Don't place mine on first click or where mine already exists
			if (grid[row][col] !== -1 && !(row === excludeRow && col === excludeCol)) {
				grid[row][col] = -1;
				placed++;
			}
		}
		calculateNumbers();
	}

	function calculateNumbers() {
		const r = difficulties[difficulty].rows;
		const c = difficulties[difficulty].cols;

		for (let row = 0; row < r; row++) {
			for (let col = 0; col < c; col++) {
				if (grid[row][col] === -1) continue;
				let count = 0;
				for (let dr = -1; dr <= 1; dr++) {
					for (let dc = -1; dc <= 1; dc++) {
						const nr = row + dr;
						const nc = col + dc;
						if (nr >= 0 && nr < r && nc >= 0 && nc < c) {
							if (grid[nr][nc] === -1) count++;
						}
					}
				}
				grid[row][col] = count;
			}
		}
		grid = [...grid]; // Trigger reactivity
	}

	function handleCellClick(row: number, col: number) {
		if (gameOver || gameWon || revealed[row][col]) return;

		if (flagMode) {
			toggleFlag(row, col);
			return;
		}

		if (flagged[row][col]) return;

		if (firstClick) {
			placeMines(row, col);
			firstClick = false;
		}

		reveal(row, col);
	}

	function toggleFlag(row: number, col: number) {
		if (revealed[row][col]) return;
		flagged[row][col] = !flagged[row][col];
		flagged = [...flagged]; // Trigger reactivity
	}

	function reveal(row: number, col: number) {
		const r = difficulties[difficulty].rows;
		const c = difficulties[difficulty].cols;

		if (row < 0 || row >= r || col < 0 || col >= c) return;
		if (revealed[row][col] || flagged[row][col]) return;

		revealed[row][col] = true;
		revealed = [...revealed]; // Trigger reactivity

		if (grid[row][col] === -1) {
			// Hit a mine
			gameOver = true;
			revealAllMines();
			return;
		}

		// If empty cell, reveal neighbors
		if (grid[row][col] === 0) {
			for (let dr = -1; dr <= 1; dr++) {
				for (let dc = -1; dc <= 1; dc++) {
					reveal(row + dr, col + dc);
				}
			}
		}

		if (checkWin()) {
			gameWon = true;
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 500);
		}
	}

	function revealAllMines() {
		const r = difficulties[difficulty].rows;
		const c = difficulties[difficulty].cols;

		for (let row = 0; row < r; row++) {
			for (let col = 0; col < c; col++) {
				if (grid[row][col] === -1) {
					revealed[row][col] = true;
				}
			}
		}
		revealed = [...revealed]; // Trigger reactivity
	}

	function checkWin(): boolean {
		const r = difficulties[difficulty].rows;
		const c = difficulties[difficulty].cols;

		for (let row = 0; row < r; row++) {
			for (let col = 0; col < c; col++) {
				if (grid[row][col] !== -1 && !revealed[row][col]) {
					return false;
				}
			}
		}
		return true;
	}

	function setDifficulty(diff: 'easy' | 'medium' | 'hard') {
		difficulty = diff;
		newGame();
	}

	function setMode(mode: 'dig' | 'flag') {
		flagMode = mode === 'flag';
	}

	function getCellClass(row: number, col: number): string {
		const classes = ['cell'];
		if (revealed[row]?.[col]) {
			classes.push('revealed');
			if (grid[row]?.[col] === -1) {
				classes.push('mine');
			} else if (grid[row]?.[col] > 0) {
				classes.push('n' + grid[row][col]);
			}
		} else if (flagged[row]?.[col]) {
			classes.push('flagged');
		}
		return classes.join(' ');
	}

	function getCellContent(row: number, col: number): string {
		if (revealed[row]?.[col]) {
			if (grid[row]?.[col] === -1) return '';
			if (grid[row]?.[col] > 0) return String(grid[row][col]);
		} else if (flagged[row]?.[col]) {
			return '';
		}
		return '';
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<div class="status-bar">
		<div class="mines-left">
			<span class="mine-icon"></span>
			<span>{minesRemaining}</span>
		</div>
		<div class="mode-toggle">
			<button
				class="mode-btn"
				class:active={!flagMode}
				onclick={() => setMode('dig')}
			>
				{t('mode.dig')}
			</button>
			<button
				class="mode-btn"
				class:active={flagMode}
				onclick={() => setMode('flag')}
			>
				<span class="flag-icon"></span> {t('mode.flag')}
			</button>
		</div>
	</div>

	<div class="board-wrapper">
		<div class="board" style="grid-template-columns: repeat({cols}, 1fr)">
			{#each { length: rows } as _, row}
				{#each { length: cols } as _, col}
					<button
						class={getCellClass(row, col)}
						onclick={() => handleCellClick(row, col)}
						disabled={gameOver || gameWon}
						aria-label="Cell {row},{col}"
					>
						{#if revealed[row]?.[col] && grid[row]?.[col] === -1}
							<span class="mine-icon"></span>
						{:else if flagged[row]?.[col] && !revealed[row]?.[col]}
							<span class="flag-icon"></span>
						{:else}
							{getCellContent(row, col)}
						{/if}
					</button>
				{/each}
			{/each}
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

	.status-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		max-width: 400px;
		margin-bottom: 15px;
		gap: 10px;
		flex-wrap: wrap;
	}

	.mines-left {
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		padding: 8px 15px;
		border-radius: 10px;
		font-size: 1.1rem;
		color: #fff;
	}

	.mine-icon::before {
		content: '\1F4A3';
	}

	.flag-icon::before {
		content: '\1F6A9';
	}

	.mode-toggle {
		display: flex;
		gap: 8px;
	}

	.mode-btn {
		padding: 8px 15px;
		font-size: 0.85rem;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		cursor: pointer;
		font-family: 'Poppins', sans-serif;
		font-weight: 600;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.mode-btn.active {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: #fff;
		border-color: transparent;
	}

	.mode-btn:active {
		transform: scale(0.95);
	}

	.board-wrapper {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
		overflow-x: auto;
		width: 100%;
	}

	.board {
		display: grid;
		gap: 2px;
		background: rgba(255, 255, 255, 0.15);
		padding: 4px;
		border-radius: 10px;
	}

	.cell {
		width: 32px;
		height: 32px;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 0.9rem;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
		user-select: none;
		border: none;
		color: white;
		font-family: 'Poppins', sans-serif;
	}

	.cell:active:not(:disabled) {
		transform: scale(0.9);
	}

	.cell:disabled {
		cursor: default;
	}

	.cell.revealed {
		background: rgba(255, 255, 255, 0.08);
		cursor: default;
	}

	.cell.revealed:active {
		transform: none;
	}

	.cell.mine {
		background: #ef4444;
	}

	.cell.flagged {
		background: rgba(251, 191, 36, 0.3);
	}

	.cell.n1 { color: #3b82f6; }
	.cell.n2 { color: #22c55e; }
	.cell.n3 { color: #ef4444; }
	.cell.n4 { color: #8b5cf6; }
	.cell.n5 { color: #f59e0b; }
	.cell.n6 { color: #06b6d4; }
	.cell.n7 { color: #ec4899; }
	.cell.n8 { color: #6b7280; }

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
			width: 28px;
			height: 28px;
			font-size: 0.8rem;
		}

		.status-bar {
			flex-direction: column;
			align-items: center;
		}
	}
</style>
