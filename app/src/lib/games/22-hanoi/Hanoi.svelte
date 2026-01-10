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
	const GAME_NUMBER = '22';

	// Difficulty settings: disks -> points
	const DIFFICULTY_CONFIG = {
		easy: { disks: 4, points: 1 },
		medium: { disks: 5, points: 3 },
		hard: { disks: 6, points: 5 }
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

	// Game state
	type Difficulty = 'easy' | 'medium' | 'hard';
	let difficulty = $state<Difficulty>('easy');
	let pegs = $state<number[][]>([[], [], []]);
	let moves = $state(0);
	let selectedPeg = $state<number | null>(null);
	let gameWon = $state(false);
	let invalidPeg = $state<number | null>(null);

	// Derived values
	let numDisks = $derived(DIFFICULTY_CONFIG[difficulty].disks);
	let points = $derived(DIFFICULTY_CONFIG[difficulty].points);
	let minimumMoves = $derived(Math.pow(2, numDisks) - 1);

	function newGame() {
		// Reset state
		pegs = [[], [], []];
		moves = 0;
		selectedPeg = null;
		gameWon = false;
		showWinModal = false;
		invalidPeg = null;

		// Initialize disks on first peg (largest to smallest)
		const initialDisks: number[] = [];
		for (let i = numDisks; i >= 1; i--) {
			initialDisks.push(i);
		}
		pegs[0] = initialDisks;
		pegs = [...pegs]; // Trigger reactivity

		// Track game start
		trackStart(GAME_NUMBER);
	}

	function handlePegClick(pegIndex: number) {
		if (gameWon) return;

		if (selectedPeg === null) {
			// Select peg if it has disks
			if (pegs[pegIndex].length > 0) {
				selectedPeg = pegIndex;
			}
		} else if (selectedPeg === pegIndex) {
			// Deselect if clicking same peg
			selectedPeg = null;
		} else {
			// Try to move disk
			tryMove(selectedPeg, pegIndex);
		}
	}

	function tryMove(fromPeg: number, toPeg: number) {
		const fromStack = pegs[fromPeg];
		const toStack = pegs[toPeg];

		if (fromStack.length === 0) {
			selectedPeg = null;
			return;
		}

		const disk = fromStack[fromStack.length - 1];
		const topDisk = toStack.length > 0 ? toStack[toStack.length - 1] : Infinity;

		if (disk < topDisk) {
			// Valid move
			fromStack.pop();
			toStack.push(disk);
			moves++;
			selectedPeg = null;
			pegs = [...pegs]; // Trigger reactivity
			checkWin();
		} else {
			// Invalid move - flash red
			showInvalidMove(toPeg);
		}
	}

	function showInvalidMove(pegIndex: number) {
		invalidPeg = pegIndex;
		setTimeout(() => {
			invalidPeg = null;
		}, 300);
	}

	function isValidTarget(pegIndex: number): boolean {
		if (selectedPeg === null || selectedPeg === pegIndex) return false;
		const selectedDisk = pegs[selectedPeg][pegs[selectedPeg].length - 1];
		const topDisk = pegs[pegIndex].length > 0 ? pegs[pegIndex][pegs[pegIndex].length - 1] : Infinity;
		return selectedDisk < topDisk;
	}

	function checkWin() {
		// Win if all disks are on the last peg
		if (pegs[2].length === numDisks) {
			gameWon = true;
			trackComplete(GAME_NUMBER);
			// Show win modal after a short delay
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		}
	}

	function setDifficulty(diff: Difficulty) {
		difficulty = diff;
		newGame();
	}

	// Get disk width as percentage
	function getDiskWidth(diskSize: number): string {
		// Map disk sizes to widths (35px to 110px scaled to percentages)
		const minWidth = 30;
		const maxWidth = 95;
		const widthStep = (maxWidth - minWidth) / 5; // 6 possible disk sizes
		return `${minWidth + (diskSize - 1) * widthStep}%`;
	}

	// Get disk color based on size
	function getDiskColor(diskSize: number): string {
		const colors = [
			'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', // 1 - red
			'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', // 2 - orange
			'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', // 3 - yellow
			'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', // 4 - green
			'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', // 5 - blue
			'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'  // 6 - purple
		];
		return colors[diskSize - 1] || colors[0];
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="stats">
		<div class="stat">
			<span class="stat-label">{t('moves')}</span>
			<span class="stat-value">{moves}</span>
		</div>
		<div class="stat">
			<span class="stat-label">{t('minimum')}</span>
			<span class="stat-value">{minimumMoves}</span>
		</div>
	</div>

	<div class="game-area" class:won={gameWon}>
		<div class="pegs">
			{#each [0, 1, 2] as pegIndex}
				<button
					class="peg"
					class:selected={selectedPeg === pegIndex}
					class:valid-target={isValidTarget(pegIndex)}
					class:invalid-target={invalidPeg === pegIndex}
					onclick={() => handlePegClick(pegIndex)}
					aria-label="Peg {pegIndex + 1}"
				>
					<div class="peg-rod"></div>
					<div class="peg-base"></div>
					<div class="disks">
						{#each pegs[pegIndex] as diskSize, diskIndex}
							<div
								class="disk"
								class:selected={selectedPeg === pegIndex && diskIndex === pegs[pegIndex].length - 1}
								style="width: {getDiskWidth(diskSize)}; background: {getDiskColor(diskSize)};"
							></div>
						{/each}
					</div>
				</button>
			{/each}
		</div>
	</div>

	<div class="controls">
		<div class="level-selector">
			<button
				class="level-btn"
				class:active={difficulty === 'easy'}
				onclick={() => setDifficulty('easy')}
			>
				{t('difficulty.easy')}
			</button>
			<button
				class="level-btn"
				class:active={difficulty === 'medium'}
				onclick={() => setDifficulty('medium')}
			>
				{t('difficulty.medium')}
			</button>
			<button
				class="level-btn"
				class:active={difficulty === 'hard'}
				onclick={() => setDifficulty('hard')}
			>
				{t('difficulty.hard')}
			</button>
		</div>
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

	.stats {
		display: flex;
		gap: 30px;
		margin-bottom: 20px;
	}

	.stat {
		text-align: center;
		background: rgba(255, 255, 255, 0.05);
		padding: 10px 25px;
		border-radius: 15px;
	}

	.stat-label {
		display: block;
		font-size: 0.75rem;
		color: white;
		margin-bottom: 4px;
	}

	.stat-value {
		font-size: 1.4rem;
		font-weight: 700;
		color: #a855f7;
	}

	.game-area {
		width: 100%;
		margin-bottom: 25px;
		background: rgba(255, 255, 255, 0.05);
		padding: 20px 10px;
		border-radius: 20px;
	}

	.game-area.won .disk {
		animation: celebrate 0.5s ease infinite alternate;
	}

	@keyframes celebrate {
		0% { transform: scale(1); }
		100% { transform: scale(1.05); }
	}

	.pegs {
		display: flex;
		justify-content: space-around;
		align-items: flex-end;
		height: 200px;
		position: relative;
	}

	.peg {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 30%;
		height: 100%;
		cursor: pointer;
		position: relative;
		transition: transform 0.15s ease;
		background: transparent;
		border: none;
		padding: 0;
	}

	.peg:active {
		transform: scale(0.98);
	}

	.peg.selected {
		transform: scale(1.02);
	}

	.peg.selected .peg-rod {
		background: linear-gradient(180deg, #a855f7 0%, #8b5cf6 100%);
		box-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
	}

	.peg.valid-target .peg-base {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.6) 0%, rgba(34, 197, 94, 0.4) 100%);
		box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
	}

	.peg.invalid-target .peg-base {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.6) 0%, rgba(239, 68, 68, 0.4) 100%);
	}

	.peg-base {
		width: 100%;
		height: 12px;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(139, 92, 246, 0.2) 100%);
		border-radius: 6px;
		position: absolute;
		bottom: 0;
		transition: all 0.2s ease;
	}

	.peg-rod {
		width: 8px;
		height: 150px;
		background: linear-gradient(180deg, rgba(139, 92, 246, 0.6) 0%, rgba(139, 92, 246, 0.3) 100%);
		border-radius: 4px 4px 0 0;
		position: absolute;
		bottom: 12px;
		transition: all 0.2s ease;
	}

	.disks {
		position: absolute;
		bottom: 12px;
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
		width: 100%;
	}

	.disk {
		height: 20px;
		border-radius: 10px;
		margin-bottom: 2px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.8);
	}

	.disk.selected {
		transform: translateY(-10px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
	}

	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 15px;
		margin-bottom: 20px;
	}

	.level-selector {
		display: flex;
		gap: 8px;
	}

	.level-btn {
		padding: 10px 20px;
		height: 44px;
		border-radius: 12px;
		border: 2px solid rgba(139, 92, 246, 0.3);
		background: rgba(139, 92, 246, 0.1);
		color: rgba(255, 255, 255, 0.7);
		font-family: 'Poppins', sans-serif;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.level-btn:active {
		transform: scale(0.95);
	}

	.level-btn.active {
		background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
		border-color: transparent;
		color: white;
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
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
		padding: 0;
		margin: 0;
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
		color: #a855f7;
	}

	/* Landscape mode */
	@media (orientation: landscape) and (max-height: 500px) {
		.stats {
			margin-bottom: 10px;
			gap: 15px;
		}

		.stat {
			padding: 6px 15px;
		}

		.stat-value {
			font-size: 1.1rem;
		}

		.game-area {
			margin-bottom: 15px;
			padding: 15px;
		}

		.pegs {
			height: 150px;
		}

		.peg-rod {
			height: 120px;
		}

		.controls {
			flex-direction: row;
			gap: 10px;
			margin-bottom: 10px;
		}

		.rules {
			display: none;
		}
	}
</style>
