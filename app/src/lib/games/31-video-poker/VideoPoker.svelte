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
	const GAME_NUMBER = '31';

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
		value: number;
		held: boolean;
	}

	// Hand types with payouts (multiplier of bet)
	const HAND_PAYOUTS: Record<string, number> = {
		'royalFlush': 250,
		'straightFlush': 50,
		'fourOfAKind': 25,
		'fullHouse': 9,
		'flush': 6,
		'straight': 4,
		'threeOfAKind': 3,
		'twoPair': 2,
		'jacksOrBetter': 1
	};

	// Game state
	let deck = $state<Card[]>([]);
	let hand = $state<Card[]>([]);
	let gamePhase = $state<'betting' | 'deal' | 'draw' | 'ended'>('betting');
	let handResult = $state<string | null>(null);
	let scores = $state({ won: 0, lost: 0 });

	// Status message
	let status = $derived.by(() => {
		if (gamePhase === 'betting') return t('status.placeBet');
		if (gamePhase === 'deal') return t('status.selectCards');
		if (gamePhase === 'draw') return t('status.drawing');
		if (handResult) {
			const payout = HAND_PAYOUTS[handResult];
			if (payout) {
				return t(`hands.${handResult}`);
			}
			return t('status.noWin');
		}
		return '';
	});

	let statusClass = $derived.by(() => {
		if (handResult && HAND_PAYOUTS[handResult]) return 'winner';
		if (gamePhase === 'ended' && !handResult) return 'loser';
		return '';
	});

	// Create and shuffle deck
	function createDeck(): Card[] {
		const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
		const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
		const cards: Card[] = [];

		for (const suit of suits) {
			for (let i = 0; i < ranks.length; i++) {
				cards.push({
					suit,
					rank: ranks[i],
					value: i + 1, // A=1, 2=2, ..., K=13
					held: false
				});
			}
		}

		// Shuffle
		for (let i = cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[cards[i], cards[j]] = [cards[j], cards[i]];
		}

		return cards;
	}

	function placeBet(amount: number) {
		currentBet = amount;
		startGame();
	}

	function startGame() {
		deck = createDeck();
		hand = [];
		handResult = null;
		showWinModal = false;
		winPoints = 0;

		// Deal 5 cards
		for (let i = 0; i < 5; i++) {
			const card = deck.pop();
			if (card) {
				card.held = false;
				hand.push(card);
			}
		}
		hand = [...hand];

		gamePhase = 'deal';
		trackStart(GAME_NUMBER);
	}

	function toggleHold(index: number) {
		if (gamePhase !== 'deal') return;
		hand[index].held = !hand[index].held;
		hand = [...hand];
	}

	function draw() {
		if (gamePhase !== 'deal') return;
		gamePhase = 'draw';

		// Replace non-held cards
		setTimeout(() => {
			for (let i = 0; i < hand.length; i++) {
				if (!hand[i].held) {
					const newCard = deck.pop();
					if (newCard) {
						newCard.held = false;
						hand[i] = newCard;
					}
				}
			}
			hand = [...hand];

			// Evaluate hand
			evaluateHand();
		}, 300);
	}

	function evaluateHand() {
		const result = getHandRank();
		handResult = result;
		gamePhase = 'ended';

		if (result && HAND_PAYOUTS[result]) {
			const payout = HAND_PAYOUTS[result] * currentBet;
			winPoints = payout;
			scores.won += payout;
			scores = { ...scores };
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		} else {
			scores.lost += currentBet;
			scores = { ...scores };
		}
	}

	function getHandRank(): string | null {
		const values = hand.map(c => c.value).sort((a, b) => a - b);
		const suits = hand.map(c => c.suit);

		const isFlush = suits.every(s => s === suits[0]);
		const isStraight = checkStraight(values);
		const isRoyal = values.join(',') === '1,10,11,12,13'; // A,10,J,Q,K

		// Count occurrences of each value
		const counts: Record<number, number> = {};
		for (const v of values) {
			counts[v] = (counts[v] || 0) + 1;
		}
		const countValues = Object.values(counts).sort((a, b) => b - a);

		// Check hands from highest to lowest
		if (isFlush && isRoyal) return 'royalFlush';
		if (isFlush && isStraight) return 'straightFlush';
		if (countValues[0] === 4) return 'fourOfAKind';
		if (countValues[0] === 3 && countValues[1] === 2) return 'fullHouse';
		if (isFlush) return 'flush';
		if (isStraight) return 'straight';
		if (countValues[0] === 3) return 'threeOfAKind';
		if (countValues[0] === 2 && countValues[1] === 2) return 'twoPair';

		// Jacks or better (pair of J, Q, K, or A)
		if (countValues[0] === 2) {
			for (const [val, count] of Object.entries(counts)) {
				if (count === 2) {
					const v = parseInt(val);
					if (v === 1 || v >= 11) { // A, J, Q, K
						return 'jacksOrBetter';
					}
				}
			}
		}

		return null;
	}

	function checkStraight(values: number[]): boolean {
		// Regular straight
		for (let i = 0; i < values.length - 1; i++) {
			if (values[i + 1] - values[i] !== 1) {
				// Check for A-high straight (10,J,Q,K,A)
				if (values.join(',') === '1,10,11,12,13') {
					return true;
				}
				return false;
			}
		}
		return true;
	}

	function newRound() {
		gamePhase = 'betting';
		currentBet = 0;
		handResult = null;
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
		<!-- Payout Table -->
		<div class="payout-table">
			<div class="payout-title">{t('payouts')}</div>
			<div class="payout-grid">
				<div class="payout-row"><span>{t('hands.royalFlush')}</span><span>250x</span></div>
				<div class="payout-row"><span>{t('hands.straightFlush')}</span><span>50x</span></div>
				<div class="payout-row"><span>{t('hands.fourOfAKind')}</span><span>25x</span></div>
				<div class="payout-row"><span>{t('hands.fullHouse')}</span><span>9x</span></div>
				<div class="payout-row"><span>{t('hands.flush')}</span><span>6x</span></div>
				<div class="payout-row"><span>{t('hands.straight')}</span><span>4x</span></div>
				<div class="payout-row"><span>{t('hands.threeOfAKind')}</span><span>3x</span></div>
				<div class="payout-row"><span>{t('hands.twoPair')}</span><span>2x</span></div>
				<div class="payout-row"><span>{t('hands.jacksOrBetter')}</span><span>1x</span></div>
			</div>
		</div>

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
		</div>
	{:else}
		<!-- Game Table -->
		<div class="current-bet">
			{t('bet.current')}: {currentBet} {currentBet === 1 ? t('bet.point') : t('bet.points')}
		</div>

		<div class="table">
			<div class="hand">
				{#each hand as card, i}
					<button
						class="card-wrapper"
						onclick={() => toggleHold(i)}
						disabled={gamePhase !== 'deal'}
					>
						{#if card.held}
							<div class="held-badge">{t('held')}</div>
						{/if}
						<div class="card {getSuitColor(card.suit)}" class:held={card.held}>
							<div class="card-rank">{card.rank}</div>
							<div class="card-suit">{getSuitSymbol(card.suit)}</div>
						</div>
					</button>
				{/each}
			</div>
			{#if gamePhase === 'deal'}
				<div class="hint">{t('hint')}</div>
			{/if}
		</div>
	{/if}

	<div class="score">
		<div class="score-item won">
			<span class="score-label">{t('score.won')}</span>
			<span class="score-value">{scores.won}</span>
		</div>
		<div class="score-item lost">
			<span class="score-label">{t('score.lost')}</span>
			<span class="score-value">{scores.lost}</span>
		</div>
	</div>

	<div class="controls">
		{#if gamePhase === 'deal'}
			<button class="btn primary" onclick={draw}>{t('draw')}</button>
		{:else if gamePhase === 'ended'}
			<button class="btn primary" onclick={newRound}>{t('newGame')}</button>
		{/if}
	</div>

	{#if gamePhase !== 'betting'}
		<div class="rules">
			<h3>{t('rules.title')}</h3>
			<ul>
				<li>{t('rules.rule1')}</li>
				<li>{t('rules.rule2')}</li>
				<li>{t('rules.rule3')}</li>
			</ul>
		</div>
	{/if}
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

	/* Payout Table */
	.payout-table {
		width: 100%;
		max-width: 300px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 15px;
		padding: 15px;
		margin-bottom: 20px;
	}

	.payout-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: #f59e0b;
		text-align: center;
		margin-bottom: 10px;
	}

	.payout-grid {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.payout-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.8);
		padding: 4px 8px;
	}

	.payout-row:nth-child(odd) {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 4px;
	}

	.payout-row span:last-child {
		font-weight: 600;
		color: #10b981;
	}

	/* Betting Section */
	.betting-section {
		width: 100%;
		max-width: 400px;
		background: linear-gradient(135deg, #1e3a5f 0%, #1a2e4a 100%);
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
		background: linear-gradient(135deg, #1e3a5f 0%, #1a2e4a 100%);
		border-radius: 20px;
		padding: 20px 10px;
		margin-bottom: 20px;
		box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.hand {
		display: flex;
		justify-content: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.card-wrapper {
		position: relative;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: transform 0.2s ease;
	}

	.card-wrapper:disabled {
		cursor: default;
	}

	.card-wrapper:not(:disabled):active {
		transform: scale(0.95);
	}

	.held-badge {
		position: absolute;
		top: -10px;
		left: 50%;
		transform: translateX(-50%);
		background: #22c55e;
		color: white;
		font-size: 0.65rem;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 10px;
		z-index: 1;
		text-transform: uppercase;
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
		transition: all 0.2s ease;
		border: 3px solid transparent;
	}

	.card.held {
		border-color: #22c55e;
		box-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
		transform: translateY(-8px);
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

	.hint {
		text-align: center;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		margin-top: 15px;
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
		min-width: 120px;
	}

	.btn:active {
		transform: scale(0.95);
	}

	.btn.primary {
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
		color: #6366f1;
	}
</style>
