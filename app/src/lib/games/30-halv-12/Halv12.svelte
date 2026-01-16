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
	const TARGET = 21;
	const NUM_DECKS = 6;

	// Betting state
	let currentBet = $state(0);
	let winPoints = $state(0);

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
		value: number; // Base value (Ace = 1, face = 10)
	}

	// Game state
	let deck = $state<Card[]>([]);
	let playerHand = $state<Card[]>([]);
	let dealerHand = $state<Card[]>([]);
	let dealerHidden = $state(true);
	let gamePhase = $state<'betting' | 'playing' | 'dealer' | 'ended'>('betting');
	let result = $state<'win' | 'lose' | 'push' | null>(null);
	let scores = $state({ player: 0, dealer: 0 });

	// Calculate hand value with Ace handling (Ace can be 1 or 11)
	function calculateValue(hand: Card[]): number {
		let sum = 0;
		let aces = 0;

		for (const card of hand) {
			if (card.rank === 'A') {
				aces++;
				sum += 11; // Count Ace as 11 initially
			} else {
				sum += card.value;
			}
		}

		// Convert Aces from 11 to 1 if needed to avoid bust
		while (sum > TARGET && aces > 0) {
			sum -= 10;
			aces--;
		}

		return sum;
	}

	let playerValue = $derived(calculateValue(playerHand));
	let dealerValue = $derived(calculateValue(dealerHand));
	let dealerVisibleValue = $derived(dealerHidden && dealerHand.length > 0
		? calculateValue([dealerHand[0]])
		: dealerValue);

	// Status message
	let status = $derived.by(() => {
		if (gamePhase === 'betting') return t('status.placeBet');
		if (gamePhase === 'playing') {
			if (playerValue > TARGET) return t('status.bust');
			if (playerValue === TARGET) return t('status.blackjack');
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

	// Create and shuffle multiple decks
	function createDeck(): Card[] {
		const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
		const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
		const cards: Card[] = [];

		// Create multiple decks
		for (let d = 0; d < NUM_DECKS; d++) {
			for (const suit of suits) {
				for (const rank of ranks) {
					let value: number;
					if (rank === 'A') {
						value = 1; // Base value, actual calculation handles 1 or 11
					} else if (['J', 'Q', 'K'].includes(rank)) {
						value = 10;
					} else {
						value = parseInt(rank);
					}
					cards.push({ suit, rank, value });
				}
			}
		}

		// Shuffle thoroughly (multiple passes for 6 decks)
		for (let pass = 0; pass < 3; pass++) {
			for (let i = cards.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[cards[i], cards[j]] = [cards[j], cards[i]];
			}
		}

		return cards;
	}

	function drawCard(): Card | undefined {
		// Reshuffle if deck is getting low
		if (deck.length < 52) {
			deck = createDeck();
		}
		return deck.pop();
	}

	function placeBet(amount: number) {
		currentBet = amount;
		startGame();
	}

	function startGame() {
		if (deck.length < 52) {
			deck = createDeck();
		}
		playerHand = [];
		dealerHand = [];
		dealerHidden = true;
		gamePhase = 'playing';
		result = null;
		showWinModal = false;
		winPoints = 0;

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

		// Check for blackjack (natural 21)
		const dealerHasBlackjack = dealerHand.length === 2 && calculateValue(dealerHand) === 21;
		const playerHasBlackjack = playerHand.length === 2 && playerValue === 21;

		if (dealerHasBlackjack && playerHasBlackjack) {
			// Both have blackjack - push
			dealerHidden = false;
			endGame('push');
		} else if (dealerHasBlackjack) {
			dealerHidden = false;
			endGame('lose');
		} else if (playerHasBlackjack) {
			// Player blackjack wins
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
			// Auto-stand on 21
			stand();
		}
	}

	function stand() {
		if (gamePhase !== 'playing') return;

		gamePhase = 'dealer';
		dealerHidden = false;

		// Dealer plays
		dealerPlay();
	}

	function dealerPlay() {
		setTimeout(() => {
			const value = calculateValue(dealerHand);

			// Dealer must hit on 16 or less, stand on 17 or more
			if (value < 17) {
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
		const finalDealerValue = calculateValue(dealerHand);

		if (finalDealerValue > TARGET) {
			// Dealer busts
			endGame('win');
		} else if (playerValue > finalDealerValue) {
			endGame('win');
		} else if (finalDealerValue > playerValue) {
			endGame('lose');
		} else {
			// Tie - push (no winner)
			endGame('push');
		}
	}

	function endGame(outcome: 'win' | 'lose' | 'push') {
		gamePhase = 'ended';
		result = outcome;
		dealerHidden = false;

		if (outcome === 'win') {
			// Win 2x the bet
			winPoints = currentBet * 2;
			scores.player += winPoints;
			scores = { ...scores };
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		} else if (outcome === 'lose') {
			// Lose the bet
			scores.dealer += currentBet;
			scores = { ...scores };
		}
		// Push: no points change
	}

	function newRound() {
		gamePhase = 'betting';
		currentBet = 0;
		result = null;
		showWinModal = false;
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
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	{#if gamePhase === 'betting'}
		<!-- Betting Phase -->
		<div class="betting-section">
			<div class="bet-label">{t('bet.choose')}</div>
			<div class="bet-buttons">
				<button class="bet-btn" onclick={() => placeBet(1)}>
					<span class="bet-amount">1</span>
					<span class="bet-text">{t('bet.point')}</span>
				</button>
				<button class="bet-btn" onclick={() => placeBet(2)}>
					<span class="bet-amount">2</span>
					<span class="bet-text">{t('bet.points')}</span>
				</button>
				<button class="bet-btn" onclick={() => placeBet(3)}>
					<span class="bet-amount">3</span>
					<span class="bet-text">{t('bet.points')}</span>
				</button>
			</div>
			<div class="bet-info">{t('bet.info')}</div>
		</div>
	{:else}
		<!-- Game Table -->
		<div class="current-bet">
			{t('bet.current')}: {currentBet} {currentBet === 1 ? t('bet.point') : t('bet.points')}
		</div>

		<div class="table">
			<!-- Dealer's hand -->
			<div class="hand-section">
				<div class="hand-label">
					{t('dealer')} {#if !dealerHidden}({dealerValue}){:else if dealerHand.length > 0}({dealerVisibleValue}+?){/if}
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
					{t('you')} ({playerValue})
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
	{/if}

	<div class="score">
		<div class="score-item won">
			<span class="score-label">{t('score.won')}</span>
			<span class="score-value">{scores.player}</span>
		</div>
		<div class="score-item lost">
			<span class="score-label">{t('score.lost')}</span>
			<span class="score-value">{scores.dealer}</span>
		</div>
	</div>

	<div class="controls">
		{#if gamePhase === 'playing'}
			<button class="btn hit" onclick={hit} disabled={playerValue > TARGET}>{t('hit')}</button>
			<button class="btn stand" onclick={stand}>{t('stand')}</button>
		{:else if gamePhase === 'ended'}
			<button class="btn primary" onclick={newRound}>{t('newGame')}</button>
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
	points={winPoints}
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

	/* Betting Section */
	.betting-section {
		width: 100%;
		max-width: 400px;
		background: linear-gradient(135deg, #065f46 0%, #064e3b 100%);
		border-radius: 20px;
		padding: 30px 20px;
		margin-bottom: 20px;
		text-align: center;
	}

	.bet-label {
		font-size: 1.1rem;
		font-weight: 600;
		color: white;
		margin-bottom: 20px;
	}

	.bet-buttons {
		display: flex;
		justify-content: center;
		gap: 15px;
		margin-bottom: 20px;
	}

	.bet-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: 'Poppins', sans-serif;
	}

	.bet-btn:active {
		transform: scale(0.95);
		background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
	}

	.bet-amount {
		font-size: 1.8rem;
		font-weight: 700;
		line-height: 1;
	}

	.bet-text {
		font-size: 0.7rem;
		font-weight: 500;
		opacity: 0.9;
	}

	.bet-info {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.current-bet {
		font-size: 0.9rem;
		color: #f59e0b;
		font-weight: 600;
		margin-bottom: 10px;
		padding: 8px 16px;
		background: rgba(245, 158, 11, 0.15);
		border-radius: 20px;
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

	.score-item.won {
		background: rgba(34, 197, 94, 0.15);
	}

	.score-item.lost {
		background: rgba(239, 68, 68, 0.15);
	}

	.score-label {
		display: block;
		font-size: 0.75rem;
		color: white;
		margin-bottom: 4px;
	}

	.score-item.won .score-label {
		color: #22c55e;
	}

	.score-item.lost .score-label {
		color: #ef4444;
	}

	.score-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.controls {
		display: flex;
		gap: 15px;
		margin-bottom: 20px;
		min-height: 52px;
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
		content: '\2660';
		position: absolute;
		left: 0;
		color: #10b981;
	}
</style>
