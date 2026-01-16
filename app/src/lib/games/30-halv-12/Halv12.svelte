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
	const GAME_NUMBER = '30';
	const POINTS = 3;
	const TARGET = 11.5;

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

	// Card types
	interface Card {
		suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
		rank: string;
		value: number;
	}

	// Game state
	let deck = $state<Card[]>([]);
	let playerHand = $state<Card[]>([]);
	let dealerHand = $state<Card[]>([]);
	let dealerHidden = $state(true);
	let gamePhase = $state<'betting' | 'playing' | 'dealer' | 'ended'>('betting');
	let result = $state<'win' | 'lose' | 'push' | null>(null);
	let scores = $state({ player: 0, dealer: 0 });

	// Calculate hand value
	function calculateValue(hand: Card[]): number {
		return hand.reduce((sum, card) => sum + card.value, 0);
	}

	let playerValue = $derived(calculateValue(playerHand));
	let dealerValue = $derived(calculateValue(dealerHand));

	// Status message
	let status = $derived.by(() => {
		if (gamePhase === 'betting') return t('status.pressStart');
		if (gamePhase === 'playing') {
			if (playerValue > TARGET) return t('status.bust');
			return t('status.yourTurn');
		}
		if (gamePhase === 'dealer') return t('status.dealerTurn');
		if (result === 'win') return t('status.won');
		if (result === 'lose') return t('status.lost');
		if (result === 'push') return t('status.push');
		return '';
	});

	let statusClass = $derived.by(() => {
		if (result === 'win') return 'winner';
		if (result === 'lose') return 'loser';
		if (result === 'push') return 'draw';
		if (playerValue > TARGET) return 'loser';
		return '';
	});

	// Create and shuffle deck
	function createDeck(): Card[] {
		const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
		const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
		const cards: Card[] = [];

		for (const suit of suits) {
			for (const rank of ranks) {
				let value: number;
				if (rank === 'A') {
					value = 1; // Ace starts as 1, can be counted as 11 later
				} else if (['J', 'Q', 'K'].includes(rank)) {
					value = 0.5;
				} else {
					value = parseInt(rank);
				}
				cards.push({ suit, rank, value });
			}
		}

		// Shuffle
		for (let i = cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[cards[i], cards[j]] = [cards[j], cards[i]];
		}

		return cards;
	}

	function drawCard(): Card | undefined {
		return deck.pop();
	}

	function newGame() {
		deck = createDeck();
		playerHand = [];
		dealerHand = [];
		dealerHidden = true;
		gamePhase = 'playing';
		result = null;
		showWinModal = false;

		// Deal initial cards
		const p1 = drawCard();
		const d1 = drawCard();
		const p2 = drawCard();
		const d2 = drawCard();

		if (p1) playerHand.push(p1);
		if (d1) dealerHand.push(d1);
		if (p2) playerHand.push(p2);
		if (d2) dealerHand.push(d2);

		playerHand = [...playerHand];
		dealerHand = [...dealerHand];

		trackStart(GAME_NUMBER);

		// Check for natural 11.5
		if (playerValue === TARGET) {
			stand();
		}
	}

	function hit() {
		if (gamePhase !== 'playing') return;

		const card = drawCard();
		if (card) {
			playerHand.push(card);
			playerHand = [...playerHand];
		}

		if (playerValue > TARGET) {
			endGame('lose');
		} else if (playerValue === TARGET) {
			stand();
		}
	}

	function stand() {
		if (gamePhase !== 'playing') return;

		gamePhase = 'dealer';
		dealerHidden = false;

		// Dealer draws until 10.5 or more
		dealerPlay();
	}

	function dealerPlay() {
		setTimeout(() => {
			if (dealerValue < 10.5) {
				const card = drawCard();
				if (card) {
					dealerHand.push(card);
					dealerHand = [...dealerHand];
				}
				dealerPlay();
			} else {
				determineWinner();
			}
		}, 600);
	}

	function determineWinner() {
		if (dealerValue > TARGET) {
			endGame('win');
		} else if (playerValue > dealerValue) {
			endGame('win');
		} else if (dealerValue > playerValue) {
			endGame('lose');
		} else {
			endGame('push');
		}
	}

	function endGame(outcome: 'win' | 'lose' | 'push') {
		gamePhase = 'ended';
		result = outcome;
		dealerHidden = false;

		if (outcome === 'win') {
			scores.player++;
			scores = { ...scores };
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		} else if (outcome === 'lose') {
			scores.dealer++;
			scores = { ...scores };
		}
	}

	function getSuitSymbol(suit: Card['suit']): string {
		switch (suit) {
			case 'hearts': return '\u2665';
			case 'diamonds': return '\u2666';
			case 'clubs': return '\u2663';
			case 'spades': return '\u2660';
		}
	}

	function getSuitColor(suit: Card['suit']): string {
		return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
	}

	function formatValue(value: number): string {
		return value % 1 === 0 ? value.toString() : value.toFixed(1);
	}
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<div class="table">
		<!-- Dealer's hand -->
		<div class="hand-section">
			<div class="hand-label">
				{t('dealer')} {#if !dealerHidden}({formatValue(dealerValue)}){/if}
			</div>
			<div class="hand">
				{#each dealerHand as card, i}
					{#if i === 1 && dealerHidden}
						<div class="card hidden-card">
							<div class="card-back"></div>
						</div>
					{:else}
						<div class="card {getSuitColor(card.suit)}">
							<div class="card-rank">{card.rank}</div>
							<div class="card-suit">{getSuitSymbol(card.suit)}</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Player's hand -->
		<div class="hand-section">
			<div class="hand-label">
				{t('you')} ({formatValue(playerValue)})
			</div>
			<div class="hand">
				{#each playerHand as card}
					<div class="card {getSuitColor(card.suit)}">
						<div class="card-rank">{card.rank}</div>
						<div class="card-suit">{getSuitSymbol(card.suit)}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="score">
		<div class="score-item">
			<span class="score-label">{t('score.you')}</span>
			<span class="score-value">{scores.player}</span>
		</div>
		<div class="score-item">
			<span class="score-label">{t('score.dealer')}</span>
			<span class="score-value">{scores.dealer}</span>
		</div>
	</div>

	<div class="controls">
		{#if gamePhase === 'betting' || gamePhase === 'ended'}
			<button class="btn primary" onclick={newGame}>{t('newGame')}</button>
		{:else if gamePhase === 'playing'}
			<button class="btn hit" onclick={hit} disabled={playerValue > TARGET}>{t('hit')}</button>
			<button class="btn stand" onclick={stand}>{t('stand')}</button>
		{/if}
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

	.status.loser {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
	}

	.status.draw {
		background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
	}

	.table {
		width: 100%;
		max-width: 400px;
		background: linear-gradient(135deg, #065f46 0%, #064e3b 100%);
		border-radius: 20px;
		padding: 20px;
		margin-bottom: 20px;
		box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.hand-section {
		margin-bottom: 20px;
	}

	.hand-section:last-child {
		margin-bottom: 0;
	}

	.hand-label {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 10px;
		text-align: center;
	}

	.hand {
		display: flex;
		justify-content: center;
		gap: 8px;
		flex-wrap: wrap;
		min-height: 90px;
	}

	.card {
		width: 60px;
		height: 84px;
		background: white;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		position: relative;
	}

	.card.red {
		color: #dc2626;
	}

	.card.black {
		color: #1f2937;
	}

	.card-rank {
		font-size: 1.4rem;
		line-height: 1;
	}

	.card-suit {
		font-size: 1.6rem;
		line-height: 1;
	}

	.hidden-card {
		background: transparent;
		box-shadow: none;
	}

	.card-back {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%);
		border-radius: 8px;
		border: 3px solid white;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.score {
		display: flex;
		gap: 30px;
		margin-bottom: 20px;
	}

	.score-item {
		text-align: center;
		background: rgba(255, 255, 255, 0.05);
		padding: 10px 25px;
		border-radius: 12px;
	}

	.score-label {
		display: block;
		font-size: 0.75rem;
		color: white;
		margin-bottom: 4px;
	}

	.score-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.controls {
		display: flex;
		gap: 15px;
		margin-bottom: 20px;
	}

	.btn {
		padding: 14px 35px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
		min-width: 100px;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.btn.primary {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
	}

	.btn.hit {
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
	}

	.btn.stand {
		background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
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
		content: '\2663';
		position: absolute;
		left: 0;
		color: #10b981;
	}
</style>
