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
	const GAME_NUMBER = '02';
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

	// Cell states
	const EMPTY = 0;
	const TREE = 1;
	const TENT = 2;
	const GRASS = 3;

	const GRID_SIZE = 8;

	// Game state
	let grid = $state<number[][]>([]);
	let solution = $state<number[][]>([]);
	let rowClues = $state<number[]>([]);
	let colClues = $state<number[]>([]);
	let trees = $state<Array<{ row: number; col: number }>>([]);
	let gameWon = $state(false);
	let mode = $state<'tent' | 'grass'>('tent');

	// Derived values
	let status = $derived.by(() => {
		if (gameWon) return t('status.won');
		if (mode === 'tent') return t('status.tentMode');
		return t('status.grassMode');
	});

	let statusClass = $derived.by(() => {
		if (gameWon) return 'winner';
		return '';
	});

	function shuffle<T>(array: T[]): void {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	function getOrthogonalNeighbors(row: number, col: number): Array<[number, number]> {
		const neighbors: Array<[number, number]> = [];
		const directions: Array<[number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		for (const [dr, dc] of directions) {
			const nr = row + dr;
			const nc = col + dc;
			if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
				neighbors.push([nr, nc]);
			}
		}
		return neighbors;
	}

	function canPlaceTent(row: number, col: number, currentGrid: number[][], currentSolution: number[][]): boolean {
		// Check bounds
		if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;

		// Check if cell is empty
		if (currentGrid[row][col] !== EMPTY || currentSolution[row][col] !== EMPTY) return false;

		// Check no adjacent tents (including diagonal)
		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				if (dr === 0 && dc === 0) continue;
				const nr = row + dr;
				const nc = col + dc;
				if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
					if (currentSolution[nr][nc] === TENT) return false;
				}
			}
		}

		return true;
	}

	function tryPlacePair(
		currentGrid: number[][],
		currentSolution: number[][],
		currentTrees: Array<{ row: number; col: number }>
	): boolean {
		// Pick a random empty cell for the tree
		const emptyCells: Array<[number, number]> = [];
		for (let r = 0; r < GRID_SIZE; r++) {
			for (let c = 0; c < GRID_SIZE; c++) {
				if (currentGrid[r][c] === EMPTY && currentSolution[r][c] === EMPTY) {
					emptyCells.push([r, c]);
				}
			}
		}

		if (emptyCells.length === 0) return false;

		// Shuffle and try cells
		shuffle(emptyCells);

		for (const [treeRow, treeCol] of emptyCells) {
			// Get valid tent positions (orthogonally adjacent)
			const tentPositions = getOrthogonalNeighbors(treeRow, treeCol)
				.filter(([r, c]) => canPlaceTent(r, c, currentGrid, currentSolution));

			if (tentPositions.length === 0) continue;

			// Pick a random valid tent position
			const [tentRow, tentCol] = tentPositions[Math.floor(Math.random() * tentPositions.length)];

			// Place the pair
			currentGrid[treeRow][treeCol] = TREE;
			currentSolution[treeRow][treeCol] = TREE;
			currentSolution[tentRow][tentCol] = TENT;
			currentTrees.push({ row: treeRow, col: treeCol });

			return true;
		}

		return false;
	}

	function calculateClues(currentSolution: number[][]): { row: number[]; col: number[] } {
		const rowCluesCalc: number[] = [];
		const colCluesCalc: number[] = [];

		for (let i = 0; i < GRID_SIZE; i++) {
			let rowCount = 0;
			let colCount = 0;
			for (let j = 0; j < GRID_SIZE; j++) {
				if (currentSolution[i][j] === TENT) rowCount++;
				if (currentSolution[j][i] === TENT) colCount++;
			}
			rowCluesCalc.push(rowCount);
			colCluesCalc.push(colCount);
		}

		return { row: rowCluesCalc, col: colCluesCalc };
	}

	function tryGeneratePuzzle(): boolean {
		// Initialize empty grid
		const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(EMPTY));
		const newSolution = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(EMPTY));
		const newTrees: Array<{ row: number; col: number }> = [];

		// Determine number of tree-tent pairs (roughly 1/4 to 1/3 of grid)
		const numPairs = Math.floor(GRID_SIZE * GRID_SIZE / 5) + Math.floor(Math.random() * 3);

		// Place tree-tent pairs
		let placedPairs = 0;
		let failedAttempts = 0;

		while (placedPairs < numPairs && failedAttempts < 200) {
			const result = tryPlacePair(newGrid, newSolution, newTrees);
			if (result) {
				placedPairs++;
				failedAttempts = 0;
			} else {
				failedAttempts++;
			}
		}

		if (placedPairs < numPairs / 2) {
			return false;
		}

		// Calculate clues from solution
		const clues = calculateClues(newSolution);

		// Update state
		solution = newSolution;
		trees = newTrees;
		rowClues = clues.row;
		colClues = clues.col;

		// Clear player grid (keep only trees)
		grid = newGrid.map(row => row.map(cell => cell === TREE ? TREE : EMPTY));

		return true;
	}

	function generateSimplePuzzle(): void {
		// Fallback simple puzzle
		const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(EMPTY));
		const newSolution = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(EMPTY));
		const newTrees: Array<{ row: number; col: number }> = [];

		// Place a few guaranteed pairs
		const pairs: Array<[[number, number], [number, number]]> = [
			[[1, 1], [0, 1]],
			[[3, 4], [3, 5]],
			[[5, 2], [5, 1]],
			[[6, 6], [7, 6]]
		];

		for (const [[tr, tc], [tentr, tentc]] of pairs) {
			newGrid[tr][tc] = TREE;
			newSolution[tr][tc] = TREE;
			newSolution[tentr][tentc] = TENT;
			newTrees.push({ row: tr, col: tc });
		}

		const clues = calculateClues(newSolution);

		solution = newSolution;
		trees = newTrees;
		rowClues = clues.row;
		colClues = clues.col;
		grid = newGrid.map(row => row.map(cell => cell === TREE ? TREE : EMPTY));
	}

	function generatePuzzle(): void {
		let attempts = 0;
		const maxAttempts = 100;

		while (attempts < maxAttempts) {
			attempts++;
			if (tryGeneratePuzzle()) {
				return;
			}
		}

		// Fallback: simple puzzle if generation fails
		console.warn('Using fallback puzzle generation');
		generateSimplePuzzle();
	}

	function newGame(): void {
		gameWon = false;
		showWinModal = false;
		generatePuzzle();
		trackStart(GAME_NUMBER);
	}

	function setMode(newMode: 'tent' | 'grass'): void {
		mode = newMode;
	}

	function countTentsInRow(row: number): number {
		return grid[row].filter(cell => cell === TENT).length;
	}

	function countTentsInCol(col: number): number {
		let count = 0;
		for (let r = 0; r < GRID_SIZE; r++) {
			if (grid[r][col] === TENT) count++;
		}
		return count;
	}

	function isTentInvalid(row: number, col: number): boolean {
		// Check if tent touches another tent (including diagonally)
		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				if (dr === 0 && dc === 0) continue;
				const nr = row + dr;
				const nc = col + dc;
				if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
					if (grid[nr][nc] === TENT) return true;
				}
			}
		}

		// Check if tent is adjacent to at least one tree
		const neighbors = getOrthogonalNeighbors(row, col);
		const hasAdjacentTree = neighbors.some(([r, c]) => grid[r][c] === TREE);
		if (!hasAdjacentTree) return true;

		return false;
	}

	function checkVictory(): void {
		// Check row clues
		for (let r = 0; r < GRID_SIZE; r++) {
			if (countTentsInRow(r) !== rowClues[r]) return;
		}

		// Check column clues
		for (let c = 0; c < GRID_SIZE; c++) {
			if (countTentsInCol(c) !== colClues[c]) return;
		}

		// Check all tents are valid
		for (let r = 0; r < GRID_SIZE; r++) {
			for (let c = 0; c < GRID_SIZE; c++) {
				if (grid[r][c] === TENT && isTentInvalid(r, c)) return;
			}
		}

		// Check each tree has exactly one adjacent tent
		for (const tree of trees) {
			const neighbors = getOrthogonalNeighbors(tree.row, tree.col);
			const adjacentTents = neighbors.filter(([r, c]) => grid[r][c] === TENT);
			if (adjacentTents.length !== 1) return;
		}

		// Check each tent has exactly one adjacent tree (1:1 pairing)
		const tentCount = grid.flat().filter(cell => cell === TENT).length;
		if (tentCount !== trees.length) return;

		// Victory!
		gameWon = true;
		trackComplete(GAME_NUMBER);
		setTimeout(() => {
			showWinModal = true;
		}, 500);
	}

	function handleCellClick(row: number, col: number): void {
		if (gameWon) return;
		if (grid[row][col] === TREE) return;

		if (mode === 'tent') {
			// Tent mode: place or remove tent
			if (grid[row][col] === TENT) {
				grid[row][col] = EMPTY;
			} else if (grid[row][col] === EMPTY || grid[row][col] === GRASS) {
				grid[row][col] = TENT;
			}
		} else {
			// Grass mode: place or remove grass marker
			if (grid[row][col] === GRASS) {
				grid[row][col] = EMPTY;
			} else if (grid[row][col] === EMPTY) {
				grid[row][col] = GRASS;
			} else if (grid[row][col] === TENT) {
				grid[row][col] = GRASS;
			}
		}

		grid = [...grid]; // Trigger reactivity
		checkVictory();
	}

	function getCellClass(row: number, col: number): string {
		const classes = ['cell'];
		const cellValue = grid[row]?.[col];

		switch (cellValue) {
			case TREE:
				classes.push('tree');
				break;
			case TENT:
				classes.push('tent');
				if (isTentInvalid(row, col)) {
					classes.push('invalid');
				}
				break;
			case GRASS:
				classes.push('grass');
				break;
		}

		return classes.join(' ');
	}

	function getRowClueClass(row: number): string {
		const classes = ['clue', 'row-clue'];
		const count = countTentsInRow(row);
		if (count === rowClues[row]) {
			classes.push('correct');
		} else if (count > rowClues[row]) {
			classes.push('exceeded');
		}
		return classes.join(' ');
	}

	function getColClueClass(col: number): string {
		const classes = ['clue', 'col-clue'];
		const count = countTentsInCol(col);
		if (count === colClues[col]) {
			classes.push('correct');
		} else if (count > colClues[col]) {
			classes.push('exceeded');
		}
		return classes.join(' ');
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<div class="mode-toggle">
		<button
			class="mode-btn"
			class:active={mode === 'tent'}
			onclick={() => setMode('tent')}
		>
			<span class="tent-icon"></span> {t('mode.tent')}
		</button>
		<button
			class="mode-btn"
			class:active={mode === 'grass'}
			onclick={() => setMode('grass')}
		>
			<span class="grass-icon"></span> {t('mode.grass')}
		</button>
	</div>

	<div class="board-wrapper">
		<div class="board-container">
			<!-- Column clues -->
			<div class="col-clues">
				<div class="corner"></div>
				{#each colClues as clue, col}
					<div class={getColClueClass(col)}>{clue}</div>
				{/each}
			</div>

			<div class="grid-with-rows">
				<!-- Grid with row clues -->
				{#each { length: GRID_SIZE } as _, row}
					<div class="grid-row">
						<div class={getRowClueClass(row)}>{rowClues[row]}</div>
						{#each { length: GRID_SIZE } as _, col}
							<button
								class={getCellClass(row, col)}
								onclick={() => handleCellClick(row, col)}
								disabled={gameWon || grid[row]?.[col] === TREE}
								aria-label="Cell {row},{col}"
							>
								{#if grid[row]?.[col] === TREE}
									<span class="tree-icon"></span>
								{:else if grid[row]?.[col] === TENT}
									<span class="tent-icon"></span>
								{:else if grid[row]?.[col] === GRASS}
									<span class="grass-icon"></span>
								{/if}
							</button>
						{/each}
					</div>
				{/each}
			</div>
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

	.mode-toggle {
		display: flex;
		gap: 8px;
		margin-bottom: 20px;
	}

	.mode-btn {
		padding: 10px 18px;
		font-size: 0.9rem;
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
		gap: 6px;
	}

	.mode-btn.active {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: #fff;
		border-color: transparent;
	}

	.mode-btn:active {
		transform: scale(0.95);
	}

	.tent-icon::before {
		content: '\26FA';
	}

	.grass-icon::before {
		content: '\2715';
		font-weight: bold;
	}

	.tree-icon::before {
		content: '\1F332';
	}

	.board-wrapper {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
		overflow-x: auto;
		width: 100%;
	}

	.board-container {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.1);
		padding: 8px;
		border-radius: 12px;
	}

	.col-clues {
		display: flex;
		gap: 2px;
		margin-bottom: 2px;
	}

	.corner {
		width: 28px;
		height: 28px;
		margin-right: 2px;
	}

	.clue {
		width: 36px;
		height: 28px;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 0.85rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.8);
		transition: all 0.2s ease;
	}

	.clue.correct {
		color: #22c55e;
	}

	.clue.exceeded {
		color: #ef4444;
	}

	.grid-with-rows {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.grid-row {
		display: flex;
		gap: 2px;
	}

	.row-clue {
		width: 28px;
		margin-right: 2px;
	}

	.cell {
		width: 36px;
		height: 36px;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 1.1rem;
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

	.cell.tree {
		background: rgba(34, 197, 94, 0.3);
		cursor: default;
	}

	.cell.tent {
		background: rgba(251, 191, 36, 0.3);
	}

	.cell.tent.invalid {
		background: rgba(239, 68, 68, 0.4);
		animation: pulse-invalid 1s ease-in-out infinite;
	}

	.cell.grass {
		background: rgba(100, 116, 139, 0.3);
		color: rgba(255, 255, 255, 0.5);
	}

	@keyframes pulse-invalid {
		0%, 100% {
			background: rgba(239, 68, 68, 0.4);
		}
		50% {
			background: rgba(239, 68, 68, 0.6);
		}
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
			width: 32px;
			height: 32px;
			font-size: 1rem;
		}

		.clue {
			width: 32px;
			font-size: 0.8rem;
		}

		.corner {
			width: 24px;
		}

		.row-clue {
			width: 24px;
		}
	}
</style>
