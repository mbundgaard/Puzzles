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
	const GAME_NUMBER = '19';
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

	// Constants
	const PLAYER = 1;
	const AI = 2;
	const EMPTY = 0;

	// Board positions (24 points)
	// Outer square: 0-7, Middle square: 8-15, Inner square: 16-23
	const positions = [
		{ x: 10, y: 10 },   // 0: top-left outer
		{ x: 150, y: 10 },  // 1: top-center outer
		{ x: 290, y: 10 },  // 2: top-right outer
		{ x: 57, y: 57 },   // 3: top-left middle
		{ x: 150, y: 57 },  // 4: top-center middle
		{ x: 243, y: 57 },  // 5: top-right middle
		{ x: 104, y: 104 }, // 6: top-left inner
		{ x: 150, y: 104 }, // 7: top-center inner
		{ x: 196, y: 104 }, // 8: top-right inner
		{ x: 10, y: 150 },  // 9: middle-left outer
		{ x: 57, y: 150 },  // 10: middle-left middle
		{ x: 104, y: 150 }, // 11: middle-left inner
		{ x: 196, y: 150 }, // 12: middle-right inner
		{ x: 243, y: 150 }, // 13: middle-right middle
		{ x: 290, y: 150 }, // 14: middle-right outer
		{ x: 104, y: 196 }, // 15: bottom-left inner
		{ x: 150, y: 196 }, // 16: bottom-center inner
		{ x: 196, y: 196 }, // 17: bottom-right inner
		{ x: 57, y: 243 },  // 18: bottom-left middle
		{ x: 150, y: 243 }, // 19: bottom-center middle
		{ x: 243, y: 243 }, // 20: bottom-right middle
		{ x: 10, y: 290 },  // 21: bottom-left outer
		{ x: 150, y: 290 }, // 22: bottom-center outer
		{ x: 290, y: 290 }  // 23: bottom-right outer
	];

	// Adjacent connections
	const adjacency: Record<number, number[]> = {
		0: [1, 9],
		1: [0, 2, 4],
		2: [1, 14],
		3: [4, 10],
		4: [1, 3, 5, 7],
		5: [4, 13],
		6: [7, 11],
		7: [4, 6, 8],
		8: [7, 12],
		9: [0, 10, 21],
		10: [3, 9, 11, 18],
		11: [6, 10, 15],
		12: [8, 13, 17],
		13: [5, 12, 14, 20],
		14: [2, 13, 23],
		15: [11, 16],
		16: [15, 17, 19],
		17: [12, 16],
		18: [10, 19],
		19: [16, 18, 20, 22],
		20: [13, 19],
		21: [9, 22],
		22: [19, 21, 23],
		23: [14, 22]
	};

	// Mills (all possible three-in-a-row combinations)
	const mills = [
		[0, 1, 2], [3, 4, 5], [6, 7, 8],
		[15, 16, 17], [18, 19, 20], [21, 22, 23],
		[0, 9, 21], [3, 10, 18], [6, 11, 15],
		[8, 12, 17], [5, 13, 20], [2, 14, 23],
		[1, 4, 7], [16, 19, 22],
		[9, 10, 11], [12, 13, 14]
	];

	const difficulties: Record<string, number> = {
		easy: 2,
		medium: 3,
		hard: 4
	};

	// Game state
	let board = $state<number[]>(new Array(24).fill(EMPTY));
	let playerHand = $state(9);
	let aiHand = $state(9);
	let selectedPiece = $state<number | null>(null);
	let validMoves = $state<number[]>([]);
	let isPlayerTurn = $state(true);
	let phase = $state(1); // 1: placing, 2: moving
	let removeMode = $state(false);
	let removablePieces = $state<number[]>([]);
	let gameOver = $state(false);
	let winner = $state<'player' | 'ai' | null>(null);
	let difficulty = $state<'easy' | 'medium' | 'hard'>('medium');
	let millHighlight = $state<number[]>([]);

	// Derived state
	let playerOnBoard = $derived(board.filter(p => p === PLAYER).length);
	let aiOnBoard = $derived(board.filter(p => p === AI).length);

	let status = $derived.by(() => {
		if (winner === 'player') return t('status.won');
		if (winner === 'ai') return t('status.lost');
		if (!isPlayerTurn) return t('status.aiThinking');
		if (removeMode) return t('status.removePiece');
		if (phase === 1) return t('status.placePiece');
		return t('status.movePiece');
	});

	let statusClass = $derived.by(() => {
		if (winner === 'player') return 'winner';
		if (winner === 'ai') return 'loser';
		if (!isPlayerTurn) return 'thinking';
		if (removeMode) return 'remove-mode';
		return '';
	});

	let phaseText = $derived(phase === 1 ? t('phase.placement') : t('phase.movement'));

	function getPlayerPieceCount(player: number, boardState: number[] = board): number {
		return boardState.filter(p => p === player).length;
	}

	function canFly(player: number, boardState: number[] = board): boolean {
		return getPlayerPieceCount(player, boardState) === 3 &&
			(player === PLAYER ? playerHand === 0 : aiHand === 0);
	}

	function getAdjacentMoves(pos: number, boardState: number[] = board): number[] {
		return adjacency[pos].filter(adj => boardState[adj] === EMPTY);
	}

	interface Move {
		type: 'place' | 'move';
		from?: number;
		to: number;
	}

	function getAllMoves(player: number, boardState: number[] = board, hand: number | null = null): Move[] {
		const moves: Move[] = [];
		const playerHandCount = hand !== null ? hand : (player === PLAYER ? playerHand : aiHand);

		if (playerHandCount > 0) {
			// Phase 1: Can place on any empty spot
			for (let i = 0; i < 24; i++) {
				if (boardState[i] === EMPTY) {
					moves.push({ type: 'place', to: i });
				}
			}
		} else {
			// Phase 2: Move pieces
			const canFlyNow = canFly(player, boardState);

			for (let i = 0; i < 24; i++) {
				if (boardState[i] === player) {
					if (canFlyNow) {
						// Can move to any empty spot
						for (let j = 0; j < 24; j++) {
							if (boardState[j] === EMPTY) {
								moves.push({ type: 'move', from: i, to: j });
							}
						}
					} else {
						// Can only move to adjacent empty spots
						const adjacent = getAdjacentMoves(i, boardState);
						for (const adj of adjacent) {
							moves.push({ type: 'move', from: i, to: adj });
						}
					}
				}
			}
		}

		return moves;
	}

	function checkMill(pos: number, player: number, boardState: number[] = board): number[] | null {
		for (const mill of mills) {
			if (mill.includes(pos)) {
				if (mill.every(p => boardState[p] === player)) {
					return mill;
				}
			}
		}
		return null;
	}

	function isInMill(pos: number, boardState: number[] = board): boolean {
		const player = boardState[pos];
		if (player === EMPTY) return false;

		for (const mill of mills) {
			if (mill.includes(pos) && mill.every(p => boardState[p] === player)) {
				return true;
			}
		}
		return false;
	}

	function getRemovablePieces(opponent: number, boardState: number[] = board): number[] {
		const removable: number[] = [];
		const nonMillPieces: number[] = [];

		for (let i = 0; i < 24; i++) {
			if (boardState[i] === opponent) {
				if (!isInMill(i, boardState)) {
					nonMillPieces.push(i);
				}
				removable.push(i);
			}
		}

		// If there are pieces not in mills, can only remove those
		return nonMillPieces.length > 0 ? nonMillPieces : removable;
	}

	function handleClick(pos: number) {
		if (!isPlayerTurn || gameOver) return;

		if (removeMode) {
			// Remove opponent's piece
			if (removablePieces.includes(pos)) {
				board[pos] = EMPTY;
				board = [...board];
				removeMode = false;
				removablePieces = [];
				millHighlight = [];

				if (checkGameOver()) return;

				isPlayerTurn = false;
				updatePhase();
				setTimeout(() => aiMove(), 500);
			}
			return;
		}

		if (phase === 1) {
			// Placing phase
			if (playerHand > 0 && board[pos] === EMPTY) {
				board[pos] = PLAYER;
				board = [...board];
				playerHand--;

				const mill = checkMill(pos, PLAYER);
				if (mill) {
					millHighlight = mill;
					enterRemoveMode();
					return;
				}

				if (checkGameOver()) return;

				isPlayerTurn = false;
				updatePhase();
				setTimeout(() => aiMove(), 500);
			}
		} else {
			// Moving phase
			if (selectedPiece === null) {
				// Select a piece
				if (board[pos] === PLAYER) {
					const moves = canFly(PLAYER)
						? [...Array(24).keys()].filter(i => board[i] === EMPTY)
						: getAdjacentMoves(pos);

					if (moves.length > 0) {
						selectedPiece = pos;
						validMoves = moves;
					}
				}
			} else {
				// Move the piece
				if (validMoves.includes(pos)) {
					board[pos] = PLAYER;
					board[selectedPiece] = EMPTY;
					board = [...board];
					selectedPiece = null;
					validMoves = [];

					const mill = checkMill(pos, PLAYER);
					if (mill) {
						millHighlight = mill;
						enterRemoveMode();
						return;
					}

					if (checkGameOver()) return;

					isPlayerTurn = false;
					setTimeout(() => aiMove(), 500);
				} else if (board[pos] === PLAYER) {
					// Select different piece
					const moves = canFly(PLAYER)
						? [...Array(24).keys()].filter(i => board[i] === EMPTY)
						: getAdjacentMoves(pos);

					if (moves.length > 0) {
						selectedPiece = pos;
						validMoves = moves;
					} else {
						selectedPiece = null;
						validMoves = [];
					}
				} else {
					// Deselect
					selectedPiece = null;
					validMoves = [];
				}
			}
		}
	}

	function enterRemoveMode() {
		removablePieces = getRemovablePieces(AI);
		if (removablePieces.length === 0) {
			// No pieces to remove, continue
			isPlayerTurn = false;
			updatePhase();
			millHighlight = [];
			setTimeout(() => aiMove(), 500);
			return;
		}

		removeMode = true;
	}

	function updatePhase() {
		if (playerHand === 0 && aiHand === 0) {
			phase = 2;
		} else {
			phase = 1;
		}
	}

	function checkGameOver(): boolean {
		const playerPieces = getPlayerPieceCount(PLAYER);
		const aiPieces = getPlayerPieceCount(AI);

		// Check piece count (only after placing phase)
		if (playerHand === 0 && aiHand === 0) {
			if (playerPieces < 3) {
				showVictory(false);
				return true;
			}
			if (aiPieces < 3) {
				showVictory(true);
				return true;
			}

			// Check if current player can move
			const currentPlayer = isPlayerTurn ? PLAYER : AI;
			const moves = getAllMoves(currentPlayer);
			if (moves.length === 0) {
				showVictory(!isPlayerTurn);
				return true;
			}
		}

		return false;
	}

	function showVictory(playerWon: boolean) {
		gameOver = true;
		winner = playerWon ? 'player' : 'ai';

		if (playerWon) {
			trackComplete(GAME_NUMBER);
			setTimeout(() => {
				showWinModal = true;
			}, 800);
		}
	}

	function aiMove() {
		const depth = difficulties[difficulty];
		const result = minimax(
			[...board],
			aiHand,
			playerHand,
			depth,
			-Infinity,
			Infinity,
			true
		);

		if (result.move) {
			executeAIMove(result.move);
		} else {
			// AI has no moves
			showVictory(true);
		}
	}

	function executeAIMove(move: Move) {
		if (move.type === 'place') {
			board[move.to] = AI;
			aiHand--;
		} else if (move.from !== undefined) {
			board[move.to] = AI;
			board[move.from] = EMPTY;
		}
		board = [...board];

		const mill = checkMill(move.to, AI);
		if (mill) {
			millHighlight = mill;

			// AI removes a piece
			const removable = getRemovablePieces(PLAYER);
			if (removable.length > 0) {
				// Choose best piece to remove
				const toRemove = choosePieceToRemove(removable);
				setTimeout(() => {
					board[toRemove] = EMPTY;
					board = [...board];
					millHighlight = [];

					if (checkGameOver()) return;

					isPlayerTurn = true;
					updatePhase();
				}, 400);
				return;
			}
		}

		millHighlight = [];
		if (checkGameOver()) return;

		isPlayerTurn = true;
		updatePhase();
	}

	function choosePieceToRemove(removable: number[]): number {
		// Prefer pieces that would form mills
		let bestPiece = removable[0];
		let bestScore = -Infinity;

		for (const pos of removable) {
			let score = 0;

			// Check if this piece is part of a potential mill
			for (const mill of mills) {
				if (mill.includes(pos)) {
					const playerCount = mill.filter(p => board[p] === PLAYER).length;
					if (playerCount === 2) score += 10; // Block potential mill
					if (playerCount === 1) score += 3;
				}
			}

			// Prefer pieces with fewer adjacent empty spaces (harder to reconnect)
			const adjEmpty = adjacency[pos].filter(a => board[a] === EMPTY).length;
			score += (4 - adjEmpty);

			if (score > bestScore) {
				bestScore = score;
				bestPiece = pos;
			}
		}

		return bestPiece;
	}

	interface MinimaxResult {
		score: number;
		move: Move | null;
	}

	function minimax(
		boardState: number[],
		currentAiHand: number,
		currentPlayerHand: number,
		depth: number,
		alpha: number,
		beta: number,
		isMaximizing: boolean
	): MinimaxResult {
		const aiPieces = boardState.filter(p => p === AI).length;
		const playerPieces = boardState.filter(p => p === PLAYER).length;

		// Terminal conditions
		if (depth === 0) {
			return { score: evaluateBoard(boardState, currentAiHand, currentPlayerHand), move: null };
		}

		if (currentAiHand === 0 && currentPlayerHand === 0) {
			if (aiPieces < 3) return { score: -1000, move: null };
			if (playerPieces < 3) return { score: 1000, move: null };
		}

		const currentPlayer = isMaximizing ? AI : PLAYER;
		const currentHand = isMaximizing ? currentAiHand : currentPlayerHand;
		const moves = getAllMovesForBoard(currentPlayer, boardState, currentHand);

		if (moves.length === 0) {
			return { score: isMaximizing ? -1000 : 1000, move: null };
		}

		let bestMove = moves[0];

		if (isMaximizing) {
			let maxScore = -Infinity;
			for (const move of moves) {
				const { newBoard, newAiHand, newPlayerHand } = simulateMove(
					boardState, move, currentAiHand, currentPlayerHand, AI
				);
				const result = minimax(newBoard, newAiHand, newPlayerHand, depth - 1, alpha, beta, false);
				if (result.score > maxScore) {
					maxScore = result.score;
					bestMove = move;
				}
				alpha = Math.max(alpha, result.score);
				if (beta <= alpha) break;
			}
			return { score: maxScore, move: bestMove };
		} else {
			let minScore = Infinity;
			for (const move of moves) {
				const { newBoard, newAiHand, newPlayerHand } = simulateMove(
					boardState, move, currentAiHand, currentPlayerHand, PLAYER
				);
				const result = minimax(newBoard, newAiHand, newPlayerHand, depth - 1, alpha, beta, true);
				if (result.score < minScore) {
					minScore = result.score;
					bestMove = move;
				}
				beta = Math.min(beta, result.score);
				if (beta <= alpha) break;
			}
			return { score: minScore, move: bestMove };
		}
	}

	function getAllMovesForBoard(player: number, boardState: number[], hand: number): Move[] {
		const moves: Move[] = [];

		if (hand > 0) {
			for (let i = 0; i < 24; i++) {
				if (boardState[i] === EMPTY) {
					moves.push({ type: 'place', to: i });
				}
			}
		} else {
			const pieceCount = boardState.filter(p => p === player).length;
			const canFlyNow = pieceCount === 3;

			for (let i = 0; i < 24; i++) {
				if (boardState[i] === player) {
					if (canFlyNow) {
						for (let j = 0; j < 24; j++) {
							if (boardState[j] === EMPTY) {
								moves.push({ type: 'move', from: i, to: j });
							}
						}
					} else {
						const adjacent = adjacency[i].filter(adj => boardState[adj] === EMPTY);
						for (const adj of adjacent) {
							moves.push({ type: 'move', from: i, to: adj });
						}
					}
				}
			}
		}

		return moves;
	}

	function simulateMove(
		boardState: number[],
		move: Move,
		currentAiHand: number,
		currentPlayerHand: number,
		player: number
	): { newBoard: number[]; newAiHand: number; newPlayerHand: number } {
		const newBoard = [...boardState];
		let newAiHand = currentAiHand;
		let newPlayerHand = currentPlayerHand;

		if (move.type === 'place') {
			newBoard[move.to] = player;
			if (player === AI) newAiHand--;
			else newPlayerHand--;
		} else if (move.from !== undefined) {
			newBoard[move.to] = player;
			newBoard[move.from] = EMPTY;
		}

		// Check for mill and simulate removal
		const mill = checkMill(move.to, player, newBoard);
		if (mill) {
			const opponent = player === AI ? PLAYER : AI;
			const removable = getRemovablePieces(opponent, newBoard);
			if (removable.length > 0) {
				// Remove a random piece for simulation
				newBoard[removable[0]] = EMPTY;
			}
		}

		return { newBoard, newAiHand, newPlayerHand };
	}

	function evaluateBoard(boardState: number[], currentAiHand: number, currentPlayerHand: number): number {
		let score = 0;

		const aiPieces = boardState.filter(p => p === AI).length + currentAiHand;
		const playerPieces = boardState.filter(p => p === PLAYER).length + currentPlayerHand;

		score += (aiPieces - playerPieces) * 10;

		// Count potential mills
		for (const mill of mills) {
			const aiCount = mill.filter(p => boardState[p] === AI).length;
			const playerCount = mill.filter(p => boardState[p] === PLAYER).length;
			const emptyCount = mill.filter(p => boardState[p] === EMPTY).length;

			if (aiCount === 3) score += 50;
			else if (aiCount === 2 && emptyCount === 1) score += 10;
			else if (aiCount === 1 && emptyCount === 2) score += 2;

			if (playerCount === 3) score -= 50;
			else if (playerCount === 2 && emptyCount === 1) score -= 10;
			else if (playerCount === 1 && emptyCount === 2) score -= 2;
		}

		// Mobility
		const aiMoves = getAllMovesForBoard(AI, boardState, currentAiHand).length;
		const playerMoves = getAllMovesForBoard(PLAYER, boardState, currentPlayerHand).length;
		score += (aiMoves - playerMoves);

		return score;
	}

	function newGame() {
		board = new Array(24).fill(EMPTY);
		playerHand = 9;
		aiHand = 9;
		selectedPiece = null;
		validMoves = [];
		isPlayerTurn = true;
		phase = 1;
		removeMode = false;
		removablePieces = [];
		gameOver = false;
		winner = null;
		showWinModal = false;
		millHighlight = [];

		trackStart(GAME_NUMBER);
	}

	function setDifficulty(diff: 'easy' | 'medium' | 'hard') {
		difficulty = diff;
		newGame();
	}

	// Initialize game
	newGame();
</script>

<div class="game">
	<div class="status {statusClass}">{status}</div>
	<div class="phase-indicator">{phaseText}</div>

	<div class="score">
		<div class="player-score">
			<span class="piece-indicator player-piece"></span>
			<span>{t('score.you')}: <strong>{playerOnBoard}</strong></span>
			<span class="pieces-left">({t('score.inHand')}: {playerHand})</span>
		</div>
		<div class="ai-score">
			<span class="piece-indicator ai-piece"></span>
			<span>{t('score.ai')}: <strong>{aiOnBoard}</strong></span>
			<span class="pieces-left">({t('score.inHand')}: {aiHand})</span>
		</div>
	</div>

	<div class="board-wrapper">
		<div class="board">
			<svg class="board-lines" viewBox="0 0 300 300">
				<!-- Outer square -->
				<rect x="10" y="10" width="280" height="280" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
				<!-- Middle square -->
				<rect x="57" y="57" width="186" height="186" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
				<!-- Inner square -->
				<rect x="104" y="104" width="92" height="92" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
				<!-- Connecting lines -->
				<line x1="150" y1="10" x2="150" y2="104" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
				<line x1="150" y1="196" x2="150" y2="290" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
				<line x1="10" y1="150" x2="104" y2="150" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
				<line x1="196" y1="150" x2="290" y2="150" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
			</svg>
			<div class="points">
				{#each positions as pos, index}
					<button
						class="point"
						class:valid-move={validMoves.includes(index)}
						class:can-remove={removablePieces.includes(index)}
						class:mill-highlight={millHighlight.includes(index)}
						style="left: {pos.x}px; top: {pos.y}px;"
						onclick={() => handleClick(index)}
						aria-label="Position {index}"
					>
						{#if board[index] !== EMPTY}
							<div
								class="piece"
								class:player={board[index] === PLAYER}
								class:ai={board[index] === AI}
								class:selected={selectedPiece === index}
								class:can-remove={removeMode && removablePieces.includes(index)}
								class:in-mill={isInMill(index)}
							></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="difficulty">
		<span>{t('difficulty.label')}:</span>
		<button
			class="diff-btn"
			class:active={difficulty === 'easy'}
			onclick={() => setDifficulty('easy')}
		>
			{t('difficulty.easy')}
		</button>
		<button
			class="diff-btn"
			class:active={difficulty === 'medium'}
			onclick={() => setDifficulty('medium')}
		>
			{t('difficulty.medium')}
		</button>
		<button
			class="diff-btn"
			class:active={difficulty === 'hard'}
			onclick={() => setDifficulty('hard')}
		>
			{t('difficulty.hard')}
		</button>
	</div>

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
		margin-bottom: 8px;
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

	.status.thinking {
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
	}

	.status.remove-mode {
		background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
	}

	.phase-indicator {
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.85rem;
		margin-bottom: 15px;
	}

	.score {
		display: flex;
		justify-content: center;
		gap: 30px;
		margin-bottom: 15px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
		flex-wrap: wrap;
	}

	.player-score, .ai-score {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.piece-indicator {
		width: 16px;
		height: 16px;
		border-radius: 50%;
	}

	.piece-indicator.player-piece {
		background: radial-gradient(circle at 30% 30%, #4a4a4a, #1a1a1a);
		border: 2px solid #333;
	}

	.piece-indicator.ai-piece {
		background: radial-gradient(circle at 30% 30%, #fff, #d4d4d4);
		border: 2px solid #aaa;
	}

	.score strong {
		color: #8b5cf6;
	}

	.pieces-left {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.board-wrapper {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
		width: 100%;
	}

	.board {
		position: relative;
		width: 300px;
		height: 300px;
		background: linear-gradient(145deg, #2d2d4a, #1a1a2e);
		border-radius: 12px;
		box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.board-lines {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.points {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.point {
		position: absolute;
		width: 44px;
		height: 44px;
		margin-left: -22px;
		margin-top: -22px;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		background: transparent;
		border: none;
		padding: 0;
	}

	.point::before {
		content: '';
		position: absolute;
		width: 12px;
		height: 12px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		transition: all 0.2s;
	}

	.point:active::before {
		transform: scale(1.3);
	}

	.point.valid-move::before {
		background: rgba(34, 197, 94, 0.6);
		box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
	}

	.point.can-remove::before {
		background: rgba(239, 68, 68, 0.6);
		box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
		width: 16px;
		height: 16px;
	}

	.point.mill-highlight {
		animation: mill-pulse 0.5s ease-in-out 3;
	}

	@keyframes mill-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.5); }
		50% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
	}

	.piece {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		position: absolute;
		transition: all 0.2s;
		z-index: 1;
	}

	.piece.player {
		background: radial-gradient(circle at 30% 30%, #4a4a4a, #1a1a1a);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.3);
		border: 2px solid #333;
	}

	.piece.ai {
		background: radial-gradient(circle at 30% 30%, #fff, #d4d4d4);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.1);
		border: 2px solid #aaa;
	}

	.piece.selected {
		transform: scale(1.15);
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.8), 0 5px 15px rgba(0, 0, 0, 0.4);
	}

	.piece.can-remove {
		animation: shake 0.3s ease-in-out infinite;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-2px); }
		75% { transform: translateX(2px); }
	}

	.piece.in-mill {
		box-shadow: 0 0 15px rgba(139, 92, 246, 0.6), 0 3px 8px rgba(0, 0, 0, 0.4);
	}

	.difficulty {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 20px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.difficulty span {
		font-size: 0.85rem;
		color: white;
	}

	.diff-btn {
		padding: 8px 16px;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		color: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 20px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.diff-btn.active {
		background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
		color: white;
		border-color: transparent;
	}

	.diff-btn:active {
		transform: scale(0.95);
	}

	.controls {
		margin-bottom: 20px;
	}

	.btn {
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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
		padding: 6px 0;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
		padding-left: 20px;
		position: relative;
	}

	.rules li::before {
		content: '';
		position: absolute;
		left: 0;
		color: #8b5cf6;
	}

	@media (max-width: 360px) {
		.board {
			width: 280px;
			height: 280px;
		}

		.point {
			width: 40px;
			height: 40px;
			margin-left: -20px;
			margin-top: -20px;
		}

		.piece {
			width: 32px;
			height: 32px;
		}

		.score {
			gap: 15px;
		}
	}
</style>
