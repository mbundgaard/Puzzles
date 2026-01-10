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
	const GAME_NUMBER = '14';
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

	// Game constants
	const COLORS = ['#dc2626', '#facc15', '#16a34a', '#2563eb', '#7c3aed', '#374151'];
	const CODE_LENGTH = 4;
	const MAX_GUESSES = 10;

	// Game state
	let secretCode = $state<number[]>([]);
	let currentGuess = $state<(number | null)[]>(Array(CODE_LENGTH).fill(null));
	let currentRow = $state(0);
	let selectedColor = $state<number | null>(null);
	let gameOver = $state(false);
	let winner = $state<boolean | null>(null);
	let guessHistory = $state<{ colors: number[]; black: number; white: number }[]>([]);

	// Status message
	let status = $derived.by(() => {
		if (winner === true) {
			return t('status.won').replace('{attempts}', String(currentRow + 1));
		}
		if (winner === false) {
			return t('status.lost');
		}
		if (currentGuess.includes(null)) {
			return t('status.selectColors');
		}
		return t('status.attempts').replace('{current}', String(currentRow + 1)).replace('{max}', String(MAX_GUESSES));
	});

	let statusClass = $derived.by(() => {
		if (winner === true) return 'winner';
		if (winner === false) return 'loser';
		return '';
	});

	function newGame() {
		// Generate secret code
		secretCode = [];
		for (let i = 0; i < CODE_LENGTH; i++) {
			secretCode.push(Math.floor(Math.random() * COLORS.length));
		}

		currentGuess = Array(CODE_LENGTH).fill(null);
		currentRow = 0;
		selectedColor = null;
		gameOver = false;
		winner = null;
		guessHistory = [];
		showWinModal = false;

		// Track game start
		trackStart(GAME_NUMBER);
	}

	function selectColor(index: number) {
		selectedColor = index;
	}

	function placeColor(col: number) {
		if (gameOver || selectedColor === null) return;

		currentGuess[col] = selectedColor;
		currentGuess = [...currentGuess]; // Trigger reactivity
	}

	function clearCurrentRow() {
		if (gameOver) return;
		currentGuess = Array(CODE_LENGTH).fill(null);
	}

	function checkGuess(guess: number[]): { black: number; white: number } {
		let black = 0;
		let white = 0;

		const secretCopy = [...secretCode];
		const guessCopy = [...guess];

		// First pass: find exact matches (black)
		for (let i = 0; i < CODE_LENGTH; i++) {
			if (guessCopy[i] === secretCopy[i]) {
				black++;
				secretCopy[i] = -1;
				guessCopy[i] = -1;
			}
		}

		// Second pass: find color matches (white)
		for (let i = 0; i < CODE_LENGTH; i++) {
			if (guessCopy[i] !== -1) {
				const idx = secretCopy.indexOf(guessCopy[i]);
				if (idx !== -1) {
					white++;
					secretCopy[idx] = -1;
				}
			}
		}

		return { black, white };
	}

	function submitGuess() {
		if (gameOver) return;

		// Check if all slots are filled
		if (currentGuess.includes(null)) {
			return;
		}

		// Calculate hints
		const result = checkGuess(currentGuess as number[]);

		// Store guess
		guessHistory = [
			...guessHistory,
			{
				colors: [...currentGuess] as number[],
				black: result.black,
				white: result.white
			}
		];

		// Check for win
		if (result.black === CODE_LENGTH) {
			gameOver = true;
			winner = true;
			trackComplete(GAME_NUMBER);
			// Show win modal after a short delay
			setTimeout(() => {
				showWinModal = true;
			}, 800);
			return;
		}

		// Move to next row
		currentRow++;

		if (currentRow >= MAX_GUESSES) {
			gameOver = true;
			winner = false;
		} else {
			currentGuess = Array(CODE_LENGTH).fill(null);
		}
	}

	function getGuessData(row: number) {
		return guessHistory[row] || null;
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<!-- Color picker -->
	<div class="color-picker">
		{#each COLORS as color, index}
			<button
				class="color-btn"
				class:selected={selectedColor === index}
				style="background-color: {color}"
				onclick={() => selectColor(index)}
				aria-label="Color {index + 1}"
			></button>
		{/each}
	</div>

	<!-- Board -->
	<div class="board">
		<!-- Secret code row -->
		<div class="row secret" class:revealed={gameOver}>
			<div class="row-number">?</div>
			<div class="pegs">
				{#each Array(CODE_LENGTH) as _, i}
					<div
						class="peg-slot"
						class:hidden={!gameOver}
						class:revealed={gameOver}
						style={gameOver ? `background-color: ${COLORS[secretCode[i]]}` : ''}
					></div>
				{/each}
			</div>
			<div class="hints-spacer"></div>
		</div>

		<!-- Guess rows -->
		{#each Array(MAX_GUESSES) as _, row}
			<div
				class="row"
				class:active={row === currentRow && !gameOver}
				class:completed={row < currentRow}
			>
				<div class="row-number">{row + 1}</div>
				<div class="pegs">
					{#each Array(CODE_LENGTH) as _, col}
						{@const guessData = getGuessData(row)}
						{@const colorIndex = guessData ? guessData.colors[col] : (row === currentRow ? currentGuess[col] : null)}
						<button
							class="peg-slot"
							class:filled={colorIndex !== null}
							style={colorIndex !== null ? `background-color: ${COLORS[colorIndex]}` : ''}
							onclick={() => row === currentRow && !gameOver && placeColor(col)}
							disabled={row !== currentRow || gameOver}
							aria-label="Row {row + 1}, Slot {col + 1}"
						></button>
					{/each}
				</div>
				<div class="hints">
					{#each Array(CODE_LENGTH) as _, i}
						{@const guessData = getGuessData(row)}
						<div
							class="hint"
							class:black={guessData && i < guessData.black}
							class:white={guessData && i >= guessData.black && i < guessData.black + guessData.white}
						></div>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<!-- Controls -->
	<div class="controls">
		<button class="btn secondary" onclick={clearCurrentRow} disabled={gameOver}>
			{t('clear')}
		</button>
		<button
			class="btn"
			onclick={submitGuess}
			disabled={gameOver || currentGuess.includes(null)}
		>
			{t('guess')}
		</button>
	</div>

	<div class="controls">
		<button class="btn outline" onclick={newGame}>{t('newGame')}</button>
	</div>

	<div class="rules">
		<h3>{t('rules.title')}</h3>
		<ul>
			<li>{t('rules.rule1')}</li>
			<li>{t('rules.rule2')}</li>
			<li>
				<span class="peg-example black"></span>
				{t('rules.rule3')}
			</li>
			<li>
				<span class="peg-example white"></span>
				{t('rules.rule4')}
			</li>
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
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: 15px;
		padding: 10px 20px;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		border-radius: 25px;
		text-align: center;
		transition: all 0.3s ease;
	}

	.status.winner {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
	}

	.status.loser {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
	}

	.color-picker {
		display: flex;
		gap: 10px;
		margin-bottom: 20px;
		padding: 10px 15px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 30px;
	}

	.color-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 3px solid transparent;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.color-btn:active {
		transform: scale(0.9);
	}

	.color-btn.selected {
		border-color: white;
		transform: scale(1.15);
		box-shadow: 0 0 15px currentColor;
	}

	.board {
		width: 100%;
		max-width: 320px;
		margin-bottom: 20px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 12px;
		opacity: 0.4;
		transition: all 0.3s ease;
	}

	.row.active {
		opacity: 1;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(244, 63, 94, 0.3);
	}

	.row.completed {
		opacity: 0.7;
	}

	.row.secret {
		background: linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(244, 63, 94, 0.1) 100%);
		border: 1px solid rgba(244, 63, 94, 0.3);
		opacity: 1;
		margin-bottom: 15px;
	}

	.row.secret.revealed {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%);
		border-color: rgba(34, 197, 94, 0.3);
	}

	.row-number {
		width: 20px;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		text-align: center;
	}

	.pegs {
		display: flex;
		gap: 6px;
		flex: 1;
	}

	.peg-slot {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		border: 2px dashed rgba(255, 255, 255, 0.2);
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
		padding: 0;
	}

	.peg-slot:active:not(:disabled) {
		transform: scale(0.95);
	}

	.peg-slot:disabled {
		cursor: default;
	}

	.peg-slot.filled {
		border-style: solid;
		border-color: rgba(255, 255, 255, 0.3);
	}

	.peg-slot.hidden {
		background: rgba(244, 63, 94, 0.3);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		cursor: default;
	}

	.peg-slot.hidden::after {
		content: '?';
		color: rgba(255, 255, 255, 0.5);
	}

	.peg-slot.revealed {
		border-style: solid;
		border-color: rgba(255, 255, 255, 0.3);
	}

	.peg-slot.revealed::after {
		content: none;
	}

	.hints-spacer {
		width: 36px;
	}

	.hints {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 4px;
		width: 36px;
	}

	.hint {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.hint.black {
		background: #1f2937;
		border: 2px solid #fff;
	}

	.hint.white {
		background: #fff;
	}

	.controls {
		display: flex;
		gap: 10px;
		margin-bottom: 10px;
	}

	.btn {
		padding: 12px 25px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.btn.secondary {
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.btn.outline {
		background: transparent;
		border: 2px solid rgba(244, 63, 94, 0.5);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		display: flex;
		align-items: center;
	}

	.rules li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: #f43f5e;
	}

	.peg-example {
		display: inline-block;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		margin-right: 8px;
		flex-shrink: 0;
	}

	.peg-example.black {
		background: #1f2937;
		border: 2px solid #fff;
	}

	.peg-example.white {
		background: #fff;
	}
</style>
