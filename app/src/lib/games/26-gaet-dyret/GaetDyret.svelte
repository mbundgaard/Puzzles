<script lang="ts">
	import type { Translations } from '$lib/i18n';
	import { trackStart, trackComplete } from '$lib/api';
	import WinModal from '$lib/components/WinModal.svelte';

	interface Props {
		translations: Translations;
	}

	let { translations }: Props = $props();

	// Constants
	const GAME_NUMBER = '26';
	const API_BASE = 'https://puzzlesapi.azurewebsites.net/api/game/26';
	const MAX_GUESSES = 20;
	const HINT_COST = 5;

	// Difficulty configuration
	const DIFFICULTY_CONFIG = {
		easy: {
			maxPoints: 2,
			intervals: [
				{ max: 10, points: 2 },
				{ max: 20, points: 1 }
			]
		},
		medium: {
			maxPoints: 3,
			intervals: [
				{ max: 6, points: 3 },
				{ max: 13, points: 2 },
				{ max: 20, points: 1 }
			]
		},
		hard: {
			maxPoints: 5,
			intervals: [
				{ max: 4, points: 5 },
				{ max: 8, points: 4 },
				{ max: 12, points: 3 },
				{ max: 16, points: 2 },
				{ max: 20, points: 1 }
			]
		}
	};

	// Categories with their colors
	const CATEGORIES = [
		{ key: 'marine', apiValue: 'havdyr', color: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
		{ key: 'birds', apiValue: 'fugle', color: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
		{ key: 'mammals', apiValue: 'pattedyr', color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
		{ key: 'farm', apiValue: 'bondegaardsdyr', color: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
		{ key: 'wild', apiValue: 'vilde dyr', color: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
		{ key: 'danish', apiValue: 'danske dyr', color: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }
	];

	// Game state
	let gamePhase = $state<'select' | 'playing' | 'won' | 'lost'>('select');
	let selectedDifficulty = $state<'easy' | 'medium' | 'hard'>('hard');
	let selectedCategory = $state<string | null>(null);
	let animal = $state<string>('');
	let guessCount = $state(0);
	let inputValue = $state('');
	let isLoading = $state(false);
	let lastResult = $state<{ type: 'question' | 'guess'; text: string; answer: string } | null>(null);
	let hints = $state<string[]>([]);
	let showWinModal = $state(false);

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

	// Derived values
	let currentPoints = $derived.by(() => {
		const config = DIFFICULTY_CONFIG[selectedDifficulty];
		for (const interval of config.intervals) {
			if (guessCount <= interval.max) {
				return interval.points;
			}
		}
		return 1;
	});

	let canGetHint = $derived(MAX_GUESSES - guessCount > HINT_COST && !isLoading);

	let hintButtonText = $derived.by(() => {
		if (MAX_GUESSES - guessCount <= HINT_COST) {
			return t('hintBtnNotEnough');
		}
		return t('hintBtn');
	});

	// Start game with selected category
	async function startGame(categoryKey: string) {
		const category = CATEGORIES.find(c => c.key === categoryKey);
		if (!category) return;

		selectedCategory = categoryKey;
		isLoading = true;

		try {
			const response = await fetch(`${API_BASE}/pick`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					category: category.apiValue,
					difficulty: selectedDifficulty
				})
			});

			if (!response.ok) throw new Error('Failed to pick animal');

			const data = await response.json();
			animal = data.animal.toLowerCase();
			guessCount = 0;
			lastResult = null;
			hints = [];
			gamePhase = 'playing';

			trackStart(GAME_NUMBER);
		} catch (error) {
			console.error('Error starting game:', error);
			alert(t('status.error'));
			gamePhase = 'select';
		} finally {
			isLoading = false;
		}
	}

	// Ask a question
	async function askQuestion() {
		const question = inputValue.trim();
		if (!question || isLoading || guessCount >= MAX_GUESSES) return;

		isLoading = true;
		guessCount++;

		try {
			const response = await fetch(`${API_BASE}/ask`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ animal, question })
			});

			if (!response.ok) throw new Error('Failed to ask question');

			const data = await response.json();

			// Map answer to translated version
			let answerKey = data.answer.toLowerCase();
			if (answerKey === 'ja') answerKey = 'yes';
			else if (answerKey === 'nej') answerKey = 'no';
			else if (answerKey === 'maaske' || answerKey === 'maske') answerKey = 'maybe';

			lastResult = {
				type: 'question',
				text: question,
				answer: t(`answers.${answerKey}`) || data.answer
			};

			inputValue = '';

			if (guessCount >= MAX_GUESSES) {
				gamePhase = 'lost';
			}
		} catch (error) {
			console.error('Error asking question:', error);
			guessCount--;
		} finally {
			isLoading = false;
		}
	}

	// Make a guess
	function makeGuess() {
		const guess = inputValue.trim().toLowerCase();
		if (!guess || isLoading || guessCount >= MAX_GUESSES) return;

		guessCount++;
		const isCorrect = checkGuess(guess);

		lastResult = {
			type: 'guess',
			text: guess,
			answer: isCorrect ? t('answers.correct') : t('answers.wrong')
		};

		inputValue = '';

		if (isCorrect) {
			gamePhase = 'won';
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		} else if (guessCount >= MAX_GUESSES) {
			gamePhase = 'lost';
		}
	}

	// Check if guess is correct
	function checkGuess(guess: string): boolean {
		const normalizedGuess = normalizeString(guess);
		const normalizedAnimal = normalizeString(animal);

		if (normalizedGuess === normalizedAnimal) return true;

		if (normalizedGuess.includes(normalizedAnimal) || normalizedAnimal.includes(normalizedGuess)) {
			const shorter = normalizedGuess.length < normalizedAnimal.length ? normalizedGuess : normalizedAnimal;
			if (shorter.length >= 3) return true;
		}

		return false;
	}

	// Normalize string for comparison
	function normalizeString(str: string): string {
		return str.toLowerCase().replace(/^(en |et |the |a )/, '').trim();
	}

	// Get hint
	async function getHint() {
		if (!canGetHint) return;

		isLoading = true;
		guessCount += HINT_COST;

		try {
			const response = await fetch(`${API_BASE}/hint`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					animal,
					previousHints: hints
				})
			});

			if (!response.ok) throw new Error('Failed to get hint');

			const data = await response.json();
			hints = [...hints, data.hint];

			if (guessCount >= MAX_GUESSES) {
				gamePhase = 'lost';
			}
		} catch (error) {
			console.error('Error getting hint:', error);
			guessCount -= HINT_COST;
		} finally {
			isLoading = false;
		}
	}

	// Reset to category selection
	function newGame() {
		gamePhase = 'select';
		selectedCategory = null;
		animal = '';
		guessCount = 0;
		inputValue = '';
		lastResult = null;
		hints = [];
		showWinModal = false;
	}

	// Handle form submit
	function handleSubmit(e: Event) {
		e.preventDefault();
	}

	// Capitalize first letter
	function capitalizeFirst(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
</script>

<div class="game">
	{#if gamePhase === 'select'}
		<!-- Category Selection Screen -->
		<div class="start-screen">
			<h2>{t('selectCategory')}</h2>

			<div class="category-buttons">
				{#each CATEGORIES as category}
					<button
						class="category-btn"
						style="background: {category.color}"
						onclick={() => startGame(category.key)}
						disabled={isLoading}
					>
						{t(`categories.${category.key}`)}
					</button>
				{/each}
			</div>

			<div class="difficulty-select">
				<label for="difficulty">{t('difficulty')}:</label>
				<select id="difficulty" bind:value={selectedDifficulty}>
					<option value="easy">{t('difficulties.easy')} ({t('difficultyPoints.easy')})</option>
					<option value="medium">{t('difficulties.medium')} ({t('difficultyPoints.medium')})</option>
					<option value="hard">{t('difficulties.hard')} ({t('difficultyPoints.hard')})</option>
				</select>
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
	{:else}
		<!-- Game Screen -->
		<div class="game-screen" class:loading={isLoading}>
			<div class="game-header">
				<span class="category-label">{selectedCategory ? t(`categories.${selectedCategory}`) : ''}</span>
				<div class="game-stats">
					<span class="points-indicator">{t('points').replace('{points}', String(currentPoints))}</span>
					<span class="guess-counter">{guessCount}/{MAX_GUESSES}</span>
				</div>
			</div>

			<!-- Answer History (last result only) -->
			{#if lastResult}
				<div class="answer-history">
					<div class="history-item" class:guess={lastResult.type === 'guess'}>
						<span class="history-question">
							{#if lastResult.type === 'guess'}{t('guessPrefix')}{/if}{lastResult.text}
						</span>
						<span class="history-answer {lastResult.answer.toLowerCase().replace('!', '').replace(' ', '-')}">{lastResult.answer}</span>
					</div>
				</div>
			{/if}

			<!-- Hints Section -->
			{#if hints.length > 0}
				<div class="hints-section has-hints">
					{#each hints as hint}
						<div class="hint-item">
							<span class="hint-icon">*</span>
							<span>{hint}</span>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Input Section -->
			{#if gamePhase === 'playing'}
				<div class="input-section">
					<form onsubmit={handleSubmit}>
						<div class="input-row">
							<input
								type="text"
								bind:value={inputValue}
								placeholder={t('inputPlaceholder')}
								autocomplete="off"
								disabled={isLoading}
							/>
						</div>
						<div class="button-row">
							<button
								type="button"
								class="action-btn"
								onclick={askQuestion}
								disabled={isLoading || !inputValue.trim()}
							>
								{t('askBtn')}
							</button>
							<button
								type="button"
								class="action-btn guess"
								onclick={makeGuess}
								disabled={isLoading || !inputValue.trim()}
							>
								{t('guessBtn')}
							</button>
						</div>
					</form>
					<button
						class="hint-btn"
						onclick={getHint}
						disabled={!canGetHint}
					>
						<span class="hint-icon">*</span>
						<span class="hint-text">{hintButtonText}</span>
					</button>
				</div>
			{/if}

			<!-- Lost Overlay -->
			{#if gamePhase === 'lost'}
				<div class="lose-overlay">
					<div class="overlay-content">
						<h2>{t('loseTitle')}</h2>
						<p>{t('loseAnimalWas')} <strong>{capitalizeFirst(animal)}</strong></p>
						<button class="btn" onclick={newGame}>{t('playAgain')}</button>
					</div>
				</div>
			{/if}

			<!-- New Game Button -->
			<div class="controls">
				<button class="btn outline" onclick={newGame}>{t('newGame')}</button>
			</div>
		</div>
	{/if}
</div>

<WinModal
	isOpen={showWinModal}
	points={currentPoints}
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

	/* Start Screen */
	.start-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
		width: 100%;
	}

	.start-screen h2 {
		color: #fff;
		font-size: 1.3rem;
		font-weight: 600;
	}

	.category-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		width: 100%;
	}

	.category-btn {
		padding: 15px 20px;
		font-size: 0.95rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		color: white;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.category-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.category-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.difficulty-select {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
	}

	.difficulty-select label {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.difficulty-select select {
		flex: 1;
		padding: 10px 14px;
		font-size: 0.95rem;
		font-family: 'Poppins', sans-serif;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		color: white;
		cursor: pointer;
		outline: none;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 12px center;
		padding-right: 36px;
	}

	.difficulty-select select:focus {
		border-color: rgba(245, 158, 11, 0.5);
	}

	.difficulty-select select option {
		background: #1e1e3f;
		color: white;
	}

	/* Rules */
	.rules {
		background: rgba(255, 255, 255, 0.05);
		padding: 15px 20px;
		border-radius: 12px;
		width: 100%;
	}

	.rules h3 {
		color: #f59e0b;
		margin-bottom: 10px;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.rules ul {
		list-style: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
	}

	.rules li {
		padding: 4px 0;
		padding-left: 20px;
		position: relative;
	}

	.rules li::before {
		content: '\2022';
		position: absolute;
		left: 5px;
		color: #f59e0b;
	}

	/* Game Screen */
	.game-screen {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.game-screen.loading {
		opacity: 0.7;
		pointer-events: none;
	}

	.game-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 15px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
	}

	.category-label {
		font-weight: 600;
		color: #f59e0b;
	}

	.game-stats {
		display: flex;
		gap: 15px;
		align-items: center;
	}

	.points-indicator {
		padding: 4px 12px;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.guess-counter {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
	}

	/* Answer History */
	.answer-history {
		min-height: 60px;
	}

	.history-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		gap: 10px;
	}

	.history-item.guess {
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.history-question {
		flex: 1;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.95rem;
	}

	.history-answer {
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.history-answer.ja,
	.history-answer.yes,
	.history-answer.oui {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
	}

	.history-answer.nej,
	.history-answer.no,
	.history-answer.non {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
	}

	.history-answer.maaske,
	.history-answer.maybe,
	.history-answer.peut-etre {
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
	}

	.history-answer.rigtigt,
	.history-answer.correct {
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
	}

	.history-answer.forkert,
	.history-answer.wrong,
	.history-answer.faux {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
	}

	/* Hints Section */
	.hints-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.hints-section.has-hints {
		padding: 12px;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 12px;
	}

	.hint-item {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 8px 12px;
		background: rgba(245, 158, 11, 0.1);
		border-radius: 8px;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.hint-item .hint-icon {
		color: #f59e0b;
		font-size: 1.2rem;
	}

	/* Input Section */
	.input-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.input-row {
		width: 100%;
	}

	.input-row input {
		width: 100%;
		padding: 14px 18px;
		font-size: 1rem;
		font-family: 'Poppins', sans-serif;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		color: white;
		outline: none;
		transition: border-color 0.2s ease;
	}

	.input-row input:focus {
		border-color: rgba(245, 158, 11, 0.5);
	}

	.input-row input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.input-row input:disabled {
		opacity: 0.6;
	}

	.button-row {
		display: flex;
		gap: 10px;
	}

	.action-btn {
		flex: 1;
		padding: 14px 20px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: rgba(128, 128, 128, 0.3);
		color: white;
		border: none;
		border-radius: 12px;
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

	.action-btn.guess {
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
	}

	.hint-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 20px;
		font-size: 0.9rem;
		font-weight: 500;
		font-family: 'Poppins', sans-serif;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.hint-btn:active:not(:disabled) {
		transform: scale(0.98);
	}

	.hint-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.hint-btn .hint-icon {
		color: #f59e0b;
		font-size: 1.1rem;
	}

	/* Lose Overlay */
	.lose-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.overlay-content {
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
		backdrop-filter: blur(20px);
		padding: 30px 40px;
		border-radius: 20px;
		text-align: center;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.overlay-content h2 {
		font-size: 1.5rem;
		margin-bottom: 15px;
		color: #ef4444;
	}

	.overlay-content p {
		font-size: 1.1rem;
		margin-bottom: 20px;
		color: rgba(255, 255, 255, 0.8);
	}

	.overlay-content strong {
		color: #f59e0b;
	}

	/* Controls */
	.controls {
		display: flex;
		justify-content: center;
		margin-top: 10px;
	}

	.btn {
		padding: 12px 25px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.btn.outline {
		background: transparent;
		border: 2px solid rgba(245, 158, 11, 0.5);
	}

	/* Responsive */
	@media (max-width: 400px) {
		.category-buttons {
			gap: 8px;
		}

		.category-btn {
			padding: 12px 15px;
			font-size: 0.85rem;
		}

		.button-row {
			flex-direction: column;
		}
	}
</style>
