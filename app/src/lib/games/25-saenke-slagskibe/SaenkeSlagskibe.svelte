<script lang="ts">
	import type { Translations } from '$lib/i18n';
	import { trackStart, trackComplete } from '$lib/api';
	import WinModal from '$lib/components/WinModal.svelte';

	interface Props {
		translations: Translations;
	}

	let { translations }: Props = $props();

	// Game constants
	const GAME_NUMBER = '25';
	const GRID_SIZE = 10;

	// Fleet configuration: 1x4, 2x3, 3x2, 4x1 = 10 ships, 20 segments
	const FLEET = [
		{ nameKey: 'fleet.battleship', size: 4, count: 1 },
		{ nameKey: 'fleet.cruiser', size: 3, count: 2 },
		{ nameKey: 'fleet.destroyer', size: 2, count: 3 },
		{ nameKey: 'fleet.submarine', size: 1, count: 4 }
	];

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

	// Cell state interface
	interface Cell {
		isShip: boolean;
		shipId: number | null;
		revealed: boolean;
		playerMark: 'ship' | 'water' | null;
	}

	// Ship interface
	interface Ship {
		id: number;
		size: number;
		cells: [number, number][];
		horizontal: boolean;
	}

	// Game state
	let difficulty = $state<'easy' | 'medium' | 'hard'>('medium');
	let grid = $state<Cell[][]>([]);
	let playerGrid = $state<Cell[][]>([]);
	let rowClues = $state<number[]>([]);
	let colClues = $state<number[]>([]);
	let ships = $state<Ship[]>([]);
	let markMode = $state<'ship' | 'water'>('ship');
	let gameOver = $state(false);
	let showWinModal = $state(false);

	// Points based on difficulty
	let points = $derived(difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3);

	// Create empty grid
	function createEmptyGrid(): Cell[][] {
		return Array(GRID_SIZE)
			.fill(null)
			.map(() =>
				Array(GRID_SIZE)
					.fill(null)
					.map(() => ({
						isShip: false,
						shipId: null,
						revealed: false,
						playerMark: null
					}))
			);
	}

	// Check if a cell and its diagonal neighbors are free
	function canPlaceAt(row: number, col: number, currentGrid: Cell[][]): boolean {
		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				const r = row + dr;
				const c = col + dc;
				if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
					if (currentGrid[r][c].isShip) return false;
				}
			}
		}
		return true;
	}

	// Check if a ship can be placed at position
	function canPlaceShip(
		row: number,
		col: number,
		size: number,
		horizontal: boolean,
		currentGrid: Cell[][]
	): boolean {
		const cells: [number, number][] = [];
		for (let i = 0; i < size; i++) {
			const r = horizontal ? row : row + i;
			const c = horizontal ? col + i : col;

			if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
				return false;
			}
			cells.push([r, c]);
		}

		// Check each cell and its neighbors (no touching rule)
		for (const [r, c] of cells) {
			if (!canPlaceAt(r, c, currentGrid)) return false;
		}

		return true;
	}

	// Place a ship on the grid
	function placeShip(
		row: number,
		col: number,
		size: number,
		horizontal: boolean,
		shipId: number,
		currentGrid: Cell[][],
		currentShips: Ship[]
	): void {
		const cells: [number, number][] = [];
		for (let i = 0; i < size; i++) {
			const r = horizontal ? row : row + i;
			const c = horizontal ? col + i : col;
			currentGrid[r][c].isShip = true;
			currentGrid[r][c].shipId = shipId;
			cells.push([r, c]);
		}

		currentShips.push({
			id: shipId,
			size: size,
			cells: cells,
			horizontal: horizontal
		});
	}

	// Place all ships on the grid
	function placeAllShips(currentGrid: Cell[][], currentShips: Ship[]): void {
		let shipId = 0;

		for (const shipType of FLEET) {
			for (let i = 0; i < shipType.count; i++) {
				let placed = false;
				let attempts = 0;

				while (!placed && attempts < 1000) {
					const row = Math.floor(Math.random() * GRID_SIZE);
					const col = Math.floor(Math.random() * GRID_SIZE);
					const horizontal = Math.random() > 0.5;

					if (canPlaceShip(row, col, shipType.size, horizontal, currentGrid)) {
						placeShip(row, col, shipType.size, horizontal, shipId, currentGrid, currentShips);
						placed = true;
					}
					attempts++;
				}
				shipId++;
			}
		}
	}

	// Calculate row and column clues
	function calculateClues(currentGrid: Cell[][]): { rowClues: number[]; colClues: number[] } {
		const newRowClues: number[] = [];
		const newColClues: number[] = [];

		for (let i = 0; i < GRID_SIZE; i++) {
			let rowCount = 0;
			let colCount = 0;
			for (let j = 0; j < GRID_SIZE; j++) {
				if (currentGrid[i][j].isShip) rowCount++;
				if (currentGrid[j][i].isShip) colCount++;
			}
			newRowClues.push(rowCount);
			newColClues.push(colCount);
		}

		return { rowClues: newRowClues, colClues: newColClues };
	}

	// Shuffle array helper
	function shuffle<T>(array: T[]): void {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	// Reveal starting clues based on difficulty
	function revealStartingClues(solutionGrid: Cell[][], newPlayerGrid: Cell[][]): void {
		const revealCounts = {
			easy: { ships: 8, water: 12 },
			medium: { ships: 4, water: 6 },
			hard: { ships: 2, water: 2 }
		};

		const counts = revealCounts[difficulty];

		// Collect ship cells
		const shipCells: [number, number][] = [];
		for (let r = 0; r < GRID_SIZE; r++) {
			for (let c = 0; c < GRID_SIZE; c++) {
				if (solutionGrid[r][c].isShip) {
					shipCells.push([r, c]);
				}
			}
		}

		shuffle(shipCells);
		for (let i = 0; i < Math.min(counts.ships, shipCells.length); i++) {
			const [r, c] = shipCells[i];
			newPlayerGrid[r][c].revealed = true;
			newPlayerGrid[r][c].playerMark = 'ship';
			newPlayerGrid[r][c].isShip = true;
		}

		// Collect water cells
		const waterCells: [number, number][] = [];
		for (let r = 0; r < GRID_SIZE; r++) {
			for (let c = 0; c < GRID_SIZE; c++) {
				if (!solutionGrid[r][c].isShip) {
					waterCells.push([r, c]);
				}
			}
		}

		shuffle(waterCells);
		for (let i = 0; i < Math.min(counts.water, waterCells.length); i++) {
			const [r, c] = waterCells[i];
			newPlayerGrid[r][c].revealed = true;
			newPlayerGrid[r][c].playerMark = 'water';
		}
	}

	// Start a new game
	function newGame(): void {
		gameOver = false;
		showWinModal = false;

		const newGrid = createEmptyGrid();
		const newShips: Ship[] = [];
		placeAllShips(newGrid, newShips);

		const clues = calculateClues(newGrid);
		rowClues = clues.rowClues;
		colClues = clues.colClues;

		const newPlayerGrid = createEmptyGrid();
		revealStartingClues(newGrid, newPlayerGrid);

		grid = newGrid;
		playerGrid = newPlayerGrid;
		ships = newShips;

		trackStart(GAME_NUMBER);
	}

	// Set difficulty and start new game
	function setDifficulty(diff: 'easy' | 'medium' | 'hard'): void {
		difficulty = diff;
		newGame();
	}

	// Handle cell click
	function handleCellClick(row: number, col: number): void {
		if (gameOver) return;
		if (playerGrid[row][col].revealed) return;

		const cell = playerGrid[row][col];

		if (cell.playerMark === markMode) {
			// Toggle off if same mode
			cell.playerMark = null;
		} else {
			cell.playerMark = markMode;
		}

		// Trigger reactivity
		playerGrid = [...playerGrid];

		checkVictory();
	}

	// Check for victory
	function checkVictory(): void {
		for (let r = 0; r < GRID_SIZE; r++) {
			for (let c = 0; c < GRID_SIZE; c++) {
				const solution = grid[r][c].isShip;
				const playerMark = playerGrid[r][c].playerMark;

				if (solution && playerMark !== 'ship') return;
				if (!solution && playerMark === 'ship') return;
			}
		}

		// Victory!
		gameOver = true;
		trackComplete(GAME_NUMBER);

		setTimeout(() => {
			showWinModal = true;
		}, 500);
	}

	// Get ship segment type for visual rendering
	function getShipSegmentType(row: number, col: number): string | null {
		if (!grid[row][col].isShip) return null;

		const shipId = grid[row][col].shipId;
		const ship = ships.find((s) => s.id === shipId);
		if (!ship) return 'submarine';

		if (ship.size === 1) return 'submarine';

		const cellIndex = ship.cells.findIndex(([r, c]) => r === row && c === col);

		if (cellIndex === 0) {
			return ship.horizontal ? 'left' : 'top';
		} else if (cellIndex === ship.size - 1) {
			return ship.horizontal ? 'right' : 'bottom';
		} else {
			return ship.horizontal ? 'horizontal' : 'vertical';
		}
	}

	// Count ships marked in player grid by size (using flood fill)
	function floodFillShip(
		startR: number,
		startC: number,
		visited: Set<string>
	): [number, number][] {
		const cells: [number, number][] = [];
		const stack: [number, number][] = [[startR, startC]];

		while (stack.length > 0) {
			const [r, c] = stack.pop()!;
			const key = `${r},${c}`;

			if (visited.has(key)) continue;
			if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
			if (playerGrid[r][c].playerMark !== 'ship') continue;

			visited.add(key);
			cells.push([r, c]);

			// Only horizontal and vertical neighbors (ships are straight)
			stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
		}

		return cells;
	}

	// Get fleet status (placed ships by size)
	let fleetStatus = $derived.by(() => {
		const placedBySize: Record<number, number> = {};
		const visited = new Set<string>();

		for (let r = 0; r < GRID_SIZE; r++) {
			for (let c = 0; c < GRID_SIZE; c++) {
				if (playerGrid[r]?.[c]?.playerMark === 'ship' && !visited.has(`${r},${c}`)) {
					const shipCells = floodFillShip(r, c, visited);
					const size = shipCells.length;
					placedBySize[size] = (placedBySize[size] || 0) + 1;
				}
			}
		}

		return FLEET.map((shipType) => ({
			name: t(shipType.nameKey),
			size: shipType.size,
			needed: shipType.count,
			placed: placedBySize[shipType.size] || 0
		}));
	});

	// Get row completion status
	function getRowStatus(rowIndex: number): 'complete' | 'over' | '' {
		let marked = 0;
		for (let c = 0; c < GRID_SIZE; c++) {
			if (playerGrid[rowIndex]?.[c]?.playerMark === 'ship') marked++;
		}
		if (marked === rowClues[rowIndex]) return 'complete';
		if (marked > rowClues[rowIndex]) return 'over';
		return '';
	}

	// Get column completion status
	function getColStatus(colIndex: number): 'complete' | 'over' | '' {
		let marked = 0;
		for (let r = 0; r < GRID_SIZE; r++) {
			if (playerGrid[r]?.[colIndex]?.playerMark === 'ship') marked++;
		}
		if (marked === colClues[colIndex]) return 'complete';
		if (marked > colClues[colIndex]) return 'over';
		return '';
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<!-- Difficulty Selection -->
	<div class="difficulty-bar">
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

	<!-- Mark Mode Toggle -->
	<div class="mark-toggle">
		<button
			class="mark-btn"
			class:active={markMode === 'ship'}
			onclick={() => (markMode = 'ship')}
		>
			<span class="mark-icon ship-icon">&#9632;</span>
			<span>{t('markMode.ship')}</span>
		</button>
		<button
			class="mark-btn"
			class:active={markMode === 'water'}
			onclick={() => (markMode = 'water')}
		>
			<span class="mark-icon water-icon">~</span>
			<span>{t('markMode.water')}</span>
		</button>
	</div>

	<!-- Puzzle Grid -->
	<div class="grid-wrapper">
		<div class="grid">
			<!-- Corner cell -->
			<div class="clue-cell corner"></div>

			<!-- Column clues -->
			{#each colClues as clue, colIndex}
				<div class="clue-cell col-clue" class:complete={getColStatus(colIndex) === 'complete'} class:over={getColStatus(colIndex) === 'over'}>
					{clue}
				</div>
			{/each}

			<!-- Rows -->
			{#each { length: GRID_SIZE } as _, rowIndex}
				<!-- Row clue -->
				<div class="clue-cell row-clue" class:complete={getRowStatus(rowIndex) === 'complete'} class:over={getRowStatus(rowIndex) === 'over'}>
					{rowClues[rowIndex]}
				</div>

				<!-- Grid cells -->
				{#each { length: GRID_SIZE } as _, colIndex}
					{@const cell = playerGrid[rowIndex]?.[colIndex]}
					{@const segmentType = cell?.revealed && cell?.playerMark === 'ship' ? getShipSegmentType(rowIndex, colIndex) : null}
					<button
						class="cell"
						class:revealed={cell?.revealed}
						class:ship={cell?.playerMark === 'ship'}
						class:water={cell?.playerMark === 'water'}
						class:player-marked={!cell?.revealed && cell?.playerMark !== null}
						class:submarine={segmentType === 'submarine'}
						class:left={segmentType === 'left'}
						class:right={segmentType === 'right'}
						class:top={segmentType === 'top'}
						class:bottom={segmentType === 'bottom'}
						class:horizontal={segmentType === 'horizontal'}
						class:vertical={segmentType === 'vertical'}
						onclick={() => handleCellClick(rowIndex, colIndex)}
						disabled={cell?.revealed || gameOver}
						aria-label="Cell {rowIndex},{colIndex}"
					></button>
				{/each}
			{/each}
		</div>
	</div>

	<!-- Fleet Status -->
	<div class="fleet-status">
		{#each fleetStatus as ship}
			<div class="fleet-item">
				<span class="ship-icons">{'\u25A0'.repeat(ship.size)}</span>
				<span class="ship-name">{ship.name}</span>
				<span class="ship-count" class:complete={ship.placed === ship.needed}>
					{ship.placed}/{ship.needed}
				</span>
			</div>
		{/each}
	</div>

	<!-- New Game Button -->
	<div class="controls">
		<button class="btn" onclick={newGame}>{t('newGame')}</button>
	</div>

	<!-- Rules -->
	<div class="rules">
		<h3>{t('rules.title')}</h3>
		<ul>
			<li>{t('rules.goal')}</li>
			<li>{t('rules.numbers')}</li>
			<li>{t('rules.ships')}</li>
			<li>{t('rules.noTouch')}</li>
			<li>{t('rules.howTo')}</li>
			<li>{t('rules.tip')}</li>
		</ul>
	</div>
</div>

<WinModal
	isOpen={showWinModal}
	{points}
	gameNumber={GAME_NUMBER}
	onClose={() => (showWinModal = false)}
/>

<style>
	.game {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* Difficulty Bar */
	.difficulty-bar {
		display: flex;
		gap: 8px;
		margin-bottom: 15px;
	}

	.diff-btn {
		padding: 8px 16px;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.diff-btn.active {
		background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
		border-color: #8b5cf6;
		color: white;
	}

	.diff-btn:active {
		transform: scale(0.95);
	}

	/* Mark Mode Toggle */
	.mark-toggle {
		display: flex;
		gap: 10px;
		margin-bottom: 15px;
	}

	.mark-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 10px 18px;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 25px;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.mark-btn.active {
		border-color: #22c55e;
		background: rgba(34, 197, 94, 0.2);
		color: white;
	}

	.mark-btn:active {
		transform: scale(0.95);
	}

	.mark-icon {
		font-size: 1.2rem;
	}

	.ship-icon {
		color: #60a5fa;
	}

	.water-icon {
		color: #38bdf8;
	}

	/* Grid Wrapper */
	.grid-wrapper {
		width: 100%;
		max-width: 360px;
		margin-bottom: 15px;
		overflow-x: auto;
	}

	.grid {
		display: grid;
		grid-template-columns: 28px repeat(10, 1fr);
		gap: 2px;
		background: rgba(255, 255, 255, 0.05);
		padding: 8px;
		border-radius: 12px;
	}

	/* Clue Cells */
	.clue-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.8);
		min-width: 28px;
		min-height: 28px;
	}

	.clue-cell.corner {
		background: transparent;
	}

	.clue-cell.col-clue,
	.clue-cell.row-clue {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	.clue-cell.complete {
		color: #22c55e;
		background: rgba(34, 197, 94, 0.15);
	}

	.clue-cell.over {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.15);
	}

	/* Grid Cells */
	.cell {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: 'Poppins', sans-serif;
		min-width: 28px;
		min-height: 28px;
	}

	.cell:active:not(:disabled) {
		transform: scale(0.9);
	}

	.cell:disabled {
		cursor: default;
	}

	.cell.revealed {
		cursor: default;
	}

	/* Ship cells */
	.cell.ship {
		background: linear-gradient(145deg, rgba(96, 165, 250, 0.5) 0%, rgba(59, 130, 246, 0.3) 100%);
		border-color: rgba(96, 165, 250, 0.6);
	}

	.cell.ship.revealed {
		background: linear-gradient(145deg, rgba(96, 165, 250, 0.7) 0%, rgba(59, 130, 246, 0.5) 100%);
	}

	/* Ship segment shapes */
	.cell.ship.submarine::after {
		content: '';
		width: 60%;
		height: 60%;
		background: #3b82f6;
		border-radius: 50%;
	}

	.cell.ship.left::after,
	.cell.ship.right::after,
	.cell.ship.top::after,
	.cell.ship.bottom::after,
	.cell.ship.horizontal::after,
	.cell.ship.vertical::after {
		content: '';
		background: #3b82f6;
	}

	.cell.ship.left::after {
		width: 100%;
		height: 60%;
		border-radius: 50% 0 0 50%;
	}

	.cell.ship.right::after {
		width: 100%;
		height: 60%;
		border-radius: 0 50% 50% 0;
	}

	.cell.ship.top::after {
		width: 60%;
		height: 100%;
		border-radius: 50% 50% 0 0;
	}

	.cell.ship.bottom::after {
		width: 60%;
		height: 100%;
		border-radius: 0 0 50% 50%;
	}

	.cell.ship.horizontal::after {
		width: 100%;
		height: 60%;
		border-radius: 0;
	}

	.cell.ship.vertical::after {
		width: 60%;
		height: 100%;
		border-radius: 0;
	}

	/* Water cells */
	.cell.water {
		background: rgba(56, 189, 248, 0.15);
		border-color: rgba(56, 189, 248, 0.3);
	}

	.cell.water::after {
		content: '~';
		color: rgba(56, 189, 248, 0.6);
		font-size: 1rem;
	}

	.cell.water.revealed::after {
		color: rgba(56, 189, 248, 0.8);
	}

	/* Fleet Status */
	.fleet-status {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		justify-content: center;
		margin-bottom: 15px;
		width: 100%;
		max-width: 360px;
	}

	.fleet-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 20px;
		font-size: 0.8rem;
	}

	.ship-icons {
		color: #60a5fa;
		letter-spacing: 1px;
	}

	.ship-name {
		color: rgba(255, 255, 255, 0.7);
	}

	.ship-count {
		color: rgba(255, 255, 255, 0.5);
		font-weight: 600;
	}

	.ship-count.complete {
		color: #22c55e;
	}

	/* Controls */
	.controls {
		margin-bottom: 20px;
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn:active {
		transform: scale(0.95);
	}

	/* Rules */
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
		color: #8b5cf6;
	}
</style>
