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
	const GAME_NUMBER = '09';
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

	// Board layout:
	// Pits 0-5: Player's pits (left to right)
	// Pit 6: Player's store
	// Pits 7-12: AI's pits (right to left from AI's view)
	// Pit 13: AI's store

	// Game state
	let pits = $state<number[]>([]);
	let isPlayerTurn = $state(true);
	let gameOver = $state(false);
	let lastDropPit = $state<number | null>(null);

	// Scores derived from pits
	let playerScore = $derived(pits[6] ?? 0);
	let aiScore = $derived(pits[13] ?? 0);

	// Status message
	let status = $derived.by(() => {
		if (gameOver) return t('status.gameOver');
		if (!isPlayerTurn) return t('status.aiThinking');
		return t('status.yourTurn');
	});

	let statusClass = $derived.by(() => {
		if (gameOver) return '';
		if (!isPlayerTurn) return 'thinking';
		return '';
	});

	function hasValidMoves(isPlayer: boolean): boolean {
		if (isPlayer) {
			for (let i = 0; i < 6; i++) {
				if (pits[i] > 0) return true;
			}
		} else {
			for (let i = 7; i < 13; i++) {
				if (pits[i] > 0) return true;
			}
		}
		return false;
	}

	function checkGameOver(): boolean {
		const playerEmpty = pits.slice(0, 6).every(p => p === 0);
		const aiEmpty = pits.slice(7, 13).every(p => p === 0);
		return playerEmpty || aiEmpty;
	}

	function makeMove(pitIndex: number) {
		const isPlayer = pitIndex < 6;
		let stones = pits[pitIndex];
		pits[pitIndex] = 0;

		let currentPit = pitIndex;

		// Relay sowing: continue until landing in empty pit or store
		while (true) {
			// Distribute current stones
			while (stones > 0) {
				currentPit = (currentPit + 1) % 14;

				// Skip opponent's store
				if (isPlayer && currentPit === 13) continue;
				if (!isPlayer && currentPit === 6) continue;

				pits[currentPit]++;
				stones--;
			}

			// Check if we landed in a store (ends this sowing round)
			if (currentPit === 6 || currentPit === 13) {
				break;
			}

			// Check if we landed in an empty pit (turn ends)
			if (pits[currentPit] === 1) {
				// We just added one stone, so it was empty before
				break;
			}

			// Landed in non-empty pit: pick up stones and continue
			stones = pits[currentPit];
			pits[currentPit] = 0;
		}

		// Check for capture (only if landed in own empty pit, not store)
		if (isPlayer && currentPit >= 0 && currentPit < 6 && pits[currentPit] === 1) {
			const oppositePit = 12 - currentPit;
			if (pits[oppositePit] > 0) {
				pits[6] += pits[currentPit] + pits[oppositePit];
				pits[currentPit] = 0;
				pits[oppositePit] = 0;
			}
		} else if (!isPlayer && currentPit >= 7 && currentPit < 13 && pits[currentPit] === 1) {
			const oppositePit = 12 - currentPit;
			if (pits[oppositePit] > 0) {
				pits[13] += pits[currentPit] + pits[oppositePit];
				pits[currentPit] = 0;
				pits[oppositePit] = 0;
			}
		}

		// Trigger reactivity
		pits = [...pits];
		lastDropPit = currentPit;

		// Check if game is over
		if (checkGameOver()) {
			endGame();
			return;
		}

		// Check for extra turn (landing in own store)
		const landedInOwnStore = (isPlayer && currentPit === 6) || (!isPlayer && currentPit === 13);

		if (!landedInOwnStore) {
			isPlayerTurn = !isPlayerTurn;
		}

		if (isPlayerTurn) {
			// Check if player has valid moves
			if (!hasValidMoves(true)) {
				isPlayerTurn = false;
				setTimeout(() => aiMove(), 800);
			}
		} else {
			setTimeout(() => aiMove(), 800);
		}
	}

	function evaluateMove(pitIndex: number): number {
		// Simulate the move with relay sowing
		let tempPits = [...pits];
		let stones = tempPits[pitIndex];
		tempPits[pitIndex] = 0;
		let current = pitIndex;

		// Relay sowing simulation
		while (true) {
			while (stones > 0) {
				current = (current + 1) % 14;
				if (current === 6) continue; // Skip player's store
				tempPits[current]++;
				stones--;
			}

			// Landed in store
			if (current === 13) {
				break;
			}

			// Landed in empty pit
			if (tempPits[current] === 1) {
				break;
			}

			// Continue relay
			stones = tempPits[current];
			tempPits[current] = 0;
		}

		let score = 0;

		// Bonus for landing in own store (extra turn)
		if (current === 13) {
			score += 100;
		}

		// Calculate stones gained in store
		score += (tempPits[13] - pits[13]) * 15;

		// Bonus for capture
		if (current >= 7 && current < 13 && tempPits[current] === 1) {
			const opposite = 12 - current;
			if (tempPits[opposite] > 0) {
				score += tempPits[opposite] * 10;
			}
		}

		return score;
	}

	function aiMove() {
		if (gameOver) return;

		// Check if AI has valid moves
		if (!hasValidMoves(false)) {
			isPlayerTurn = true;
			return;
		}

		// Simple AI: prioritize moves that end in store, then captures, then most stones
		let bestMove = -1;
		let bestScore = -1;

		for (let i = 7; i < 13; i++) {
			if (pits[i] === 0) continue;

			const score = evaluateMove(i);
			if (score > bestScore) {
				bestScore = score;
				bestMove = i;
			}
		}

		if (bestMove !== -1) {
			makeMove(bestMove);
		}
	}

	function endGame() {
		gameOver = true;

		// Collect remaining stones
		for (let i = 0; i < 6; i++) {
			pits[6] += pits[i];
			pits[i] = 0;
		}
		for (let i = 7; i < 13; i++) {
			pits[13] += pits[i];
			pits[i] = 0;
		}

		// Trigger reactivity
		pits = [...pits];

		const finalPlayerScore = pits[6];
		const finalAiScore = pits[13];

		if (finalPlayerScore > finalAiScore) {
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		}
	}

	function handlePitClick(pitIndex: number) {
		if (gameOver || !isPlayerTurn) return;
		if (pits[pitIndex] > 0) {
			makeMove(pitIndex);
		}
	}

	function newGame() {
		// Initialize: 4 stones in each pit, 0 in stores
		pits = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
		isPlayerTurn = true;
		gameOver = false;
		lastDropPit = null;
		showWinModal = false;

		trackStart(GAME_NUMBER);
	}

	// Result text for game over
	let resultTitle = $derived.by(() => {
		if (!gameOver) return '';
		const finalPlayerScore = pits[6];
		const finalAiScore = pits[13];
		if (finalPlayerScore > finalAiScore) return t('result.won');
		if (finalAiScore > finalPlayerScore) return t('result.lost');
		return t('result.draw');
	});

	let resultClass = $derived.by(() => {
		if (!gameOver) return '';
		const finalPlayerScore = pits[6];
		const finalAiScore = pits[13];
		if (finalPlayerScore > finalAiScore) return 'win';
		if (finalAiScore > finalPlayerScore) return 'lose';
		return 'draw';
	});

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>

	<div class="board">
		<div class="store ai-store">
			<span class="store-count ai-count">{aiScore}</span>
			<span class="store-label">{t('score.ai')}</span>
		</div>

		<div class="pits-area">
			<div class="pits ai-pits">
				{#each [12, 11, 10, 9, 8, 7] as pitIndex}
					<div
						class="pit"
						class:empty={pits[pitIndex] === 0}
						class:last-drop={lastDropPit === pitIndex}
					>
						{pits[pitIndex]}
					</div>
				{/each}
			</div>
			<div class="pits player-pits">
				{#each [0, 1, 2, 3, 4, 5] as pitIndex}
					<button
						class="pit player-pit"
						class:empty={pits[pitIndex] === 0}
						class:disabled={!isPlayerTurn || gameOver}
						class:last-drop={lastDropPit === pitIndex}
						onclick={() => handlePitClick(pitIndex)}
						disabled={gameOver || !isPlayerTurn || pits[pitIndex] === 0}
					>
						{pits[pitIndex]}
					</button>
				{/each}
			</div>
		</div>

		<div class="store player-store">
			<span class="store-count player-count">{playerScore}</span>
			<span class="store-label">{t('score.you')}</span>
		</div>
	</div>

	{#if gameOver}
		<div class="result">
			<h2 class={resultClass}>{resultTitle}</h2>
			<p>{t('score.you')}: {pits[6]} - {t('score.ai')}: {pits[13]}</p>
		</div>
	{/if}

	<div class="controls">
		<button class="btn" onclick={newGame}>{t('newGame')}</button>
	</div>

	<div class="rules">
		<h3>{t('rules.title')}</h3>
		<ul>
			<li>{t('rules.rule1')}</li>
			<li>{t('rules.rule2')}</li>
			<li>{t('rules.rule3')}</li>
			<li>{t('rules.rule4')}</li>
			<li>{t('rules.rule5')}</li>
			<li>{t('rules.rule6')}</li>
			<li>{t('rules.rule7')}</li>
			<li>{t('rules.rule8')}</li>
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

	.status.thinking {
		color: #fbbf24;
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	.board {
		display: flex;
		gap: 8px;
		background: linear-gradient(145deg, #5d4e37 0%, #3d3225 100%);
		padding: 12px;
		border-radius: 20px;
		margin-bottom: 20px;
		box-shadow:
			inset 0 2px 4px rgba(255, 255, 255, 0.1),
			0 8px 20px rgba(0, 0, 0, 0.4);
		width: 100%;
		max-width: 400px;
	}

	.store {
		width: 55px;
		min-width: 55px;
		background: linear-gradient(180deg, #2a2318 0%, #1a1610 100%);
		border-radius: 25px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 10px 8px;
		box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.5);
	}

	.store-count {
		font-size: 1.5rem;
		font-weight: 700;
		color: #fff;
	}

	.store-count.ai-count {
		color: #f87171;
	}

	.store-count.player-count {
		color: #4ade80;
	}

	.store-label {
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.5);
		margin-top: 3px;
		text-transform: uppercase;
	}

	.pits-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.pits {
		display: flex;
		gap: 6px;
		justify-content: space-between;
	}

	.pit {
		width: 44px;
		height: 44px;
		min-width: 44px;
		min-height: 44px;
		background: linear-gradient(180deg, #2a2318 0%, #1a1610 100%);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
		box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.5);
		transition: all 0.2s;
		cursor: default;
		border: none;
		padding: 0;
		font-family: 'Poppins', sans-serif;
	}

	.pit.player-pit {
		cursor: pointer;
	}

	.pit.player-pit:not(.empty):not(.disabled):active {
		transform: scale(0.9);
		background: linear-gradient(180deg, #3a3328 0%, #2a2620 100%);
	}

	.pit.player-pit:not(.empty):not(.disabled) {
		box-shadow:
			inset 0 3px 6px rgba(0, 0, 0, 0.5),
			0 0 0 2px rgba(74, 222, 128, 0.3);
	}

	.pit.empty {
		color: rgba(255, 255, 255, 0.2);
	}

	.pit.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pit.last-drop {
		box-shadow:
			inset 0 3px 6px rgba(0, 0, 0, 0.5),
			0 0 0 3px rgba(251, 191, 36, 0.6);
	}

	.result {
		text-align: center;
		margin-bottom: 20px;
		padding: 15px 25px;
		background: rgba(128, 128, 128, 0.3);
		border-radius: 15px;
	}

	.result h2 {
		font-size: 1.5rem;
		margin-bottom: 8px;
	}

	.result h2.win {
		color: #4ade80;
	}

	.result h2.lose {
		color: #f87171;
	}

	.result h2.draw {
		color: #fbbf24;
	}

	.result p {
		color: rgba(255, 255, 255, 0.7);
		font-size: 1rem;
	}

	.controls {
		margin-bottom: 20px;
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn:active {
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
		padding: 4px 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.8rem;
		padding-left: 20px;
		position: relative;
	}

	.rules li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 6px;
		height: 6px;
		background: #667eea;
		border-radius: 50%;
	}

	/* Responsive adjustments */
	@media (max-width: 400px) {
		.board {
			padding: 10px;
			gap: 6px;
		}

		.store {
			width: 48px;
			min-width: 48px;
		}

		.store-count {
			font-size: 1.3rem;
		}

		.pit {
			width: 38px;
			height: 38px;
			min-width: 38px;
			min-height: 38px;
			font-size: 0.9rem;
		}

		.pits {
			gap: 4px;
		}
	}

	/* Landscape mode */
	@media (orientation: landscape) and (max-height: 500px) {
		.board {
			max-width: 500px;
			padding: 15px;
			gap: 10px;
		}

		.pit {
			width: 50px;
			height: 50px;
			min-width: 50px;
			min-height: 50px;
			font-size: 1.1rem;
		}

		.store {
			width: 65px;
			min-width: 65px;
		}

		.store-count {
			font-size: 1.8rem;
		}

		.pits {
			gap: 10px;
		}
	}

	/* Larger screens */
	@media (min-width: 500px) {
		.board {
			max-width: 450px;
			padding: 15px;
		}

		.pit {
			width: 50px;
			height: 50px;
			min-width: 50px;
			min-height: 50px;
			font-size: 1.1rem;
		}

		.store {
			width: 60px;
			min-width: 60px;
		}

		.store-count {
			font-size: 1.7rem;
		}
	}
</style>
