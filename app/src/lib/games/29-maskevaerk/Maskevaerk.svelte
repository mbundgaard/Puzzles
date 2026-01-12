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
	const GAME_NUMBER = '29';
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

	// Get language from translations
	function getLanguage(): string {
		const title = t('recipe');
		if (title === 'Opskrift') return 'da';
		if (title === 'Recette') return 'fr';
		return 'en';
	}

	// Constants
	const COLS = 10;
	const ROWS = 6;
	const API_BASE = 'https://puzzlesapi.azurewebsites.net/api';

	// Colors
	const COLORS: Record<string, { name: string; hex: string }> = {
		L: { name: 'light', hex: '#f5e6d3' },
		M: { name: 'dark', hex: '#b35941' }
	};

	// Stitch types (K = knit, P = purl) combined with colors (L = light, M = dark)
	const STITCHES: Record<string, { type: string; color: string; nameKey: string }> = {
		KL: { type: 'K', color: 'L', nameKey: 'stitches.knitLight' },
		KM: { type: 'K', color: 'M', nameKey: 'stitches.knitDark' },
		PL: { type: 'P', color: 'L', nameKey: 'stitches.purlLight' },
		PM: { type: 'P', color: 'M', nameKey: 'stitches.purlDark' }
	};

	// Game state
	let solution = $state<string[][]>([]);
	let playerGrid = $state<(string | null)[][]>([]);
	let selectedCell = $state<{ row: number; col: number } | null>(null);
	let selectedStitch = $state<string | null>(null);
	let gameWon = $state(false);
	let isLoading = $state(false);
	let recipeText = $state('');
	let patternName = $state('');
	let message = $state<{ text: string; type: 'success' | 'error' } | null>(null);
	let cellStates = $state<Record<string, 'correct' | 'wrong'>>({});

	// Create SVG for knit stitch
	function createKnitSVG(colorHex: string): string {
		return `<svg viewBox="0 0 40 40">
			<path d="M8 12 L20 28 L32 12" stroke="${colorHex}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
		</svg>`;
	}

	// Create SVG for purl stitch
	function createPurlSVG(colorHex: string): string {
		return `<svg viewBox="0 0 40 40">
			<ellipse cx="20" cy="20" rx="14" ry="8" fill="${colorHex}" opacity="0.9"/>
		</svg>`;
	}

	// Get SVG for a stitch key
	function getStitchSVG(stitchKey: string): string {
		const stitch = STITCHES[stitchKey];
		if (!stitch) return '';
		const colorHex = COLORS[stitch.color].hex;
		return stitch.type === 'K' ? createKnitSVG(colorHex) : createPurlSVG(colorHex);
	}

	// Select a cell
	function selectCell(row: number, col: number): void {
		if (gameWon || isLoading) return;

		// If a stitch is selected, place it
		if (selectedStitch) {
			playerGrid[row][col] = selectedStitch;
			playerGrid = [...playerGrid];
			hideMessage();
		} else {
			// Toggle cell selection
			if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
				selectedCell = null;
			} else {
				selectedCell = { row, col };
			}
		}
	}

	// Select a stitch type
	function selectStitch(stitch: string): void {
		if (gameWon || isLoading) return;

		if (selectedStitch === stitch) {
			selectedStitch = null;
		} else {
			selectedStitch = stitch;
		}

		// If a cell is selected, place the stitch
		if (selectedCell && selectedStitch) {
			playerGrid[selectedCell.row][selectedCell.col] = selectedStitch;
			playerGrid = [...playerGrid];
			selectedCell = null;
			hideMessage();
		}
	}

	// Count wrong stitches
	function countWrong(): number {
		let count = 0;
		for (let row = 0; row < ROWS; row++) {
			for (let col = 0; col < COLS; col++) {
				if (playerGrid[row][col] && playerGrid[row][col] !== solution[row][col]) {
					count++;
				}
			}
		}
		return count;
	}

	// Check the solution
	function checkSolution(): void {
		if (isLoading || solution.length === 0) return;

		let allFilled = true;
		let allCorrect = true;
		const newCellStates: Record<string, 'correct' | 'wrong'> = {};

		for (let row = 0; row < ROWS; row++) {
			for (let col = 0; col < COLS; col++) {
				if (!playerGrid[row][col]) {
					allFilled = false;
				} else if (playerGrid[row][col] !== solution[row][col]) {
					allCorrect = false;
					newCellStates[`${row},${col}`] = 'wrong';
				} else {
					newCellStates[`${row},${col}`] = 'correct';
				}
			}
		}

		cellStates = newCellStates;

		if (!allFilled) {
			showMessage(t('fillAllFirst'), 'error');
			return;
		}

		if (allCorrect) {
			gameWon = true;
			showMessage(t('won'), 'success');
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		} else {
			const wrongCount = countWrong();
			showMessage(t('wrongCount').replace('{count}', String(wrongCount)), 'error');
		}
	}

	// Show/hide messages
	function showMessage(text: string, type: 'success' | 'error'): void {
		message = { text, type };
	}

	function hideMessage(): void {
		message = null;
		cellStates = {};
	}

	// Fetch pattern from AI API
	async function fetchAIPattern(): Promise<{ name: string; recipe: string; solution: string[][] }> {
		const response = await fetch(`${API_BASE}/game/29/generate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ language: getLanguage() })
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();

		// Validate response
		if (!data.name || !data.recipe || !data.solution) {
			throw new Error('Invalid response format');
		}

		if (data.solution.length !== ROWS) {
			throw new Error('Invalid row count');
		}

		for (let row = 0; row < ROWS; row++) {
			if (data.solution[row].length !== COLS) {
				throw new Error('Invalid column count');
			}
		}

		return data;
	}

	// Generate a new pattern
	async function newGame(): Promise<void> {
		if (isLoading) return;

		isLoading = true;
		recipeText = '';
		patternName = '';

		// Reset player grid
		playerGrid = [];
		for (let row = 0; row < ROWS; row++) {
			playerGrid[row] = [];
			for (let col = 0; col < COLS; col++) {
				playerGrid[row][col] = null;
			}
		}

		// Reset state
		selectedCell = null;
		selectedStitch = null;
		gameWon = false;
		solution = [];
		showWinModal = false;
		hideMessage();

		try {
			const pattern = await fetchAIPattern();

			// Set solution
			solution = pattern.solution;
			patternName = pattern.name;
			recipeText = pattern.recipe;

			// Track start
			trackStart(GAME_NUMBER);
		} catch (error) {
			console.error('Failed to fetch pattern:', error);
			recipeText = t('fetchError');
			showMessage(t('fetchError'), 'error');
		}

		isLoading = false;
	}

	// Initialize on mount
	$effect(() => {
		newGame();
	});
</script>

<div class="game">
	<div class="recipe-section">
		<div class="recipe-label">{t('recipe')}</div>
		<div class="recipe-text">
			{#if isLoading}
				<em>{t('loading')}</em>
			{:else if patternName}
				<strong>{patternName}:</strong> {recipeText}
			{:else}
				{recipeText}
			{/if}
		</div>
	</div>

	<div class="board-section">
		<div class="board-grid" style="grid-template-columns: repeat({COLS}, 1fr);">
			{#each Array(ROWS) as _, row}
				{#each Array(COLS) as _, col}
					{@const stitch = playerGrid[row]?.[col]}
					{@const cellState = cellStates[`${row},${col}`]}
					<button
						class="cell"
						class:empty={!stitch}
						class:selected={selectedCell?.row === row && selectedCell?.col === col}
						class:correct={cellState === 'correct'}
						class:wrong={cellState === 'wrong'}
						onclick={() => selectCell(row, col)}
						disabled={gameWon}
						aria-label="Cell {row},{col}"
					>
						{#if stitch}
							{@html getStitchSVG(stitch)}
						{/if}
					</button>
				{/each}
			{/each}
		</div>
	</div>

	<div class="stitch-picker">
		<div class="picker-label">{t('selectStitch')}</div>
		<div class="picker-options">
			{#each Object.entries(STITCHES) as [key, stitch]}
				<button
					class="picker-btn"
					class:selected={selectedStitch === key}
					onclick={() => selectStitch(key)}
					disabled={gameWon || isLoading}
					aria-label={t(stitch.nameKey)}
				>
					<div class="stitch-preview">
						{@html getStitchSVG(key)}
					</div>
					<div class="stitch-name">{t(stitch.nameKey)}</div>
				</button>
			{/each}
		</div>
	</div>

	<div class="actions-section">
		<button class="action-btn check-btn" onclick={checkSolution} disabled={isLoading || gameWon}>
			{t('checkPattern')}
		</button>
		<button class="action-btn new-btn" onclick={newGame} disabled={isLoading}>
			{t('newGame')}
		</button>
	</div>

	{#if message}
		<div class="message show {message.type}">
			{message.text}
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

	/* Recipe section */
	.recipe-section {
		width: 100%;
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 20px;
		border-left: 4px solid #e879a9;
	}

	.recipe-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: #e879a9;
		margin-bottom: 8px;
		font-weight: 600;
	}

	.recipe-text {
		font-size: 0.95rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.9);
	}

	.recipe-text em {
		color: rgba(255, 255, 255, 0.6);
	}

	/* Board section */
	.board-section {
		margin-bottom: 20px;
		overflow-x: auto;
		width: 100%;
	}

	.board-grid {
		display: grid;
		gap: 2px;
		justify-content: center;
		background: rgba(15, 15, 26, 0.8);
		padding: 8px;
		border-radius: 12px;
		border: 2px solid rgba(255, 255, 255, 0.1);
	}

	.cell {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.08);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		position: relative;
		padding: 0;
	}

	.cell:active:not(:disabled) {
		transform: scale(0.95);
	}

	.cell.selected {
		outline: 2px solid #e879a9;
		outline-offset: 1px;
	}

	.cell.empty {
		background: rgba(74, 74, 106, 0.3);
	}

	.cell.correct {
		background: rgba(125, 159, 133, 0.3);
	}

	.cell.wrong {
		background: rgba(193, 119, 103, 0.3);
	}

	.cell :global(svg) {
		width: 75%;
		height: 75%;
	}

	/* Stitch picker */
	.stitch-picker {
		width: 100%;
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 20px;
	}

	.picker-label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 12px;
		text-align: center;
	}

	.picker-options {
		display: flex;
		justify-content: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.picker-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 12px 16px;
		background: rgba(15, 15, 26, 0.6);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 70px;
	}

	.picker-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.picker-btn.selected {
		border-color: #e879a9;
		background: rgba(232, 121, 169, 0.15);
	}

	.picker-btn .stitch-preview {
		width: 32px;
		height: 32px;
	}

	.picker-btn .stitch-preview :global(svg) {
		width: 100%;
		height: 100%;
	}

	.picker-btn .stitch-name {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.7);
	}

	/* Actions */
	.actions-section {
		display: flex;
		gap: 12px;
		margin-bottom: 16px;
		width: 100%;
	}

	.action-btn {
		flex: 1;
		padding: 14px;
		border: none;
		border-radius: 10px;
		font-family: 'Poppins', sans-serif;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn:active:not(:disabled) {
		transform: scale(0.98);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.check-btn {
		background: linear-gradient(135deg, #e879a9, #d35d91);
		color: white;
	}

	.new-btn {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	/* Message */
	.message {
		text-align: center;
		padding: 12px;
		border-radius: 8px;
		margin-bottom: 16px;
		font-weight: 500;
		width: 100%;
	}

	.message.success {
		background: rgba(125, 159, 133, 0.2);
		color: #7d9f85;
	}

	.message.error {
		background: rgba(193, 119, 103, 0.2);
		color: #c17767;
	}

	/* Rules */
	.rules {
		width: 100%;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 15px;
		padding: 20px;
	}

	.rules h3 {
		font-size: 1rem;
		margin-bottom: 12px;
		color: rgba(255, 255, 255, 0.9);
	}

	.rules ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.rules li {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 8px;
		padding-left: 16px;
		position: relative;
	}

	.rules li::before {
		content: '\2022';
		position: absolute;
		left: 0;
		color: #e879a9;
	}

	/* Responsive */
	@media (max-width: 380px) {
		.cell {
			width: 28px;
			height: 28px;
		}
	}

	/* Landscape mode */
	@media (orientation: landscape) and (max-height: 500px) {
		.recipe-section {
			padding: 10px;
			margin-bottom: 10px;
		}

		.recipe-label {
			margin-bottom: 4px;
		}

		.recipe-text {
			font-size: 0.85rem;
		}

		.board-section {
			margin-bottom: 10px;
		}

		.stitch-picker {
			padding: 10px;
			margin-bottom: 10px;
		}

		.picker-label {
			margin-bottom: 8px;
		}

		.picker-btn {
			padding: 8px 12px;
			min-width: 60px;
		}

		.picker-btn .stitch-preview {
			width: 28px;
			height: 28px;
		}

		.actions-section {
			margin-bottom: 10px;
		}

		.action-btn {
			padding: 10px;
			font-size: 0.85rem;
		}

		.rules {
			display: none;
		}
	}
</style>
