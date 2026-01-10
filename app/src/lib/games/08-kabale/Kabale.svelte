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
	const GAME_NUMBER = '08';
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

	// Card types
	interface Card {
		suit: string;
		rank: number;
		faceUp: boolean;
	}

	// Game constants
	const suits = ['hearts', 'clubs', 'diamonds', 'spades'];
	const suitEmojis: Record<string, string> = {
		hearts: '\u{1F338}', // Cherry blossom (pink/red)
		clubs: '\u{1F30A}',  // Wave (blue)
		diamonds: '\u{1F525}', // Fire (red)
		spades: '\u{1F340}'   // Four leaf clover (green)
	};
	const suitColors: Record<string, string> = {
		hearts: 'red',
		clubs: 'black',
		diamonds: 'red',
		spades: 'black'
	};
	const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

	// Game state
	let stock = $state<Card[]>([]);
	let waste = $state<Card[]>([]);
	let foundations = $state<Card[][]>([[], [], [], []]);
	let tableau = $state<Card[][]>([[], [], [], [], [], [], []]);
	let moves = $state(0);
	let selectedCard = $state<Card | null>(null);
	let selectedSource = $state<{ type: string; index: number; cardIndex: number } | null>(null);
	let gameOver = $state(false);

	// Helper functions
	function shuffle<T>(array: T[]): T[] {
		const arr = [...array];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	function newGame() {
		// Reset state
		stock = [];
		waste = [];
		foundations = [[], [], [], []];
		tableau = [[], [], [], [], [], [], []];
		moves = 0;
		selectedCard = null;
		selectedSource = null;
		gameOver = false;
		showWinModal = false;

		// Create deck
		const deck: Card[] = [];
		for (let s = 0; s < 4; s++) {
			for (let r = 0; r < 13; r++) {
				deck.push({ suit: suits[s], rank: r, faceUp: false });
			}
		}

		// Shuffle
		const shuffledDeck = shuffle(deck);

		// Deal to tableau
		let cardIndex = 0;
		for (let col = 0; col < 7; col++) {
			const column: Card[] = [];
			for (let row = 0; row <= col; row++) {
				const card = { ...shuffledDeck[cardIndex++] };
				card.faceUp = row === col;
				column.push(card);
			}
			tableau[col] = column;
		}

		// Rest goes to stock
		stock = shuffledDeck.slice(cardIndex).map(c => ({ ...c }));

		// Track game start
		trackStart(GAME_NUMBER);
	}

	function drawFromStock() {
		if (selectedCard) {
			clearSelection();
			return;
		}

		if (stock.length === 0) {
			// Reset stock from waste
			stock = waste.reverse().map(c => ({ ...c, faceUp: false }));
			waste = [];
		} else {
			const card = stock.pop();
			if (card) {
				card.faceUp = true;
				waste = [...waste, card];
				stock = [...stock]; // Trigger reactivity
				moves++;
			}
		}
	}

	function clearSelection() {
		selectedCard = null;
		selectedSource = null;
	}

	function selectCard(card: Card, source: string, sourceIndex: number = 0, cardIndex: number = 0) {
		if (selectedCard === card) {
			clearSelection();
			return;
		}

		if (!card.faceUp) return;

		if (selectedCard) {
			// Try to move selected card to this location
			if (source === 'tableau') {
				tryMoveToTableau(sourceIndex);
			} else if (source === 'foundation') {
				clearSelection();
			}
			return;
		}

		selectedCard = card;
		selectedSource = { type: source, index: sourceIndex, cardIndex };
	}

	function handleWasteClick() {
		if (waste.length > 0) {
			selectCard(waste[waste.length - 1], 'waste', 0, waste.length - 1);
		}
	}

	function handleFoundationClick(foundationIndex: number) {
		if (selectedCard) {
			tryMoveToFoundation(foundationIndex);
		} else if (foundations[foundationIndex].length > 0) {
			const card = foundations[foundationIndex][foundations[foundationIndex].length - 1];
			selectCard(card, 'foundation', foundationIndex, foundations[foundationIndex].length - 1);
		}
	}

	function handleTableauClick(colIndex: number, clickedCardIndex: number) {
		const column = tableau[colIndex];

		if (selectedCard) {
			tryMoveToTableau(colIndex);
			return;
		}

		if (column.length === 0) return;

		// Make sure clicked index is valid and face up
		if (clickedCardIndex >= column.length || !column[clickedCardIndex].faceUp) {
			// Try to find the first face up card
			const firstFaceUp = column.findIndex(c => c.faceUp);
			if (firstFaceUp >= 0) {
				clickedCardIndex = firstFaceUp;
			} else {
				return;
			}
		}

		selectCard(column[clickedCardIndex], 'tableau', colIndex, clickedCardIndex);
	}

	function handleEmptyTableauClick(colIndex: number) {
		if (selectedCard) {
			tryMoveToTableau(colIndex);
		}
	}

	function tryMoveToFoundation(foundationIndex: number) {
		if (!selectedCard || !selectedSource) return;

		const foundation = foundations[foundationIndex];
		const card = selectedCard;

		// Check if move is valid
		const targetSuit = suits[foundationIndex];
		if (card.suit !== targetSuit) {
			clearSelection();
			return;
		}

		const expectedRank = foundation.length;
		if (card.rank !== expectedRank) {
			clearSelection();
			return;
		}

		// Can only move single cards to foundation
		if (selectedSource.type === 'tableau') {
			const col = tableau[selectedSource.index];
			if (selectedSource.cardIndex !== col.length - 1) {
				clearSelection();
				return;
			}
		}

		// Move the card
		removeSelectedCard();
		foundations[foundationIndex] = [...foundation, card];
		moves++;
		clearSelection();

		if (checkWin()) {
			gameOver = true;
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 300);
		}
	}

	function tryMoveToTableau(colIndex: number) {
		if (!selectedCard || !selectedSource) return;

		const column = tableau[colIndex];
		const card = selectedCard;

		// Check if move is valid
		if (column.length === 0) {
			// Only kings can go on empty columns
			if (card.rank !== 12) {
				clearSelection();
				return;
			}
		} else {
			const topCard = column[column.length - 1];
			// Must be opposite color and one rank lower
			if (suitColors[card.suit] === suitColors[topCard.suit]) {
				clearSelection();
				return;
			}
			if (card.rank !== topCard.rank - 1) {
				clearSelection();
				return;
			}
		}

		// Move the card(s)
		const cardsToMove = getCardsToMove();
		removeSelectedCard();
		tableau[colIndex] = [...column, ...cardsToMove];
		moves++;
		clearSelection();
	}

	function getCardsToMove(): Card[] {
		if (!selectedCard || !selectedSource) return [];

		if (selectedSource.type === 'waste') {
			return [selectedCard];
		} else if (selectedSource.type === 'foundation') {
			return [selectedCard];
		} else if (selectedSource.type === 'tableau') {
			const col = tableau[selectedSource.index];
			return col.slice(selectedSource.cardIndex);
		}
		return [selectedCard];
	}

	function removeSelectedCard() {
		if (!selectedSource) return;

		if (selectedSource.type === 'waste') {
			waste = waste.slice(0, -1);
		} else if (selectedSource.type === 'foundation') {
			foundations[selectedSource.index] = foundations[selectedSource.index].slice(0, -1);
		} else if (selectedSource.type === 'tableau') {
			const col = [...tableau[selectedSource.index]];
			col.splice(selectedSource.cardIndex);
			// Flip the new top card
			if (col.length > 0 && !col[col.length - 1].faceUp) {
				col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
			}
			tableau[selectedSource.index] = col;
		}
	}

	function checkWin(): boolean {
		return foundations.every(f => f.length === 13);
	}

	function isCardSelected(card: Card, source: string, sourceIndex: number, cardIndex: number): boolean {
		if (!selectedCard || !selectedSource) return false;

		if (selectedSource.type !== source) return false;
		if (selectedSource.index !== sourceIndex) return false;

		// For tableau, highlight all cards from the selected one down
		if (source === 'tableau') {
			return cardIndex >= selectedSource.cardIndex;
		}

		return selectedSource.cardIndex === cardIndex;
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="controls">
		<button class="btn" onclick={newGame}>{t('newGame')}</button>
		<div class="move-counter">
			<span>{t('moves')}:</span>
			<span class="value">{moves}</span>
		</div>
	</div>

	<div class="game-area">
		<div class="top-row">
			<div class="stock-waste">
				<button
					class="pile stock"
					class:empty={stock.length === 0}
					onclick={drawFromStock}
					aria-label={t('stock')}
				>
					{#if stock.length > 0}
						<div class="card back"></div>
					{:else}
						<span class="reset-icon"></span>
					{/if}
				</button>
				<button
					class="pile waste"
					onclick={handleWasteClick}
					aria-label="Waste pile"
				>
					{#if waste.length > 0}
						{@const card = waste[waste.length - 1]}
						<div
							class="card face {suitColors[card.suit]}"
							class:selected={selectedCard === card}
						>
							<div class="card-corner">
								<span class="card-rank">{ranks[card.rank]}</span>
								<span class="card-suit">{suitEmojis[card.suit]}</span>
							</div>
							<div class="card-center">{suitEmojis[card.suit]}</div>
						</div>
					{/if}
				</button>
			</div>

			<div class="foundations">
				{#each foundations as foundation, i}
					<button
						class="pile foundation"
						data-suit={i}
						onclick={() => handleFoundationClick(i)}
						aria-label="Foundation {i + 1}"
					>
						{#if foundation.length > 0}
							{@const card = foundation[foundation.length - 1]}
							<div
								class="card face {suitColors[card.suit]}"
								class:selected={selectedCard === card}
							>
								<div class="card-corner">
									<span class="card-rank">{ranks[card.rank]}</span>
									<span class="card-suit">{suitEmojis[card.suit]}</span>
								</div>
								<div class="card-center">{suitEmojis[card.suit]}</div>
							</div>
						{:else}
							<span class="foundation-suit">{suitEmojis[suits[i]]}</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="tableau">
			{#each tableau as column, colIndex}
				<div class="pile column">
					{#if column.length === 0}
						<button
							class="empty-slot"
							onclick={() => handleEmptyTableauClick(colIndex)}
							aria-label="Empty column {colIndex + 1}"
						></button>
					{:else}
						{#each column as card, cardIndex}
							<button
								class="card"
								class:back={!card.faceUp}
								class:face={card.faceUp}
								class:red={card.faceUp && suitColors[card.suit] === 'red'}
								class:black={card.faceUp && suitColors[card.suit] === 'black'}
								class:selected={card.faceUp && isCardSelected(card, 'tableau', colIndex, cardIndex)}
								style="top: {cardIndex * 25}px"
								onclick={() => handleTableauClick(colIndex, cardIndex)}
								aria-label={card.faceUp ? `${ranks[card.rank]} of ${card.suit}` : 'Face down card'}
							>
								{#if card.faceUp}
									<div class="card-corner">
										<span class="card-rank">{ranks[card.rank]}</span>
										<span class="card-suit">{suitEmojis[card.suit]}</span>
									</div>
									<div class="card-center">{suitEmojis[card.suit]}</div>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			{/each}
		</div>
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
		align-items: center;
		gap: 20px;
		margin-bottom: 15px;
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

	.move-counter {
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		padding: 8px 15px;
		border-radius: 10px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
	}

	.move-counter .value {
		font-weight: 700;
		color: #fff;
		margin-left: 5px;
	}

	.game-area {
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
		border-radius: 15px;
		padding: 15px;
		margin-bottom: 20px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		width: 100%;
		max-width: 700px;
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 20px;
	}

	.stock-waste {
		display: flex;
		gap: 10px;
	}

	.foundations {
		display: flex;
		gap: 8px;
	}

	.pile {
		width: 50px;
		height: 70px;
		border-radius: 8px;
		position: relative;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.stock, .foundation {
		background: rgba(255, 255, 255, 0.08);
		border: 2px dashed rgba(255, 255, 255, 0.15);
	}

	.foundation {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.foundation-suit {
		font-size: 1.5rem;
		opacity: 0.3;
	}

	.tableau {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.column {
		min-height: 70px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.08);
		position: relative;
	}

	.empty-slot {
		width: 100%;
		height: 100%;
		min-height: 70px;
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.card {
		width: 50px;
		height: 70px;
		border-radius: 8px;
		position: absolute;
		left: 0;
		cursor: pointer;
		transition: transform 0.15s, box-shadow 0.15s;
		user-select: none;
		padding: 0;
		border: none;
	}

	.card:active {
		transform: scale(1.05);
		z-index: 100;
	}

	.card.back {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border: 2px solid rgba(255, 255, 255, 0.2);
	}

	.card.back::after {
		content: '\u2726';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 1.5rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.card.face {
		background: linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%);
		border: 2px solid rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		padding: 4px;
	}

	.card.face.red {
		color: #dc2626;
	}

	.card.face.black {
		color: #1e293b;
	}

	.card-corner {
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1;
	}

	.card-rank {
		font-size: 0.85rem;
		font-weight: 700;
	}

	.card-suit {
		font-size: 0.7rem;
	}

	.card-center {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 1.4rem;
	}

	.card.selected {
		box-shadow: 0 0 0 3px #667eea, 0 8px 20px rgba(0, 0, 0, 0.4);
		transform: translateY(-5px);
		z-index: 50;
	}

	.stock:active {
		transform: scale(0.95);
	}

	.stock.empty {
		border-style: solid;
		background: rgba(255, 255, 255, 0.03);
	}

	.stock.empty::after {
		content: '\21BA';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 1.5rem;
		color: rgba(255, 255, 255, 0.3);
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
		content: '\2022';
		position: absolute;
		left: 0;
		color: #667eea;
	}

	/* Responsive styles */
	@media (min-width: 500px) {
		.pile {
			width: 60px;
			height: 84px;
		}

		.card {
			width: 60px;
			height: 84px;
		}

		.card-rank {
			font-size: 1rem;
		}

		.card-suit {
			font-size: 0.85rem;
		}

		.card-center {
			font-size: 1.8rem;
		}

		.foundations {
			gap: 10px;
		}

		.tableau {
			gap: 10px;
		}
	}

	@media (min-width: 650px) {
		.pile {
			width: 75px;
			height: 105px;
		}

		.card {
			width: 75px;
			height: 105px;
		}

		.card-rank {
			font-size: 1.1rem;
		}

		.card-center {
			font-size: 2.2rem;
		}

		.game-area {
			padding: 20px;
		}
	}
</style>
