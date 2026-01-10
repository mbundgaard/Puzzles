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
	const GAME_NUMBER = '10';

	// Points by difficulty
	const DIFFICULTY_POINTS = {
		easy: 1,
		medium: 3,
		hard: 5
	};

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

	// Valid Danish letters
	const DANISH_LETTERS = 'abcdefghijklmnopqrstuvwxyzæøå';

	// Category mapping from frontend values to API values
	const CATEGORY_MAP: Record<string, string> = {
		'kids-general': 'børn',
		'kids-slang': 'slang',
		'animals': 'dyr',
		'food': 'mad',
		'mixed': 'blandet'
	};

	// Game constants
	const MAX_GUESSES = 6;
	const WORD_LENGTH = 5;
	const API_BASE = 'https://puzzlesapi.azurewebsites.net/api';

	// Keyboard layout
	const KEYBOARD_ROWS = [
		['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'å'],
		['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'æ', 'ø'],
		['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'slet']
	];

	// Game state
	type Difficulty = 'easy' | 'medium' | 'hard';
	type Category = 'mixed' | 'kids-general' | 'kids-slang' | 'animals' | 'food';
	type TileState = 'empty' | 'filled' | 'correct' | 'present' | 'absent';
	type KeyState = 'unused' | 'correct' | 'present' | 'absent';

	let difficulty = $state<Difficulty>('hard');
	let category = $state<Category>('mixed');
	let targetWord = $state('');
	let currentRow = $state(0);
	let currentTile = $state(0);
	let currentGuess = $state('');
	let gameOver = $state(false);
	let winner = $state<boolean | null>(null);
	let isLoading = $state(false);
	let message = $state('');
	let messageType = $state<'error' | 'success' | ''>('');

	// Board state: array of rows, each row has tiles with letter and state
	let board = $state<{ letter: string; state: TileState }[][]>([]);

	// Keyboard state
	let keyStates = $state<Record<string, KeyState>>({});

	// Hints based on difficulty
	let hints = $state<{ pos: number; letter: string }[]>([]);

	// Derived values
	let points = $derived(DIFFICULTY_POINTS[difficulty]);

	// Status message
	let status = $derived.by(() => {
		if (message) return message;
		if (isLoading) return t('loading');
		if (winner === true) {
			const messages = [
				t('winMessages.genius'),
				t('winMessages.amazing'),
				t('winMessages.great'),
				t('winMessages.good'),
				t('winMessages.nice'),
				t('winMessages.phew')
			];
			return messages[currentRow] || t('won');
		}
		if (winner === false) {
			return t('lost').replace('{word}', targetWord.toUpperCase());
		}
		return t('status.attempts').replace('{current}', String(currentRow + 1)).replace('{max}', String(MAX_GUESSES));
	});

	let statusClass = $derived.by(() => {
		if (winner === true) return 'winner';
		if (winner === false) return 'loser';
		if (messageType === 'error') return 'error';
		return '';
	});

	// Fetch word from API
	async function fetchWord(): Promise<string | null> {
		try {
			const response = await fetch(`${API_BASE}/game/10/word`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					length: WORD_LENGTH,
					difficulty: difficulty,
					category: CATEGORY_MAP[category]
				})
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			return data.word?.toLowerCase() || null;
		} catch (error) {
			console.error('Failed to fetch word:', error);
			return null;
		}
	}

	// Initialize board
	function initBoard(): void {
		board = [];
		for (let i = 0; i < MAX_GUESSES; i++) {
			const row: { letter: string; state: TileState }[] = [];
			for (let j = 0; j < WORD_LENGTH; j++) {
				row.push({ letter: '', state: 'empty' });
			}
			board.push(row);
		}
	}

	// Update hints display based on difficulty
	function updateHints(): void {
		hints = [];
		if (difficulty === 'easy') {
			// Show positions 2 and 5
			hints = [
				{ pos: 1, letter: targetWord[1] },
				{ pos: 4, letter: targetWord[4] }
			];
		} else if (difficulty === 'medium') {
			// Show position 5
			hints = [
				{ pos: 4, letter: targetWord[4] }
			];
		}
		// Hard: no hints
	}

	async function newGame(): Promise<void> {
		if (isLoading) return;

		isLoading = true;
		message = '';
		messageType = '';
		showWinModal = false;

		const word = await fetchWord();

		if (!word) {
			message = t('fetchError');
			messageType = 'error';
			isLoading = false;
			return;
		}

		targetWord = word;
		currentRow = 0;
		currentTile = 0;
		currentGuess = '';
		gameOver = false;
		winner = null;
		keyStates = {};

		initBoard();
		updateHints();

		isLoading = false;

		// Track game start
		trackStart(GAME_NUMBER);
	}

	function handleKey(key: string): void {
		if (gameOver || isLoading) return;

		// Clear any error message when user types
		if (messageType === 'error') {
			message = '';
			messageType = '';
		}

		if (key === 'enter') {
			submitGuess();
		} else if (key === 'slet') {
			deleteLetter();
		} else if (currentTile < WORD_LENGTH && DANISH_LETTERS.includes(key)) {
			addLetter(key);
		}
	}

	function addLetter(letter: string): void {
		if (currentTile >= WORD_LENGTH) return;

		board[currentRow][currentTile] = { letter, state: 'filled' };
		currentGuess += letter;
		currentTile++;
		board = [...board]; // Trigger reactivity
	}

	function deleteLetter(): void {
		if (currentTile <= 0) return;

		currentTile--;
		board[currentRow][currentTile] = { letter: '', state: 'empty' };
		currentGuess = currentGuess.slice(0, -1);
		board = [...board]; // Trigger reactivity
	}

	function submitGuess(): void {
		if (gameOver) return;

		if (currentGuess.length !== WORD_LENGTH) {
			message = t('tooShort');
			messageType = 'error';
			return;
		}

		// Prevent multiple submissions during animation
		gameOver = true;

		const guess = currentGuess.toLowerCase();
		const target = targetWord.split('');
		const result: TileState[] = new Array(WORD_LENGTH).fill('absent');

		// First pass: find correct letters
		for (let i = 0; i < WORD_LENGTH; i++) {
			if (guess[i] === target[i]) {
				result[i] = 'correct';
				target[i] = '';
			}
		}

		// Second pass: find present letters
		for (let i = 0; i < WORD_LENGTH; i++) {
			if (result[i] !== 'correct') {
				const idx = target.indexOf(guess[i]);
				if (idx !== -1) {
					result[i] = 'present';
					target[idx] = '';
				}
			}
		}

		// Animate tiles with staggered timing
		for (let i = 0; i < WORD_LENGTH; i++) {
			setTimeout(() => {
				board[currentRow][i] = { letter: guess[i], state: result[i] };
				updateKeyState(guess[i], result[i]);
				board = [...board]; // Trigger reactivity
			}, i * 100);
		}

		// Check result after animation
		setTimeout(() => {
			if (guess === targetWord) {
				winner = true;
				trackComplete(GAME_NUMBER);
				setTimeout(() => {
					showWinModal = true;
				}, 300);
			} else if (currentRow >= MAX_GUESSES - 1) {
				winner = false;
			} else {
				// Wrong guess but game continues
				gameOver = false;
				currentRow++;
				currentTile = 0;
				currentGuess = '';
			}
		}, WORD_LENGTH * 100 + 300);
	}

	function updateKeyState(letter: string, state: TileState): void {
		const priority: Record<string, number> = { 'correct': 3, 'present': 2, 'absent': 1, 'unused': 0 };
		const currentState = keyStates[letter] || 'unused';

		if (state === 'correct' || state === 'present' || state === 'absent') {
			if (priority[state] > priority[currentState]) {
				keyStates[letter] = state as KeyState;
				keyStates = { ...keyStates }; // Trigger reactivity
			}
		}
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (gameOver || isLoading) return;

		if (e.key === 'Enter') {
			handleKey('enter');
		} else if (e.key === 'Backspace') {
			handleKey('slet');
		} else if (DANISH_LETTERS.includes(e.key.toLowerCase())) {
			handleKey(e.key.toLowerCase());
		}
	}

	function changeDifficulty(diff: Difficulty): void {
		difficulty = diff;
		newGame();
	}

	function changeCategory(cat: Category): void {
		category = cat;
		newGame();
	}

	// Initialize game
	newGame();
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<!-- Hints row -->
	<div class="hints-row">
		{#each Array(WORD_LENGTH) as _, i}
			{@const hint = hints.find(h => h.pos === i)}
			<div class="hint-letter">
				{hint ? hint.letter : ''}
			</div>
		{/each}
	</div>

	<!-- Board -->
	<div class="board">
		{#each board as row, rowIndex}
			<div class="row">
				{#each row as tile, colIndex}
					<div
						class="tile"
						class:filled={tile.state === 'filled'}
						class:correct={tile.state === 'correct'}
						class:present={tile.state === 'present'}
						class:absent={tile.state === 'absent'}
					>
						{tile.letter}
					</div>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Guess button -->
	<button
		class="guess-btn"
		onclick={() => handleKey('enter')}
		disabled={gameOver || isLoading || currentGuess.length !== WORD_LENGTH}
	>
		{t('guess')}
	</button>

	<!-- Keyboard -->
	<div class="keyboard">
		{#each KEYBOARD_ROWS as row}
			<div class="keyboard-row">
				{#each row as key}
					<button
						class="key"
						class:wide={key.length > 1}
						class:correct={keyStates[key] === 'correct'}
						class:present={keyStates[key] === 'present'}
						class:absent={keyStates[key] === 'absent'}
						data-key={key}
						onclick={() => handleKey(key)}
						disabled={isLoading}
					>
						{key === 'slet' ? '\u2190' : key}
					</button>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Controls -->
	<div class="controls">
		<select
			value={category}
			onchange={(e) => changeCategory(e.currentTarget.value as Category)}
			disabled={isLoading}
		>
			<option value="mixed">{t('categories.mixed')}</option>
			<option value="kids-general">{t('categories.kids')}</option>
			<option value="kids-slang">{t('categories.slang')}</option>
			<option value="animals">{t('categories.animals')}</option>
			<option value="food">{t('categories.food')}</option>
		</select>
		<select
			value={difficulty}
			onchange={(e) => changeDifficulty(e.currentTarget.value as Difficulty)}
			disabled={isLoading}
		>
			<option value="easy">{t('difficulty.easy')}</option>
			<option value="medium">{t('difficulty.medium')}</option>
			<option value="hard">{t('difficulty.hard')}</option>
		</select>
		<button class="btn" onclick={newGame} disabled={isLoading}>
			{t('newGame')}
		</button>
	</div>

	<!-- Rules -->
	<div class="rules">
		<h3>{t('rules.title')}</h3>
		<ul>
			<li>{t('rules.rule1')}</li>
			<li>{t('rules.rule2')}</li>
			<li>
				<span class="color-box correct"></span>
				{t('rules.rule3')}
			</li>
			<li>
				<span class="color-box present"></span>
				{t('rules.rule4')}
			</li>
			<li>
				<span class="color-box absent"></span>
				{t('rules.rule5')}
			</li>
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

	.status {
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: 10px;
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

	.status.error {
		color: #ef4444;
		animation: shake 0.3s ease;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-5px); }
		75% { transform: translateX(5px); }
	}

	.hints-row {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
		width: 100%;
		max-width: 280px;
		margin-bottom: 4px;
	}

	.hint-letter {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		font-size: 0.9rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
		height: 22px;
	}

	.board {
		display: grid;
		grid-template-rows: repeat(6, 1fr);
		gap: 4px;
		width: 100%;
		max-width: 280px;
		margin-bottom: 10px;
	}

	.row {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
	}

	.tile {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
		text-transform: uppercase;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		transition: all 0.1s ease;
	}

	.tile.filled {
		border-color: rgba(255, 255, 255, 0.4);
		animation: pop 0.1s ease;
	}

	@keyframes pop {
		50% { transform: scale(1.1); }
	}

	.tile.correct {
		background: #22c55e;
		border-color: #22c55e;
		animation: flip 0.5s ease;
	}

	.tile.present {
		background: #eab308;
		border-color: #eab308;
		animation: flip 0.5s ease;
	}

	.tile.absent {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.15);
		animation: flip 0.5s ease;
	}

	@keyframes flip {
		0% { transform: rotateX(0); }
		50% { transform: rotateX(90deg); }
		100% { transform: rotateX(0); }
	}

	.guess-btn {
		width: 100%;
		max-width: 330px;
		padding: 14px 30px;
		font-size: 1.1rem;
		font-weight: 700;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		color: white;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
		margin: 10px 0;
		-webkit-tap-highlight-color: transparent;
	}

	.guess-btn:active:not(:disabled) {
		transform: scale(0.97);
	}

	.guess-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.keyboard {
		width: 100%;
		max-width: 500px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 15px;
	}

	.keyboard-row {
		display: flex;
		justify-content: center;
		gap: 4px;
	}

	.key {
		min-width: 30px;
		height: 50px;
		padding: 0 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.15);
		border: none;
		border-radius: 6px;
		color: white;
		font-family: 'Poppins', sans-serif;
		font-size: 0.9rem;
		font-weight: 600;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.15s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.key:active:not(:disabled) {
		transform: scale(0.95);
		background: rgba(255, 255, 255, 0.25);
	}

	.key.wide {
		min-width: 55px;
		font-size: 0.75rem;
	}

	.key.correct {
		background: #22c55e;
	}

	.key.present {
		background: #eab308;
	}

	.key.absent {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.4);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		margin-bottom: 20px;
	}

	.controls select {
		padding: 12px 20px;
		font-family: 'Poppins', sans-serif;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		background: rgba(255, 255, 255, 0.15);
		color: white;
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.controls select:active {
		transform: scale(0.95);
	}

	.controls select option {
		background: #1a1a2e;
		color: white;
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.btn:active:not(:disabled) {
		transform: scale(0.95);
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
		padding: 0;
		margin: 0;
	}

	.rules li {
		padding: 6px 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.color-box {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		display: inline-block;
		flex-shrink: 0;
	}

	.color-box.correct {
		background: #22c55e;
	}

	.color-box.present {
		background: #eab308;
	}

	.color-box.absent {
		background: rgba(255, 255, 255, 0.15);
	}

	@media (min-width: 400px) {
		.tile {
			font-size: 2rem;
		}

		.key {
			min-width: 36px;
			height: 55px;
			font-size: 1rem;
		}

		.key.wide {
			min-width: 65px;
		}
	}

	/* Landscape mode */
	@media (orientation: landscape) and (max-height: 500px) {
		.status {
			margin-bottom: 5px;
			padding: 6px 15px;
			font-size: 0.8rem;
		}

		.hints-row {
			max-width: 220px;
			margin-bottom: 2px;
		}

		.hint-letter {
			height: 16px;
			font-size: 0.75rem;
		}

		.board {
			max-width: 220px;
			margin-bottom: 5px;
		}

		.tile {
			font-size: 1.2rem;
		}

		.guess-btn {
			padding: 10px 20px;
			font-size: 0.9rem;
			margin: 5px 0;
		}

		.keyboard {
			gap: 4px;
			margin-bottom: 10px;
		}

		.key {
			min-width: 26px;
			height: 40px;
			font-size: 0.75rem;
		}

		.key.wide {
			min-width: 45px;
			font-size: 0.65rem;
		}

		.controls {
			gap: 8px;
			margin-bottom: 10px;
		}

		.controls select {
			padding: 8px 12px;
			font-size: 0.85rem;
		}

		.btn {
			padding: 8px 20px;
			font-size: 0.85rem;
		}

		.rules {
			display: none;
		}
	}
</style>
