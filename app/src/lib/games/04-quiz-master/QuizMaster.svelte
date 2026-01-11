<script lang="ts">
	import type { Translations } from '$lib/i18n';
	import { trackStart, trackComplete, getNickname } from '$lib/api';
	import WinModal from '$lib/components/WinModal.svelte';

	interface Props {
		translations: Translations;
	}

	let { translations }: Props = $props();

	// Constants
	const GAME_NUMBER = '04';
	const API_BASE = 'https://puzzlesapi.azurewebsites.net/api/game/04';
	const QUESTIONS_COUNT = 4;
	const TIMER_SECONDS = 20;

	// Difficulty settings: { apiDifficulty, points }
	const DIFFICULTY_SETTINGS = {
		easy: { apiDifficulty: 2, points: 1 },
		medium: { apiDifficulty: 3, points: 3 },
		hard: { apiDifficulty: 4, points: 5 }
	};

	// Game state
	type GamePhase = 'select' | 'playing' | 'won' | 'lost';
	type Difficulty = 'easy' | 'medium' | 'hard';
	let gamePhase = $state<GamePhase>('select');
	let isLoading = $state(false);
	let showWinModal = $state(false);

	// Selection state
	type AudienceMode = 'kids' | 'adults';
	type Category = { id: string; name: string };
	let audienceMode = $state<AudienceMode | null>(null);
	let availableCategories = $state<Category[]>([]);
	let selectedCategory = $state<Category | null>(null);
	let selectedDifficulty = $state<Difficulty | null>(null);

	// Quiz data
	let questions = $state<Array<{question: string; options: string[]; correct: number}>>([]);
	let currentQuestionIndex = $state(0);
	let selectedAnswer = $state<number | null>(null);
	let answerRevealed = $state(false);
	let earnedPoints = $state(0);

	// Timer
	let timeRemaining = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Translation helper
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
		const title = t('title');
		if (title === 'Quiz Mester') return 'da';
		if (title === 'Maître du Quiz') return 'fr';
		return 'en';
	}

	// Derived state
	let currentQuestion = $derived(questions[currentQuestionIndex]);

	// Simple hash function for seeding
	function hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return Math.abs(hash);
	}

	// Seeded random number generator
	function seededRandom(seed: number): () => number {
		return function() {
			seed = (seed * 1103515245 + 12345) & 0x7fffffff;
			return seed / 0x7fffffff;
		};
	}

	// Get today's categories (same for everyone, changes daily)
	function getDailyCategories(mode: AudienceMode): Category[] {
		const categoriesObj = (translations as Record<string, unknown>)['categories'] as Record<string, Category[]>;
		const allCategories = categoriesObj?.[mode];
		if (!Array.isArray(allCategories) || allCategories.length === 0) {
			return [];
		}

		const today = new Date().toISOString().split('T')[0];
		const seed = hashString(today + mode);
		const random = seededRandom(seed);

		const shuffled = [...allCategories];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		return shuffled.slice(0, 4);
	}

	// Select audience mode and load categories
	function selectAudience(mode: AudienceMode) {
		audienceMode = mode;
		availableCategories = getDailyCategories(mode);
	}

	// Select category
	function selectCategory(category: Category) {
		selectedCategory = category;
	}

	// Start game with selected difficulty
	async function startGame(difficulty: Difficulty) {
		if (!selectedCategory) return;

		selectedDifficulty = difficulty;
		isLoading = true;

		try {
			const nickname = getNickname();
			const settings = DIFFICULTY_SETTINGS[difficulty];

			const response = await fetch(`${API_BASE}/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					language: getLanguage(),
					categoryId: selectedCategory.id,
					category: selectedCategory.name,
					difficulty: settings.apiDifficulty,
					count: QUESTIONS_COUNT,
					nickname: nickname || undefined
				})
			});

			if (!response.ok) {
				throw new Error('Failed to generate quiz');
			}

			const data = await response.json();
			questions = data.questions;
			currentQuestionIndex = 0;
			selectedAnswer = null;
			answerRevealed = false;
			earnedPoints = settings.points;
			gamePhase = 'playing';
			trackStart(GAME_NUMBER);
			startTimer();
		} catch (error) {
			console.error('Failed to start game:', error);
			alert(t('status.error'));
		} finally {
			isLoading = false;
		}
	}

	function startTimer() {
		stopTimer();
		timeRemaining = TIMER_SECONDS;
		timerInterval = setInterval(() => {
			timeRemaining--;
			if (timeRemaining <= 0) {
				stopTimer();
				handleTimeout();
			}
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function handleTimeout() {
		answerRevealed = true;
		selectedAnswer = -1;
		setTimeout(() => {
			endGame(false);
		}, 1500);
	}

	function selectAnswer(index: number) {
		if (selectedAnswer !== null || answerRevealed) return;

		stopTimer();
		selectedAnswer = index;
		answerRevealed = true;

		const isCorrect = index === currentQuestion.correct;

		setTimeout(() => {
			if (isCorrect) {
				handleCorrectAnswer();
			} else {
				endGame(false);
			}
		}, 1500);
	}

	function handleCorrectAnswer() {
		const nextIndex = currentQuestionIndex + 1;

		if (nextIndex >= questions.length) {
			// Completed all questions - winner!
			endGame(true);
		} else {
			// Next question
			currentQuestionIndex = nextIndex;
			selectedAnswer = null;
			answerRevealed = false;
			startTimer();
		}
	}

	function endGame(won: boolean) {
		stopTimer();
		if (won) {
			gamePhase = 'won';
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		} else {
			gamePhase = 'lost';
			earnedPoints = 0;
		}
	}

	function newGame() {
		stopTimer();
		gamePhase = 'select';
		audienceMode = null;
		availableCategories = [];
		selectedCategory = null;
		selectedDifficulty = null;
		questions = [];
		currentQuestionIndex = 0;
		selectedAnswer = null;
		answerRevealed = false;
		earnedPoints = 0;
		showWinModal = false;
	}

	function goBack() {
		if (selectedCategory) {
			selectedCategory = null;
		} else if (audienceMode) {
			audienceMode = null;
			availableCategories = [];
		}
	}

	function getAnswerClass(index: number): string {
		if (!answerRevealed) {
			return selectedAnswer === index ? 'selected' : '';
		}
		if (index === currentQuestion.correct) {
			return 'correct';
		}
		if (selectedAnswer === index) {
			return 'wrong';
		}
		return 'dimmed';
	}

	function getDifficultyClass(diff: Difficulty): string {
		return diff;
	}
</script>

<div class="game-container">
	{#if gamePhase === 'select'}
		<div class="select-screen">
			{#if audienceMode === null}
				<!-- Step 1: Audience Selection -->
				<h2>{t('audience.title')}</h2>
				<div class="audience-grid">
					<button class="audience-btn kids" onclick={() => selectAudience('kids')}>
						<span class="audience-icon">&#128118;</span>
						<span class="audience-label">{t('audience.kids')}</span>
					</button>
					<button class="audience-btn adults" onclick={() => selectAudience('adults')}>
						<span class="audience-icon">&#129489;</span>
						<span class="audience-label">{t('audience.adults')}</span>
					</button>
				</div>

			{:else if selectedCategory === null}
				<!-- Step 2: Category Selection -->
				<h2>{t('todaysCategories')}</h2>
				<div class="category-grid">
					{#each availableCategories as category}
						<button class="category-btn" onclick={() => selectCategory(category)}>
							{category.name}
						</button>
					{/each}
				</div>
				<button class="back-btn" onclick={goBack}>
					&#8592; {t('audience.title')}
				</button>

			{:else}
				<!-- Step 3: Difficulty Selection -->
				<h2>{t('difficulty.title')}</h2>
				<p class="category-label">{selectedCategory.name}</p>

				<div class="difficulty-grid">
					<button class="difficulty-btn easy" onclick={() => startGame('easy')} disabled={isLoading}>
						<span class="difficulty-label">{t('difficulty.easy')}</span>
						<span class="difficulty-points">1 {t('points')}</span>
					</button>
					<button class="difficulty-btn medium" onclick={() => startGame('medium')} disabled={isLoading}>
						<span class="difficulty-label">{t('difficulty.medium')}</span>
						<span class="difficulty-points">3 {t('points')}</span>
					</button>
					<button class="difficulty-btn hard" onclick={() => startGame('hard')} disabled={isLoading}>
						<span class="difficulty-label">{t('difficulty.hard')}</span>
						<span class="difficulty-points">5 {t('points')}</span>
					</button>
				</div>

				<button class="back-btn" onclick={goBack}>
					&#8592; {t('todaysCategories')}
				</button>
			{/if}

			{#if isLoading}
				<div class="loading-overlay">
					<div class="spinner"></div>
					<p>{t('status.loading')}</p>
				</div>
			{/if}
		</div>

	{:else if gamePhase === 'playing' && currentQuestion}
		<!-- Playing Screen -->
		<div class="playing-screen">
			<!-- Progress indicator -->
			<div class="progress-bar">
				{#each Array(questions.length) as _, i}
					<div
						class="progress-dot"
						class:completed={i < currentQuestionIndex}
						class:current={i === currentQuestionIndex}
					></div>
				{/each}
			</div>

			<!-- Timer -->
			<div class="timer" class:warning={timeRemaining <= 5} class:critical={timeRemaining <= 3}>
				<div class="timer-bar" style="width: {(timeRemaining / TIMER_SECONDS) * 100}%"></div>
				<span class="timer-text">{timeRemaining}s</span>
			</div>

			<!-- Question Info -->
			<div class="question-info">
				<span class="difficulty-badge {selectedDifficulty}">
					{selectedDifficulty ? t(`difficulty.${selectedDifficulty}`) : ''}
				</span>
				<span class="question-number">
					{currentQuestionIndex + 1} / {questions.length}
				</span>
			</div>

			<!-- Question -->
			<div class="question-text">
				{currentQuestion.question}
			</div>

			<!-- Answers -->
			<div class="answers-grid">
				{#each currentQuestion.options as option, i}
					<button
						class="answer-btn {getAnswerClass(i)}"
						onclick={() => selectAnswer(i)}
						disabled={answerRevealed}
					>
						<span class="answer-letter">{String.fromCharCode(65 + i)}</span>
						<span class="answer-text">{option}</span>
					</button>
				{/each}
			</div>
		</div>

	{:else if gamePhase === 'won'}
		<!-- Won Screen -->
		<div class="result-screen won">
			<div class="result-content">
				<div class="result-icon">&#127942;</div>
				<h2>{t('won.title')}</h2>
				<p class="result-points">{earnedPoints} {t('points')}</p>
				<button class="new-game-btn" onclick={newGame}>{t('newGame')}</button>
			</div>
		</div>

	{:else if gamePhase === 'lost'}
		<!-- Lost Screen -->
		<div class="result-screen lost">
			<div class="result-content">
				<div class="result-icon">&#128532;</div>
				<h2>{t('lost.title')}</h2>
				{#if currentQuestion}
					<p class="correct-answer">{t('lost.correctWas')}: {currentQuestion.options[currentQuestion.correct]}</p>
				{/if}
				<p class="result-points">{t('lost.noPoints')}</p>
				<button class="new-game-btn" onclick={newGame}>{t('newGame')}</button>
			</div>
		</div>
	{/if}
</div>

<WinModal
	isOpen={showWinModal}
	points={earnedPoints}
	gameNumber={GAME_NUMBER}
	onClose={() => { showWinModal = false; }}
/>

<style>
	.game-container {
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
		padding: 1rem;
		min-height: 100%;
	}

	/* Select Screen */
	.select-screen {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		position: relative;
	}

	.select-screen h2 {
		text-align: center;
		font-size: 1.5rem;
		color: #ffd700;
		margin: 0;
	}

	.category-label {
		text-align: center;
		color: rgba(255, 255, 255, 0.7);
		margin: -0.5rem 0 0.5rem 0;
	}

	/* Audience Selection */
	.audience-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.audience-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		border: 2px solid rgba(255, 215, 0, 0.4);
		border-radius: 16px;
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
		min-height: 140px;
	}

	.audience-btn.kids {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%);
		border-color: rgba(34, 197, 94, 0.4);
	}

	.audience-btn.adults {
		background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%);
		border-color: rgba(99, 102, 241, 0.4);
	}

	.audience-btn:active {
		transform: scale(0.98);
	}

	.audience-icon {
		font-size: 3rem;
	}

	.audience-label {
		font-size: 1.25rem;
	}

	/* Category Selection */
	.category-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.category-btn {
		padding: 1.25rem 1rem;
		font-size: 1rem;
		font-weight: 600;
		background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%);
		border: 2px solid rgba(255, 215, 0, 0.4);
		border-radius: 12px;
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
		min-height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.category-btn:active {
		transform: scale(0.98);
	}

	/* Difficulty Selection */
	.difficulty-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.difficulty-btn {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		border: 2px solid;
		border-radius: 12px;
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.difficulty-btn.easy {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%);
		border-color: rgba(34, 197, 94, 0.4);
	}

	.difficulty-btn.medium {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%);
		border-color: rgba(245, 158, 11, 0.4);
	}

	.difficulty-btn.hard {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%);
		border-color: rgba(239, 68, 68, 0.4);
	}

	.difficulty-btn:active:not(:disabled) {
		transform: scale(0.98);
	}

	.difficulty-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.difficulty-label {
		font-size: 1.1rem;
	}

	.difficulty-points {
		color: #ffd700;
		font-size: 0.95rem;
	}

	.back-btn {
		margin-top: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 0.95rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.back-btn:active {
		background: rgba(255, 255, 255, 0.1);
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		background: rgba(15, 15, 35, 0.9);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		border-radius: 12px;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 215, 0, 0.3);
		border-top-color: #ffd700;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Playing Screen */
	.playing-screen {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Progress Bar */
	.progress-bar {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
	}

	.progress-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		transition: all 0.3s ease;
	}

	.progress-dot.completed {
		background: #22c55e;
	}

	.progress-dot.current {
		background: #ffd700;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
		50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
	}

	/* Timer */
	.timer {
		position: relative;
		height: 32px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 16px;
		overflow: hidden;
	}

	.timer-bar {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		background: linear-gradient(90deg, #22c55e 0%, #22c55e 100%);
		transition: width 1s linear;
		border-radius: 16px;
	}

	.timer.warning .timer-bar {
		background: linear-gradient(90deg, #f59e0b 0%, #f59e0b 100%);
	}

	.timer.critical .timer-bar {
		background: linear-gradient(90deg, #ef4444 0%, #ef4444 100%);
		animation: flash 0.5s ease-in-out infinite;
	}

	@keyframes flash {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.timer-text {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		color: white;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	/* Question Info */
	.question-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.difficulty-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.difficulty-badge.easy {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.difficulty-badge.medium {
		background: rgba(245, 158, 11, 0.2);
		color: #f59e0b;
	}

	.difficulty-badge.hard {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.question-number {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
	}

	/* Question Text */
	.question-text {
		font-size: 1.1rem;
		font-weight: 500;
		line-height: 1.5;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		min-height: 80px;
	}

	/* Answers Grid */
	.answers-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}

	.answer-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		font-size: 1rem;
		background: rgba(255, 255, 255, 0.08);
		border: 2px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
		text-align: left;
		min-height: 56px;
	}

	.answer-btn:disabled {
		cursor: default;
	}

	.answer-btn.selected {
		background: rgba(255, 215, 0, 0.2);
		border-color: #ffd700;
	}

	.answer-btn.correct {
		background: rgba(34, 197, 94, 0.3);
		border-color: #22c55e;
		animation: correctPulse 0.5s ease;
	}

	.answer-btn.wrong {
		background: rgba(239, 68, 68, 0.3);
		border-color: #ef4444;
		animation: wrongShake 0.5s ease;
	}

	.answer-btn.dimmed {
		opacity: 0.4;
	}

	@keyframes correctPulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.02); }
	}

	@keyframes wrongShake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-5px); }
		75% { transform: translateX(5px); }
	}

	.answer-letter {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: rgba(255, 215, 0, 0.2);
		border-radius: 8px;
		font-weight: bold;
		color: #ffd700;
		flex-shrink: 0;
	}

	.answer-text {
		flex: 1;
	}

	/* Result Screens */
	.result-screen {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
	}

	.result-content {
		text-align: center;
		padding: 2rem;
		border-radius: 16px;
		max-width: 400px;
	}

	.result-screen.won .result-content {
		background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.05) 100%);
		border: 2px solid rgba(255, 215, 0, 0.4);
	}

	.result-screen.lost .result-content {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%);
		border: 2px solid rgba(239, 68, 68, 0.3);
	}

	.result-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.result-content h2 {
		margin: 0 0 1rem 0;
	}

	.result-screen.won h2 {
		color: #ffd700;
	}

	.result-screen.lost h2 {
		color: #ef4444;
	}

	.result-points {
		font-size: 1.5rem;
		font-weight: bold;
		margin: 0 0 0.5rem 0;
	}

	.result-screen.won .result-points {
		color: #22c55e;
	}

	.correct-answer {
		color: rgba(255, 255, 255, 0.8);
		margin: 0 0 1rem 0;
	}

	.new-game-btn {
		margin-top: 1.5rem;
		padding: 1rem 2rem;
		font-size: 1.1rem;
		font-weight: bold;
		background: linear-gradient(135deg, #ffd700 0%, #f59e0b 100%);
		border: none;
		border-radius: 12px;
		color: #000;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.new-game-btn:active {
		transform: scale(0.98);
	}

	/* Responsive */
	@media (max-width: 500px) {
		.category-grid {
			grid-template-columns: 1fr;
		}

		.audience-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
