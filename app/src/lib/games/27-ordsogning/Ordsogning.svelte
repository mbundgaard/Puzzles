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
	const GAME_NUMBER = '27';

	// Difficulty settings: points by difficulty
	const DIFFICULTY_CONFIG = {
		easy: { points: 1, label: 'easy' },
		medium: { points: 3, label: 'medium' },
		hard: { points: 5, label: 'hard' }
	};

	type Difficulty = 'easy' | 'medium' | 'hard';

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

	// Types
	interface WordPosition {
		word: string;
		startX: number;
		startY: number;
		endX: number;
		endY: number;
	}

	interface StartCell {
		x: number;
		y: number;
	}

	// Game state
	const gridSize = 12;
	let phase = $state<'difficulty' | 'loading' | 'game'>('difficulty');
	let difficulty = $state<Difficulty>('easy');
	let grid = $state<string[][]>([]);
	let wordPositions = $state<WordPosition[]>([]);
	let foundWords = $state<Set<string>>(new Set());
	let startCell = $state<StartCell | null>(null);
	let gameOver = $state(false);
	let gaveUp = $state(false);

	// Derived values
	let points = $derived(DIFFICULTY_CONFIG[difficulty].points);
	let wordsFound = $derived(foundWords.size);
	let wordsTotal = $derived(wordPositions.length);

	function selectDifficulty(diff: Difficulty): void {
		difficulty = diff;
		startGame();
	}

	async function startGame(): Promise<void> {
		phase = 'loading';

		try {
			const response = await fetch('https://puzzlesapi.azurewebsites.net/api/game/27/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ difficulty })
			});

			if (!response.ok) throw new Error('API error');

			const data = await response.json();

			// Store grid and word positions from API (positions are now validated by backend)
			grid = data.grid;
			wordPositions = data.words.map((w: {word: string; startX: number; startY: number; endX: number; endY: number}) => ({
				word: w.word,
				startX: w.startX,
				startY: w.startY,
				endX: w.endX,
				endY: w.endY
			}));
			foundWords = new Set();
			startCell = null;
			gameOver = false;
			gaveUp = false;

			phase = 'game';

			// Track game start
			trackStart(GAME_NUMBER);

		} catch (error) {
			console.error('Error starting game:', error);
			alert(t('error'));
			phase = 'difficulty';
		}
	}

	function handleCellClick(x: number, y: number): void {
		if (gameOver) return;

		if (startCell === null) {
			// First tap - select start
			startCell = { x, y };
		} else {
			// Second tap - check selection
			const startX = startCell.x;
			const startY = startCell.y;

			// Check if this forms a valid line
			if (isValidLine(startX, startY, x, y)) {
				checkSelection(startX, startY, x, y);
			}

			// Clear start selection
			startCell = null;
		}
	}

	function isValidLine(x1: number, y1: number, x2: number, y2: number): boolean {
		const dx = x2 - x1;
		const dy = y2 - y1;

		// Same cell
		if (dx === 0 && dy === 0) return true;

		// Horizontal (left to right only)
		if (dy === 0 && dx > 0) return true;

		// Vertical (top to bottom only)
		if (dx === 0 && dy > 0) return true;

		// Diagonal down-right or up-right (must start from left)
		if (dx > 0 && Math.abs(dx) === Math.abs(dy)) return true;

		return false;
	}

	function checkSelection(x1: number, y1: number, x2: number, y2: number): void {
		// Check if this matches any word (forward direction only)
		for (const wordPos of wordPositions) {
			if (foundWords.has(wordPos.word)) continue;

			const matchesForward =
				(x1 === wordPos.startX && y1 === wordPos.startY &&
				 x2 === wordPos.endX && y2 === wordPos.endY);

			if (matchesForward) {
				markWordFound(wordPos);
				return;
			}
		}
	}

	function markWordFound(wordPos: WordPosition): void {
		foundWords = new Set([...foundWords, wordPos.word]);

		// Check for win
		if (foundWords.size === wordPositions.length) {
			handleWin();
		}
	}

	function isCellFound(x: number, y: number): boolean {
		for (const wordPos of wordPositions) {
			if (!foundWords.has(wordPos.word)) continue;

			const dx = Math.sign(wordPos.endX - wordPos.startX);
			const dy = Math.sign(wordPos.endY - wordPos.startY);
			const length = Math.max(
				Math.abs(wordPos.endX - wordPos.startX),
				Math.abs(wordPos.endY - wordPos.startY)
			) + 1;

			for (let i = 0; i < length; i++) {
				const cx = wordPos.startX + i * dx;
				const cy = wordPos.startY + i * dy;
				if (cx === x && cy === y) {
					return true;
				}
			}
		}
		return false;
	}

	function isCellStart(x: number, y: number): boolean {
		return startCell !== null && startCell.x === x && startCell.y === y;
	}

	function handleWin(): void {
		gameOver = true;
		trackComplete(GAME_NUMBER);

		setTimeout(() => {
			showWinModal = true;
		}, 500);
	}

	function showDifficultySelect(): void {
		phase = 'difficulty';
		showWinModal = false;
	}

	function giveUp(): void {
		if (gameOver || gaveUp) return;

		// Reveal all words
		const allWords = wordPositions.map(wp => wp.word);
		foundWords = new Set(allWords);
		gameOver = true;
		gaveUp = true;
	}

	// Calculate line positions for SVG overlay
	function getFoundLines(): Array<{ x1: number; y1: number; x2: number; y2: number }> {
		const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

		for (const wordPos of wordPositions) {
			if (!foundWords.has(wordPos.word)) continue;

			// Convert grid coordinates to percentages
			const cellSize = 100 / gridSize;
			const offset = cellSize / 2;

			lines.push({
				x1: wordPos.startX * cellSize + offset,
				y1: wordPos.startY * cellSize + offset,
				x2: wordPos.endX * cellSize + offset,
				y2: wordPos.endY * cellSize + offset
			});
		}

		return lines;
	}

	let foundLines = $derived(getFoundLines());
</script>

<div class="game">
	{#if phase === 'difficulty'}
		<div class="difficulty-select">
			<p class="difficulty-label">{t('selectDifficulty')}</p>
			<div class="difficulty-buttons">
				<button
					class="difficulty-btn"
					onclick={() => selectDifficulty('easy')}
				>
					<span class="diff-name">{t('difficulty.easy')}</span>
					<span class="diff-points">{DIFFICULTY_CONFIG.easy.points} {t('points')}</span>
				</button>
				<button
					class="difficulty-btn"
					onclick={() => selectDifficulty('medium')}
				>
					<span class="diff-name">{t('difficulty.medium')}</span>
					<span class="diff-points">{DIFFICULTY_CONFIG.medium.points} {t('points')}</span>
				</button>
				<button
					class="difficulty-btn"
					onclick={() => selectDifficulty('hard')}
				>
					<span class="diff-name">{t('difficulty.hard')}</span>
					<span class="diff-points">{DIFFICULTY_CONFIG.hard.points} {t('points')}</span>
				</button>
			</div>
		</div>
	{:else if phase === 'loading'}
		<div class="loading">
			<div class="spinner"></div>
			<p>{t('loading')}</p>
		</div>
	{:else}
		<div class="status" class:winner={gameOver}>
			{gameOver ? t('won') : t('status').replace('{found}', String(wordsFound)).replace('{total}', String(wordsTotal))}
		</div>

		<div class="grid-container">
			<div class="grid">
				{#each Array(gridSize) as _, y}
					{#each Array(gridSize) as _, x}
						{@const letter = grid[y]?.[x] || ''}
						{@const isFound = isCellFound(x, y)}
						{@const isStart = isCellStart(x, y)}
						<button
							class="cell"
							class:found={isFound}
							class:start={isStart}
							onclick={() => handleCellClick(x, y)}
							disabled={gameOver}
						>
							{letter}
						</button>
					{/each}
				{/each}
			</div>
			<svg class="selection-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
				{#each foundLines as line}
					<line
						class="selection-line found"
						x1="{line.x1}%"
						y1="{line.y1}%"
						x2="{line.x2}%"
						y2="{line.y2}%"
					/>
				{/each}
			</svg>
		</div>

		<div class="word-list">
			{#each wordPositions as wordPos}
				<div
					class="word-item"
					class:found={foundWords.has(wordPos.word)}
				>
					{wordPos.word}
				</div>
			{/each}
		</div>

		<div class="button-row">
			{#if !gameOver}
				<button class="btn btn-secondary" onclick={giveUp}>{t('giveUp')}</button>
			{/if}
			<button class="btn" onclick={showDifficultySelect}>{t('newGame')}</button>
		</div>
	{/if}

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
	points={points}
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

	/* Difficulty Selection */
	.difficulty-select {
		text-align: center;
		padding: 20px 0;
		width: 100%;
	}

	.difficulty-label {
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 20px;
		font-size: 1.1rem;
	}

	.difficulty-buttons {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-width: 280px;
		margin: 0 auto;
	}

	.difficulty-btn {
		padding: 16px 24px;
		min-height: 56px;
		background: rgba(139, 92, 246, 0.2);
		border: 2px solid rgba(139, 92, 246, 0.4);
		border-radius: 12px;
		color: white;
		font-family: 'Poppins', sans-serif;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.difficulty-btn:active {
		transform: scale(0.98);
		background: rgba(139, 92, 246, 0.4);
	}

	.diff-name {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.diff-points {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.6);
	}

	/* Loading */
	.loading {
		text-align: center;
		padding: 60px 20px;
	}

	.spinner {
		width: 50px;
		height: 50px;
		border: 4px solid rgba(139, 92, 246, 0.2);
		border-top-color: #8b5cf6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 20px;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.loading p {
		color: rgba(255, 255, 255, 0.7);
		font-size: 1rem;
	}

	/* Status */
	.status {
		font-size: 0.9rem;
		font-weight: 600;
		margin-bottom: 15px;
		padding: 10px 20px;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		border-radius: 25px;
		transition: all 0.3s ease;
		text-align: center;
		color: white;
	}

	.status.winner {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		animation: celebrate 0.5s ease;
	}

	@keyframes celebrate {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	/* Grid */
	.grid-container {
		position: relative;
		width: 100%;
		max-width: 360px;
		margin-bottom: 15px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 2px;
		background: rgba(0, 0, 0, 0.3);
		padding: 4px;
		border-radius: 10px;
		aspect-ratio: 1;
	}

	.selection-overlay {
		position: absolute;
		top: 4px;
		left: 4px;
		right: 4px;
		bottom: 4px;
		pointer-events: none;
		z-index: 10;
	}

	.selection-line {
		stroke: rgba(34, 197, 94, 0.6);
		stroke-width: 2;
		stroke-linecap: round;
		fill: none;
	}

	.selection-line.found {
		stroke: rgba(34, 197, 94, 0.4);
	}

	.cell {
		background: rgba(139, 92, 246, 0.15);
		border: 1px solid rgba(139, 92, 246, 0.25);
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		cursor: pointer;
		transition: all 0.15s ease;
		user-select: none;
		-webkit-user-select: none;
		aspect-ratio: 1;
		padding: 0;
		font-family: 'Poppins', sans-serif;
	}

	.cell:active:not(:disabled) {
		transform: scale(0.9);
	}

	.cell.start {
		background: rgba(139, 92, 246, 0.6);
		border-color: #8b5cf6;
	}

	.cell.found {
		background: rgba(34, 197, 94, 0.3);
		border-color: rgba(34, 197, 94, 0.5);
		color: rgba(255, 255, 255, 0.7);
	}

	/* Word List */
	.word-list {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-bottom: 20px;
		width: 100%;
		max-width: 360px;
	}

	.word-item {
		padding: 8px 14px;
		background: rgba(100, 116, 139, 0.4);
		border: 1px solid rgba(148, 163, 184, 0.5);
		border-radius: 6px;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.8);
		transition: all 0.3s ease;
	}

	.word-item.found {
		background: rgba(34, 197, 94, 0.3);
		border-color: rgba(34, 197, 94, 0.5);
		text-decoration: line-through;
		opacity: 0.7;
	}

	/* Button */
	.button-row {
		display: flex;
		gap: 12px;
		margin-bottom: 20px;
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-secondary {
		background: rgba(100, 116, 139, 0.4);
		border: 1px solid rgba(148, 163, 184, 0.5);
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

	/* Responsive */
	@media (min-width: 500px) {
		.grid-container {
			max-width: 400px;
		}

		.cell {
			font-size: 0.9rem;
		}
	}

	/* Landscape mode */
	@media (orientation: landscape) and (max-height: 500px) {
		.status {
			margin-bottom: 10px;
			padding: 6px 15px;
			font-size: 0.8rem;
		}

		.grid-container {
			max-width: 280px;
			margin-bottom: 10px;
		}

		.word-list {
			max-width: 280px;
			margin-bottom: 10px;
		}

		.btn {
			margin-bottom: 10px;
		}

		.rules {
			display: none;
		}
	}
</style>
