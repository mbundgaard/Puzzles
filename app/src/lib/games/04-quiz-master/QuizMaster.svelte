<script lang="ts">
	import type { Translations } from '$lib/i18n';
	import { trackStart, trackComplete } from '$lib/api';
	import WinModal from '$lib/components/WinModal.svelte';
	import { onMount } from 'svelte';

	interface Props {
		translations: Translations;
	}

	let { translations }: Props = $props();

	// Constants
	const GAME_NUMBER = '04';
	const API_BASE = 'https://puzzlesapi.azurewebsites.net/api/game/04';
	const QUESTIONS_PER_LEVEL = 4;
	const TOTAL_QUESTIONS = 12;
	const LEVEL_POINTS = [2, 4, 7]; // Points for completing each level
	const TIMER_SECONDS = [15, 20, 25]; // Timer per level (easy, medium, hard)

	// Game state
	type GamePhase = 'select' | 'playing' | 'checkpoint' | 'won' | 'lost' | 'walkaway';
	let gamePhase = $state<GamePhase>('select');
	let isLoading = $state(false);
	let showWinModal = $state(false);

	// Quiz data
	let availableCategories = $state<string[]>([]);
	let selectedCategory = $state('');
	let questions = $state<Array<{question: string; options: string[]; correct: number}>>([]);
	let currentQuestionIndex = $state(0);
	let selectedAnswer = $state<number | null>(null);
	let answerRevealed = $state(false);
	let bankedPoints = $state(0); // Points that are SAFE (only when walked away)
	let checkpointValue = $state(0); // Points available to bank at checkpoint

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
	let currentLevel = $derived(Math.floor(currentQuestionIndex / QUESTIONS_PER_LEVEL));
	let questionInLevel = $derived(currentQuestionIndex % QUESTIONS_PER_LEVEL);
	let currentQuestion = $derived(questions[currentQuestionIndex]);
	let currentTimerMax = $derived(TIMER_SECONDS[currentLevel] || 15);
	let potentialPoints = $derived(LEVEL_POINTS[currentLevel] || 0);
	let isLastQuestionInLevel = $derived(questionInLevel === QUESTIONS_PER_LEVEL - 1);
	let isCheckpoint = $derived(currentQuestionIndex > 0 && currentQuestionIndex % QUESTIONS_PER_LEVEL === 0);

	// Simple hash function for seeding
	function hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
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
	function getDailyCategories(): string[] {
		const allCategories = (translations as Record<string, unknown>)['categories'] as string[];
		if (!Array.isArray(allCategories) || allCategories.length === 0) {
			return [];
		}

		// Use today's date as seed
		const today = new Date().toISOString().split('T')[0]; // "2026-01-10"
		const seed = hashString(today);
		const random = seededRandom(seed);

		// Seeded shuffle using Fisher-Yates
		const shuffled = [...allCategories];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		return shuffled.slice(0, 4);
	}

	// Initialize categories on mount
	onMount(() => {
		availableCategories = getDailyCategories();
	});

	async function startGame(category: string) {
		selectedCategory = category;
		isLoading = true;

		try {
			// Add random seed to ensure question variety
			const seed = Math.floor(Math.random() * 1000000);
			const response = await fetch(`${API_BASE}/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					language: getLanguage(),
					category: category,
					seed: seed
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
			bankedPoints = 0;
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
		timeRemaining = currentTimerMax;
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
		// Time ran out - treat as wrong answer
		answerRevealed = true;
		selectedAnswer = -1; // No selection
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

		if (nextIndex >= TOTAL_QUESTIONS) {
			// Completed all questions - winner!
			bankedPoints = LEVEL_POINTS[2]; // 7 points
			endGame(true);
		} else if (nextIndex % QUESTIONS_PER_LEVEL === 0) {
			// Completed a level - checkpoint (points not banked yet!)
			checkpointValue = LEVEL_POINTS[currentLevel];
			gamePhase = 'checkpoint';
		} else {
			// Next question
			currentQuestionIndex = nextIndex;
			selectedAnswer = null;
			answerRevealed = false;
			startTimer();
		}
	}

	function continueAfterCheckpoint() {
		currentQuestionIndex++;
		selectedAnswer = null;
		answerRevealed = false;
		gamePhase = 'playing';
		startTimer();
	}

	function walkAway() {
		// Bank the checkpoint value - this makes the points SAFE
		bankedPoints = checkpointValue;
		gamePhase = 'walkaway';
		stopTimer();
		trackComplete(GAME_NUMBER);
		setTimeout(() => {
			showWinModal = true;
		}, 800);
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
			// Lost - no points (unless they had banked earlier, but that's not possible in current flow)
			gamePhase = 'lost';
			bankedPoints = 0; // Ensure no points on loss
		}
	}

	function newGame() {
		stopTimer();
		gamePhase = 'select';
		questions = [];
		currentQuestionIndex = 0;
		selectedAnswer = null;
		answerRevealed = false;
		bankedPoints = 0;
		checkpointValue = 0;
		showWinModal = false;
		// Categories stay the same (daily categories)
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
</script>

<div class="game-container">
	{#if gamePhase === 'select'}
		<!-- Category Selection Screen -->
		<div class="select-screen">
			<h2>{t('todaysCategories')}</h2>

			<div class="category-grid">
				{#each availableCategories as category}
					<button
						class="category-btn"
						onclick={() => startGame(category)}
						disabled={isLoading}
					>
						{category}
					</button>
				{/each}
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
			<!-- Money Ladder -->
			<div class="money-ladder">
				{#each Array(TOTAL_QUESTIONS) as _, i}
					{@const qLevel = Math.floor(i / QUESTIONS_PER_LEVEL)}
					{@const isCheckpointRow = (i + 1) % QUESTIONS_PER_LEVEL === 0}
					{@const isCurrent = i === currentQuestionIndex}
					{@const isCompleted = i < currentQuestionIndex}
					<div
						class="ladder-row"
						class:checkpoint={isCheckpointRow}
						class:current={isCurrent}
						class:completed={isCompleted}
					>
						<span class="q-num">Q{i + 1}</span>
						{#if isCheckpointRow}
							<span class="points">{LEVEL_POINTS[qLevel]} pt</span>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Question Area -->
			<div class="question-area">
				<!-- Timer -->
				<div class="timer" class:warning={timeRemaining <= 5} class:critical={timeRemaining <= 3}>
					<div class="timer-bar" style="width: {(timeRemaining / currentTimerMax) * 100}%"></div>
					<span class="timer-text">{timeRemaining}s</span>
				</div>

				<!-- Question Info -->
				<div class="question-info">
					<span class="level-badge level-{currentLevel + 1}">
						{t(`levels.level${currentLevel + 1}`)}
					</span>
					<span class="question-number">
						{t('questionNumber').replace('{current}', String(currentQuestionIndex + 1)).replace('{total}', String(TOTAL_QUESTIONS))}
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

				<!-- Banked Points -->
				{#if bankedPoints > 0}
					<div class="banked-info">
						{t('banked')}: {bankedPoints} {t('points')}
					</div>
				{/if}
			</div>
		</div>

	{:else if gamePhase === 'checkpoint'}
		<!-- Checkpoint Screen -->
		<div class="checkpoint-screen">
			<div class="checkpoint-content">
				<div class="checkpoint-icon">&#10003;</div>
				<h2>{t(`levels.level${currentLevel + 1}`)} {t('checkpoint.complete')}!</h2>

				<div class="checkpoint-earned">
					<p class="earned-label">{t('checkpoint.youEarned')}</p>
					<p class="earned-points">{checkpointValue} {t('points')}</p>
				</div>

				<div class="checkpoint-choices">
					<div class="choice-card bank-card">
						<h3>{t('checkpoint.bankTitle')}</h3>
						<p class="choice-result">+{checkpointValue} {t('points')}</p>
						<p class="choice-desc">{t('checkpoint.bankDesc')}</p>
						<button class="bank-btn" onclick={walkAway}>
							{t('checkpoint.bank')}
						</button>
					</div>

					<div class="choice-card continue-card">
						<h3>{t('checkpoint.continueTitle')}</h3>
						<p class="choice-result">{t('checkpoint.chasePoints').replace('{points}', String(LEVEL_POINTS[currentLevel + 1]))}</p>
						<p class="choice-desc">{t('checkpoint.continueDesc')}</p>
						<button class="continue-btn" onclick={continueAfterCheckpoint}>
							{t('checkpoint.continue')}
						</button>
					</div>
				</div>
			</div>
		</div>

	{:else if gamePhase === 'won'}
		<!-- Won Screen -->
		<div class="result-screen won">
			<div class="result-content">
				<div class="result-icon">&#127942;</div>
				<h2>{t('won.title')}</h2>
				<p class="result-points">{bankedPoints} {t('points')}</p>
				<button class="new-game-btn" onclick={newGame}>{t('newGame')}</button>
			</div>
		</div>

	{:else if gamePhase === 'walkaway'}
		<!-- Walk Away Screen -->
		<div class="result-screen walkaway">
			<div class="result-content">
				<div class="result-icon">&#128176;</div>
				<h2>{t('walkaway.title')}</h2>
				<p class="result-points">{bankedPoints} {t('points')}</p>
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
				{#if bankedPoints > 0}
					<p class="result-points">{t('lost.youKeep')} {bankedPoints} {t('points')}</p>
				{:else}
					<p class="result-points">{t('lost.noPoints')}</p>
				{/if}
				<button class="new-game-btn" onclick={newGame}>{t('newGame')}</button>
			</div>
		</div>
	{/if}
</div>

<WinModal
	isOpen={showWinModal}
	points={bankedPoints}
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

	.category-btn:active:not(:disabled) {
		transform: scale(0.98);
	}

	.category-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.rules {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 1rem;
	}

	.rules h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		color: #ffd700;
	}

	.rules ul {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.6;
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
		gap: 1rem;
	}

	/* Money Ladder */
	.money-ladder {
		display: flex;
		flex-direction: column-reverse;
		gap: 4px;
		min-width: 80px;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
	}

	.ladder-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 8px;
		font-size: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.5);
		transition: all 0.3s ease;
	}

	.ladder-row.checkpoint {
		background: rgba(255, 215, 0, 0.1);
		border: 1px solid rgba(255, 215, 0, 0.3);
	}

	.ladder-row.current {
		background: rgba(255, 215, 0, 0.3);
		color: white;
		font-weight: bold;
		animation: pulse 1.5s ease-in-out infinite;
	}

	.ladder-row.completed {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.ladder-row .points {
		color: #ffd700;
		font-weight: bold;
	}

	@keyframes pulse {
		0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
		50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
	}

	/* Question Area */
	.question-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1rem;
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

	.level-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.level-badge.level-1 {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.level-badge.level-2 {
		background: rgba(245, 158, 11, 0.2);
		color: #f59e0b;
	}

	.level-badge.level-3 {
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

	.banked-info {
		text-align: center;
		padding: 0.5rem;
		background: rgba(34, 197, 94, 0.2);
		border-radius: 8px;
		color: #22c55e;
		font-weight: 600;
	}

	/* Checkpoint Screen */
	.checkpoint-screen {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
	}

	.checkpoint-content {
		text-align: center;
		padding: 2rem;
		background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%);
		border: 2px solid rgba(255, 215, 0, 0.3);
		border-radius: 16px;
		max-width: 400px;
	}

	.checkpoint-icon {
		font-size: 4rem;
		color: #22c55e;
		margin-bottom: 1rem;
	}

	.checkpoint-content h2 {
		color: #ffd700;
		margin: 0 0 1.5rem 0;
		font-size: 1.3rem;
	}

	.checkpoint-earned {
		background: rgba(255, 215, 0, 0.15);
		border: 2px solid rgba(255, 215, 0, 0.4);
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.earned-label {
		margin: 0 0 0.25rem 0;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.earned-points {
		margin: 0;
		font-size: 2rem;
		font-weight: bold;
		color: #ffd700;
	}

	.checkpoint-choices {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.choice-card {
		padding: 1rem;
		border-radius: 12px;
		text-align: center;
	}

	.choice-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
	}

	.choice-result {
		margin: 0 0 0.25rem 0;
		font-size: 1.2rem;
		font-weight: bold;
	}

	.choice-desc {
		margin: 0 0 1rem 0;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.bank-card {
		background: rgba(34, 197, 94, 0.15);
		border: 2px solid rgba(34, 197, 94, 0.4);
	}

	.bank-card h3 {
		color: #22c55e;
	}

	.bank-card .choice-result {
		color: #22c55e;
	}

	.bank-btn {
		padding: 0.75rem 2rem;
		font-size: 1rem;
		font-weight: bold;
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
		border: none;
		border-radius: 10px;
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.continue-card {
		background: rgba(239, 68, 68, 0.1);
		border: 2px solid rgba(239, 68, 68, 0.3);
	}

	.continue-card h3 {
		color: #f87171;
	}

	.continue-card .choice-result {
		color: #ffd700;
	}

	.continue-btn {
		padding: 0.75rem 2rem;
		font-size: 1rem;
		font-weight: bold;
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
		border: none;
		border-radius: 10px;
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
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

	.result-screen.walkaway .result-content {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%);
		border: 2px solid rgba(34, 197, 94, 0.4);
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

	.result-screen.walkaway h2 {
		color: #22c55e;
	}

	.result-screen.lost h2 {
		color: #ef4444;
	}

	.result-points {
		font-size: 1.5rem;
		font-weight: bold;
		margin: 0 0 0.5rem 0;
	}

	.result-screen.won .result-points,
	.result-screen.walkaway .result-points {
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

	.new-game-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
	}

	/* Responsive */
	@media (max-width: 500px) {
		.playing-screen {
			flex-direction: column;
		}

		.money-ladder {
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			min-width: unset;
		}

		.ladder-row {
			flex: 0 0 auto;
			padding: 4px 6px;
			font-size: 0.7rem;
		}

		.category-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
