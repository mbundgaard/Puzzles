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
	const GAME_NUMBER = '07';
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
	const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'];

	// Game state
	let cols = $state(6);
	let rows = $state(4);
	let cards = $state<string[]>([]);
	let flippedIndices = $state<number[]>([]);
	let matchedIndices = $state<Set<number>>(new Set());
	let moves = $state(0);
	let isLocked = $state(false);
	let gameOver = $state(false);

	// Derived values
	let totalPairs = $derived(Math.floor((cols * rows) / 2));
	let matchedPairs = $derived(matchedIndices.size / 2);

	function shuffle<T>(array: T[]): T[] {
		const arr = [...array];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	function newGame() {
		const numPairs = Math.floor((cols * rows) / 2);
		const selectedEmojis = shuffle([...EMOJIS]).slice(0, numPairs);
		cards = shuffle([...selectedEmojis, ...selectedEmojis]);
		flippedIndices = [];
		matchedIndices = new Set();
		moves = 0;
		isLocked = false;
		gameOver = false;
		showWinModal = false;

		// Track game start
		trackStart(GAME_NUMBER);
	}

	function handleCardClick(index: number) {
		// Ignore clicks if locked, already flipped, or already matched
		if (isLocked) return;
		if (flippedIndices.includes(index)) return;
		if (matchedIndices.has(index)) return;
		if (flippedIndices.length >= 2) return;

		// Flip the card
		flippedIndices = [...flippedIndices, index];

		// Check for match when two cards are flipped
		if (flippedIndices.length === 2) {
			moves++;
			checkMatch();
		}
	}

	function checkMatch() {
		const [first, second] = flippedIndices;

		if (cards[first] === cards[second]) {
			// Match found
			matchedIndices = new Set([...matchedIndices, first, second]);
			flippedIndices = [];

			// Check for win
			if (matchedIndices.size === cards.length) {
				gameOver = true;
				trackComplete(GAME_NUMBER);
				setTimeout(() => {
					showWinModal = true;
				}, 500);
			}
		} else {
			// No match - flip cards back after delay
			isLocked = true;
			setTimeout(() => {
				flippedIndices = [];
				isLocked = false;
			}, 1000);
		}
	}

	function setSize(newCols: number) {
		cols = newCols;
		newGame();
	}

	function isFlipped(index: number): boolean {
		return flippedIndices.includes(index) || matchedIndices.has(index);
	}

	function isMatched(index: number): boolean {
		return matchedIndices.has(index);
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="controls">
		<select
			class="size-select"
			value={cols}
			onchange={(e) => setSize(parseInt((e.target as HTMLSelectElement).value))}
		>
			<option value={4}>4 x 4 (8 {t('pairs')})</option>
			<option value={6}>6 x 4 (12 {t('pairs')})</option>
			<option value={8}>8 x 4 (16 {t('pairs')})</option>
		</select>
		<button class="btn" onclick={newGame}>{t('newGame')}</button>
	</div>

	<div class="stats">
		<div class="stat">
			<span class="label">{t('moves')}</span>
			<span class="value">{moves}</span>
		</div>
		<div class="stat">
			<span class="label">{t('found')}</span>
			<span class="value">{matchedPairs} / {totalPairs}</span>
		</div>
	</div>

	<div class="board" style="grid-template-columns: repeat({cols}, 1fr)">
		{#each cards as emoji, index}
			<button
				class="card"
				class:flipped={isFlipped(index)}
				class:matched={isMatched(index)}
				onclick={() => handleCardClick(index)}
				aria-label="Card {index + 1}"
			>
				<div class="card-inner">
					<div class="card-front">?</div>
					<div class="card-back">{emoji}</div>
				</div>
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

	.controls {
		display: flex;
		justify-content: center;
		gap: 15px;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}

	.size-select {
		padding: 10px 20px;
		font-size: 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		color: #fff;
		font-family: 'Poppins', sans-serif;
		cursor: pointer;
	}

	.size-select option {
		background: #1a1a3e;
		color: #fff;
	}

	.btn {
		padding: 10px 25px;
		font-size: 0.95rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		font-family: 'Poppins', sans-serif;
		font-weight: 600;
		transition: transform 0.2s;
	}

	.btn:active {
		transform: scale(0.95);
	}

	.stats {
		display: flex;
		justify-content: center;
		gap: 30px;
		margin-bottom: 20px;
	}

	.stat {
		text-align: center;
		background: rgba(255, 255, 255, 0.08);
		padding: 10px 25px;
		border-radius: 10px;
	}

	.stat .label {
		display: block;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
	}

	.stat .value {
		display: block;
		font-size: 1.3rem;
		font-weight: 700;
		color: #fff;
	}

	.board {
		display: grid;
		gap: 8px;
		margin-bottom: 20px;
		justify-content: center;
		width: 100%;
		max-width: 500px;
	}

	.card {
		aspect-ratio: 1;
		min-width: 44px;
		min-height: 44px;
		cursor: pointer;
		perspective: 1000px;
		background: transparent;
		border: none;
		padding: 0;
	}

	.card-inner {
		position: relative;
		width: 100%;
		height: 100%;
		transition: transform 0.4s;
		transform-style: preserve-3d;
	}

	.card.flipped .card-inner {
		transform: rotateY(180deg);
	}

	.card-front, .card-back {
		position: absolute;
		width: 100%;
		height: 100%;
		backface-visibility: hidden;
		border-radius: 10px;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 1.8rem;
	}

	.card-front {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: rgba(255, 255, 255, 0.4);
		font-size: 1.5rem;
		font-weight: 700;
	}

	.card-back {
		background: rgba(255, 255, 255, 0.15);
		transform: rotateY(180deg);
	}

	.card.matched .card-back {
		background: rgba(74, 222, 128, 0.2);
		border: 2px solid rgba(74, 222, 128, 0.5);
	}

	.card:active:not(.flipped):not(.matched) {
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
		content: '•';
		position: absolute;
		left: 0;
		color: #667eea;
	}

	@media (max-width: 400px) {
		.card {
			min-width: 40px;
			min-height: 40px;
		}

		.card-front {
			font-size: 1.2rem;
		}

		.card-back {
			font-size: 1.5rem;
		}

		.board {
			gap: 6px;
		}
	}
</style>
