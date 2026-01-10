<script lang="ts">
	import type { Translations } from '$lib/i18n';
	import { trackStart, trackComplete, recordWin, getNickname } from '$lib/api';
	import WinModal from '$lib/components/WinModal.svelte';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		translations: Translations;
	}

	let { translations }: Props = $props();

	// Game constants
	const GAME_NUMBER = '25';
	const GRID_SIZE = 10;
	const API_BASE = 'https://puzzlesapi.azurewebsites.net/api/game/25';

	// Standard battleship fleet
	const FLEET = [
		{ name: 'Carrier', length: 5 },
		{ name: 'Battleship', length: 4 },
		{ name: 'Cruiser', length: 3 },
		{ name: 'Submarine', length: 3 },
		{ name: 'Destroyer', length: 2 }
	];

	// Point structure options
	const POINT_OPTIONS = [
		{ winnerPoints: 5, loserPoints: 2, label: 'highStakes' },
		{ winnerPoints: 4, loserPoints: 1, label: 'mediumStakes' },
		{ winnerPoints: 3, loserPoints: 0, label: 'lowStakes' }
	];

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

	// Types
	interface Ship {
		x: number;
		y: number;
		length: number;
		horizontal: boolean;
	}

	interface Shot {
		x: number;
		y: number;
		hit: boolean;
	}

	interface GameState {
		gameId: string;
		status: 'open' | 'placing' | 'playing' | 'ended';
		creatorName: string;
		joinerName: string | null;
		winnerPoints: number;
		loserPoints: number;
		yourRole: 'creator' | 'joiner';
		yourShips: Ship[] | null;
		opponentShips: Ship[] | null;
		yourShots: Shot[];
		opponentShots: Shot[];
		currentTurn: 'creator' | 'joiner';
		isYourTurn: boolean;
		winner: 'creator' | 'joiner' | null;
		youWon: boolean | null;
	}

	interface OpenGame {
		gameId: string;
		creatorName: string;
		winnerPoints: number;
		loserPoints: number;
		createdAt: string;
	}

	// UI phase
	type Phase = 'menu' | 'creating' | 'waiting' | 'joining' | 'placing' | 'playing' | 'ended';

	// State
	let phase = $state<Phase>('menu');
	let gameId = $state<string | null>(null);
	let playerToken = $state<string | null>(null);
	let gameState = $state<GameState | null>(null);
	let openGames = $state<OpenGame[]>([]);
	let selectedPointOption = $state(1); // Default to medium stakes
	let loading = $state(false);
	let error = $state<string | null>(null);
	let pollInterval = $state<number | null>(null);
	let showWinModal = $state(false);

	// Ship placement state
	let placingShips = $state<Ship[]>([]);
	let currentShipIndex = $state(0);
	let shipHorizontal = $state(true);
	let placementPreview = $state<{ x: number; y: number } | null>(null);

	// Get player name
	let playerName = $derived(getNickname() || 'Player');

	// Derived: current ship being placed
	let currentShip = $derived(
		currentShipIndex < FLEET.length ? FLEET[currentShipIndex] : null
	);

	// Derived: opponent name
	let opponentName = $derived(
		gameState
			? gameState.yourRole === 'creator'
				? gameState.joinerName
				: gameState.creatorName
			: null
	);

	// Clean up polling on destroy
	onDestroy(() => {
		stopPolling();
	});

	// ============ API Functions ============

	async function createGame(): Promise<void> {
		loading = true;
		error = null;
		const option = POINT_OPTIONS[selectedPointOption];

		try {
			const response = await fetch(`${API_BASE}/create`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					creatorName: playerName,
					winnerPoints: option.winnerPoints,
					loserPoints: option.loserPoints
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to create game');
			}

			const data = await response.json();
			gameId = data.gameId;
			playerToken = data.playerToken;
			phase = 'waiting';
			startPolling();
			trackStart(GAME_NUMBER);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create game';
		} finally {
			loading = false;
		}
	}

	async function fetchOpenGames(): Promise<void> {
		loading = true;
		error = null;

		try {
			const response = await fetch(`${API_BASE}/open`);
			if (!response.ok) throw new Error('Failed to fetch games');

			const data = await response.json();
			openGames = data.games || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch games';
			openGames = [];
		} finally {
			loading = false;
		}
	}

	async function joinGame(id: string): Promise<void> {
		loading = true;
		error = null;

		try {
			const response = await fetch(`${API_BASE}/${id}/join`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ joinerName: playerName })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to join game');
			}

			const data = await response.json();
			gameId = id;
			playerToken = data.playerToken;
			gameState = data.state;
			phase = 'placing';
			resetShipPlacement();
			startPolling();
			trackStart(GAME_NUMBER);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to join game';
		} finally {
			loading = false;
		}
	}

	async function fetchGameState(): Promise<void> {
		if (!gameId || !playerToken) return;

		try {
			const response = await fetch(
				`${API_BASE}/${gameId}/state?playerToken=${playerToken}`
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to fetch state');
			}

			const data: GameState = await response.json();
			gameState = data;

			// Update phase based on status
			if (data.status === 'placing' && phase === 'waiting') {
				phase = 'placing';
				resetShipPlacement();
			} else if (data.status === 'playing' && phase === 'placing') {
				phase = 'playing';
			} else if (data.status === 'ended' && phase !== 'ended') {
				phase = 'ended';
				stopPolling();
				handleGameEnd();
			}
		} catch (err) {
			console.error('Failed to fetch game state:', err);
		}
	}

	async function submitShips(): Promise<void> {
		if (!gameId || !playerToken) return;
		loading = true;
		error = null;

		try {
			const response = await fetch(`${API_BASE}/${gameId}/ships`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					playerToken,
					ships: placingShips
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to submit ships');
			}

			const data: GameState = await response.json();
			gameState = data;

			if (data.status === 'playing') {
				phase = 'playing';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to submit ships';
		} finally {
			loading = false;
		}
	}

	async function shoot(x: number, y: number): Promise<void> {
		if (!gameId || !playerToken || !gameState?.isYourTurn) return;

		// Check if already shot here
		if (gameState.yourShots.some((s) => s.x === x && s.y === y)) return;

		loading = true;
		error = null;

		try {
			const response = await fetch(`${API_BASE}/${gameId}/shoot`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ playerToken, x, y })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to shoot');
			}

			const data: GameState = await response.json();
			gameState = data;

			if (data.status === 'ended') {
				phase = 'ended';
				stopPolling();
				handleGameEnd();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to shoot';
		} finally {
			loading = false;
		}
	}

	async function cancelGame(): Promise<void> {
		if (!gameId || !playerToken) return;

		try {
			await fetch(`${API_BASE}/${gameId}/cancel`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ playerToken })
			});
		} catch {
			// Ignore errors
		}

		resetGame();
	}

	// ============ Polling ============

	function startPolling(): void {
		stopPolling();
		// Poll every 2 seconds during play, 3 seconds while waiting
		const interval = phase === 'playing' ? 2000 : 3000;
		pollInterval = window.setInterval(fetchGameState, interval);
	}

	function stopPolling(): void {
		if (pollInterval !== null) {
			window.clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	// ============ Ship Placement ============

	function resetShipPlacement(): void {
		placingShips = [];
		currentShipIndex = 0;
		shipHorizontal = true;
		placementPreview = null;
	}

	function canPlaceShip(x: number, y: number, length: number, horizontal: boolean): boolean {
		// Check bounds
		if (horizontal) {
			if (x + length > GRID_SIZE) return false;
		} else {
			if (y + length > GRID_SIZE) return false;
		}

		// Get all cells this ship would occupy
		const cells: [number, number][] = [];
		for (let i = 0; i < length; i++) {
			const cx = horizontal ? x + i : x;
			const cy = horizontal ? y : y + i;
			cells.push([cx, cy]);
		}

		// Check each cell and its neighbors for existing ships
		for (const [cx, cy] of cells) {
			for (let dx = -1; dx <= 1; dx++) {
				for (let dy = -1; dy <= 1; dy++) {
					const nx = cx + dx;
					const ny = cy + dy;
					if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

					// Check if any placed ship occupies this neighbor cell
					for (const ship of placingShips) {
						for (let i = 0; i < ship.length; i++) {
							const sx = ship.horizontal ? ship.x + i : ship.x;
							const sy = ship.horizontal ? ship.y : ship.y + i;
							if (sx === nx && sy === ny) return false;
						}
					}
				}
			}
		}

		return true;
	}

	function placeShip(x: number, y: number): void {
		if (!currentShip) return;
		if (!canPlaceShip(x, y, currentShip.length, shipHorizontal)) return;

		placingShips = [
			...placingShips,
			{
				x,
				y,
				length: currentShip.length,
				horizontal: shipHorizontal
			}
		];
		currentShipIndex++;
		placementPreview = null;
	}

	function undoLastShip(): void {
		if (placingShips.length === 0) return;
		placingShips = placingShips.slice(0, -1);
		currentShipIndex--;
	}

	function toggleOrientation(): void {
		shipHorizontal = !shipHorizontal;
		placementPreview = null;
	}

	function handlePlacementHover(x: number, y: number): void {
		placementPreview = { x, y };
	}

	function handlePlacementLeave(): void {
		placementPreview = null;
	}

	// Check if a cell is occupied by a placed ship
	function isShipCell(x: number, y: number, ships: Ship[]): boolean {
		for (const ship of ships) {
			for (let i = 0; i < ship.length; i++) {
				const sx = ship.horizontal ? ship.x + i : ship.x;
				const sy = ship.horizontal ? ship.y : ship.y + i;
				if (sx === x && sy === y) return true;
			}
		}
		return false;
	}

	// Get preview cells for current ship placement
	function getPreviewCells(): { x: number; y: number; valid: boolean }[] {
		if (!currentShip || !placementPreview) return [];
		const cells: { x: number; y: number; valid: boolean }[] = [];
		const valid = canPlaceShip(
			placementPreview.x,
			placementPreview.y,
			currentShip.length,
			shipHorizontal
		);

		for (let i = 0; i < currentShip.length; i++) {
			const x = shipHorizontal ? placementPreview.x + i : placementPreview.x;
			const y = shipHorizontal ? placementPreview.y : placementPreview.y + i;
			if (x < GRID_SIZE && y < GRID_SIZE) {
				cells.push({ x, y, valid });
			}
		}
		return cells;
	}

	// ============ Game End ============

	async function handleGameEnd(): Promise<void> {
		if (!gameState) return;

		trackComplete(GAME_NUMBER);

		// Record win/loss to leaderboard
		if (gameState.youWon) {
			await recordWin(GAME_NUMBER, playerName, gameState.winnerPoints);
			setTimeout(() => {
				showWinModal = true;
			}, 500);
		} else {
			// Record loss (negative points)
			if (gameState.loserPoints > 0) {
				await recordWin(GAME_NUMBER, playerName, -gameState.loserPoints);
			}
		}
	}

	// ============ Reset ============

	function resetGame(): void {
		stopPolling();
		phase = 'menu';
		gameId = null;
		playerToken = null;
		gameState = null;
		openGames = [];
		loading = false;
		error = null;
		showWinModal = false;
		resetShipPlacement();
	}

	// ============ UI Helpers ============

	function goToJoin(): void {
		phase = 'joining';
		fetchOpenGames();
	}

	function goToCreate(): void {
		phase = 'creating';
	}

	function goBack(): void {
		if (phase === 'creating' || phase === 'joining') {
			phase = 'menu';
		} else if (phase === 'waiting') {
			cancelGame();
		}
	}

	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return t('time.justNow');
		if (diffMins === 1) return t('time.oneMinuteAgo');
		return t('time.minutesAgo').replace('{n}', diffMins.toString());
	}

	function getStakesLabel(option: typeof POINT_OPTIONS[0]): string {
		return `+${option.winnerPoints} / -${option.loserPoints}`;
	}
</script>

<div class="game">
	{#if phase === 'menu'}
		<!-- Main Menu -->
		<div class="menu">
			<h2>{t('menu.title')}</h2>
			<p class="menu-subtitle">{t('menu.subtitle')}</p>

			<div class="menu-buttons">
				<button class="btn btn-primary" onclick={goToCreate}>
					{t('menu.createGame')}
				</button>
				<button class="btn btn-secondary" onclick={goToJoin}>
					{t('menu.joinGame')}
				</button>
			</div>
		</div>
	{:else if phase === 'creating'}
		<!-- Create Game - Select Stakes -->
		<div class="create-game">
			<button class="back-btn" onclick={goBack}>&larr; {t('back')}</button>

			<h2>{t('create.title')}</h2>
			<p class="subtitle">{t('create.selectStakes')}</p>

			<div class="stakes-options">
				{#each POINT_OPTIONS as option, i}
					<button
						class="stakes-option"
						class:selected={selectedPointOption === i}
						onclick={() => (selectedPointOption = i)}
					>
						<span class="stakes-label">{t(`stakes.${option.label}`)}</span>
						<span class="stakes-points">{getStakesLabel(option)}</span>
					</button>
				{/each}
			</div>

			<button
				class="btn btn-primary"
				onclick={createGame}
				disabled={loading}
			>
				{loading ? t('loading') : t('create.start')}
			</button>

			{#if error}
				<p class="error">{error}</p>
			{/if}
		</div>
	{:else if phase === 'waiting'}
		<!-- Waiting for Opponent -->
		<div class="waiting">
			<button class="back-btn" onclick={goBack}>&larr; {t('cancel')}</button>

			<div class="waiting-content">
				<div class="spinner"></div>
				<h2>{t('waiting.title')}</h2>
			</div>
		</div>
	{:else if phase === 'joining'}
		<!-- Join Game - List Open Games -->
		<div class="join-game">
			<button class="back-btn" onclick={goBack}>&larr; {t('back')}</button>

			<h2>{t('join.title')}</h2>

			{#if loading}
				<div class="spinner"></div>
			{:else if openGames.length === 0}
				<p class="no-games">{t('join.noGames')}</p>
				<button class="btn btn-secondary" onclick={fetchOpenGames}>
					{t('join.refresh')}
				</button>
			{:else}
				<div class="game-list">
					{#each openGames as game}
						<button class="game-item" onclick={() => joinGame(game.gameId)}>
							<div class="game-item-left">
								<span class="creator-name">{game.creatorName}</span>
								<span class="game-time">{formatTime(game.createdAt)}</span>
							</div>
							<div class="game-item-right">
								<span class="game-stakes">+{game.winnerPoints} / -{game.loserPoints}</span>
							</div>
						</button>
					{/each}
				</div>
				<button class="btn btn-secondary refresh-btn" onclick={fetchOpenGames}>
					{t('join.refresh')}
				</button>
			{/if}

			{#if error}
				<p class="error">{error}</p>
			{/if}
		</div>
	{:else if phase === 'placing'}
		<!-- Ship Placement Phase -->
		<div class="placing">
			<div class="phase-header">
				<span class="opponent-label">
					{#if gameState?.joinerName || gameState?.yourRole === 'joiner'}
						{t('placing.vs')} {opponentName || t('placing.waitingOpponent')}
					{:else}
						{t('placing.waitingOpponent')}
					{/if}
				</span>
			</div>

			<h2>{t('placing.title')}</h2>

			{#if currentShip}
				<p class="placing-instruction">
					{t('placing.placeShip')}: <strong>{currentShip.name}</strong> ({currentShip.length})
				</p>
			{:else}
				<p class="placing-instruction">{t('placing.allPlaced')}</p>
			{/if}

			<div class="placement-grid">
				{#each { length: GRID_SIZE } as _, y}
					<div class="grid-row">
						{#each { length: GRID_SIZE } as _, x}
							{@const isPlaced = isShipCell(x, y, placingShips)}
							{@const previewCells = getPreviewCells()}
							{@const previewCell = previewCells.find((c) => c.x === x && c.y === y)}
							<button
								class="cell"
								class:ship={isPlaced}
								class:preview={previewCell !== undefined}
								class:valid={previewCell?.valid}
								class:invalid={previewCell !== undefined && !previewCell.valid}
								onclick={() => placeShip(x, y)}
								onmouseenter={() => handlePlacementHover(x, y)}
								onmouseleave={handlePlacementLeave}
								disabled={!currentShip}
							></button>
						{/each}
					</div>
				{/each}
			</div>

			<div class="placement-controls">
				<button class="btn btn-small" onclick={toggleOrientation} disabled={!currentShip}>
					{shipHorizontal ? t('placing.horizontal') : t('placing.vertical')}
				</button>
				<button
					class="btn btn-small btn-secondary"
					onclick={undoLastShip}
					disabled={placingShips.length === 0}
				>
					{t('placing.undo')}
				</button>
			</div>

			{#if currentShipIndex >= FLEET.length}
				<button
					class="btn btn-primary"
					onclick={submitShips}
					disabled={loading}
				>
					{loading ? t('loading') : t('placing.ready')}
				</button>

				{#if gameState?.yourShips}
					<p class="waiting-opponent">{t('placing.waitingForOpponent')}</p>
				{/if}
			{/if}

			{#if error}
				<p class="error">{error}</p>
			{/if}
		</div>
	{:else if phase === 'playing'}
		<!-- Battle Phase -->
		<div class="battle">
			<div class="battle-header">
				<span class="opponent-name">{t('battle.vs')} {opponentName}</span>
				<span class="turn-indicator" class:your-turn={gameState?.isYourTurn}>
					{gameState?.isYourTurn ? t('battle.yourTurn') : t('battle.opponentTurn')}
				</span>
			</div>

			<!-- Opponent's Board (where you shoot) -->
			<div class="board-section">
				<h3>{t('battle.opponentBoard')}</h3>
				<div class="battle-grid opponent-board">
					{#each { length: GRID_SIZE } as _, y}
						<div class="grid-row">
							{#each { length: GRID_SIZE } as _, x}
								{@const shot = gameState?.yourShots.find((s) => s.x === x && s.y === y)}
								<button
									class="cell"
									class:hit={shot?.hit}
									class:miss={shot !== undefined && !shot.hit}
									onclick={() => shoot(x, y)}
									disabled={!gameState?.isYourTurn || shot !== undefined || loading}
								></button>
							{/each}
						</div>
					{/each}
				</div>
			</div>

			<!-- Your Board (shows your ships and opponent's shots) -->
			<div class="board-section your-board-section">
				<h3>{t('battle.yourBoard')}</h3>
				<div class="battle-grid your-board">
					{#each { length: GRID_SIZE } as _, y}
						<div class="grid-row">
							{#each { length: GRID_SIZE } as _, x}
								{@const isShip = gameState?.yourShips
									? isShipCell(x, y, gameState.yourShips)
									: false}
								{@const opponentShot = gameState?.opponentShots.find(
									(s) => s.x === x && s.y === y
								)}
								<div
									class="cell"
									class:ship={isShip}
									class:hit={opponentShot?.hit}
									class:miss={opponentShot !== undefined && !opponentShot.hit}
								></div>
							{/each}
						</div>
					{/each}
				</div>
			</div>

			{#if error}
				<p class="error">{error}</p>
			{/if}
		</div>
	{:else if phase === 'ended'}
		<!-- Game Ended -->
		<div class="ended">
			<h2 class="result" class:won={gameState?.youWon} class:lost={!gameState?.youWon}>
				{gameState?.youWon ? t('ended.youWon') : t('ended.youLost')}
			</h2>

			<p class="points-change">
				{#if gameState?.youWon}
					+{gameState.winnerPoints} {t('ended.points')}
				{:else if gameState && gameState.loserPoints > 0}
					-{gameState.loserPoints} {t('ended.points')}
				{/if}
			</p>

			<!-- Show both boards -->
			<div class="final-boards">
				<div class="board-section">
					<h3>{t('ended.yourShips')}</h3>
					<div class="battle-grid small-grid">
						{#each { length: GRID_SIZE } as _, y}
							<div class="grid-row">
								{#each { length: GRID_SIZE } as _, x}
									{@const isShip = gameState?.yourShips
										? isShipCell(x, y, gameState.yourShips)
										: false}
									{@const shot = gameState?.opponentShots.find(
										(s) => s.x === x && s.y === y
									)}
									<div
										class="cell"
										class:ship={isShip}
										class:hit={shot?.hit}
										class:miss={shot !== undefined && !shot.hit}
									></div>
								{/each}
							</div>
						{/each}
					</div>
				</div>

				<div class="board-section">
					<h3>{t('ended.opponentShips')}</h3>
					<div class="battle-grid small-grid">
						{#each { length: GRID_SIZE } as _, y}
							<div class="grid-row">
								{#each { length: GRID_SIZE } as _, x}
									{@const isShip = gameState?.opponentShips
										? isShipCell(x, y, gameState.opponentShips)
										: false}
									{@const shot = gameState?.yourShots.find(
										(s) => s.x === x && s.y === y
									)}
									<div
										class="cell"
										class:ship={isShip}
										class:hit={shot?.hit}
										class:miss={shot !== undefined && !shot.hit}
									></div>
								{/each}
							</div>
						{/each}
					</div>
				</div>
			</div>

			<button class="btn btn-primary" onclick={resetGame}>
				{t('ended.playAgain')}
			</button>
		</div>
	{/if}
</div>

<WinModal
	isOpen={showWinModal}
	points={gameState?.winnerPoints || 3}
	gameNumber={GAME_NUMBER}
	onClose={() => {
		showWinModal = false;
		resetGame();
	}}
/>

<style>
	.game {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 10px;
	}

	/* Menu */
	.menu {
		text-align: center;
		padding: 40px 20px;
	}

	.menu h2 {
		font-size: 1.5rem;
		margin-bottom: 10px;
		color: white;
	}

	.menu-subtitle {
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 30px;
	}

	.menu-buttons {
		display: flex;
		flex-direction: column;
		gap: 15px;
		width: 100%;
		max-width: 280px;
		margin: 0 auto;
	}

	/* Buttons */
	.btn {
		padding: 14px 28px;
		font-size: 1rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		border: none;
		border-radius: 25px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.btn-primary {
		background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
		color: white;
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
	}

	.btn-small {
		padding: 10px 20px;
		font-size: 0.9rem;
	}

	.back-btn {
		align-self: flex-start;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
		cursor: pointer;
		padding: 8px 0;
		margin-bottom: 15px;
	}

	.back-btn:hover {
		color: white;
	}

	/* Create Game */
	.create-game {
		width: 100%;
		max-width: 350px;
	}

	.create-game h2,
	.join-game h2 {
		text-align: center;
		margin-bottom: 10px;
		color: white;
	}

	.subtitle {
		text-align: center;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 20px;
	}

	.stakes-options {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 25px;
	}

	.stakes-option {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px 20px;
		background: rgba(255, 255, 255, 0.08);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.stakes-option.selected {
		border-color: #8b5cf6;
		background: rgba(139, 92, 246, 0.15);
	}

	.stakes-label {
		color: white;
		font-weight: 500;
	}

	.stakes-points {
		color: rgba(255, 255, 255, 0.7);
		font-family: monospace;
	}

	/* Waiting */
	.waiting {
		width: 100%;
		max-width: 350px;
	}

	.waiting-content {
		text-align: center;
		padding: 40px 20px;
	}

	.waiting h2 {
		margin: 20px 0 15px;
		color: white;
	}

	.game-code {
		font-size: 1.1rem;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 15px;
	}

	.game-code strong {
		font-family: monospace;
		font-size: 1.4rem;
		color: #8b5cf6;
		letter-spacing: 2px;
	}

	.waiting-hint {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.85rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: #8b5cf6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Join Game */
	.join-game {
		width: 100%;
		max-width: 400px;
	}

	.no-games {
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
		padding: 30px;
	}

	.game-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
	}

	.game-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px 20px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.game-item:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.game-item-left {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.creator-name {
		color: white;
		font-weight: 500;
	}

	.game-time {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.8rem;
	}

	.game-stakes {
		color: rgba(255, 255, 255, 0.7);
		font-family: monospace;
	}

	.refresh-btn {
		display: block;
		margin: 0 auto;
	}

	/* Ship Placement */
	.placing {
		width: 100%;
		max-width: 400px;
	}

	.phase-header {
		text-align: center;
		margin-bottom: 15px;
	}

	.opponent-label {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
	}

	.placing h2 {
		text-align: center;
		color: white;
		margin-bottom: 10px;
	}

	.placing-instruction {
		text-align: center;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 15px;
	}

	.placing-instruction strong {
		color: #8b5cf6;
	}

	.placement-grid,
	.battle-grid {
		display: flex;
		flex-direction: column;
		gap: 2px;
		background: rgba(255, 255, 255, 0.05);
		padding: 8px;
		border-radius: 12px;
		margin-bottom: 15px;
	}

	.grid-row {
		display: flex;
		gap: 2px;
	}

	.cell {
		width: 32px;
		height: 32px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.cell:disabled {
		cursor: default;
	}

	.cell.ship {
		background: linear-gradient(145deg, rgba(96, 165, 250, 0.6) 0%, rgba(59, 130, 246, 0.4) 100%);
		border-color: rgba(96, 165, 250, 0.6);
	}

	.cell.preview.valid {
		background: rgba(34, 197, 94, 0.3);
		border-color: rgba(34, 197, 94, 0.5);
	}

	.cell.preview.invalid {
		background: rgba(239, 68, 68, 0.3);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.cell.hit {
		background: rgba(239, 68, 68, 0.6) !important;
		border-color: rgba(239, 68, 68, 0.8) !important;
	}

	.cell.hit::after {
		content: '✕';
		color: white;
		font-size: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.cell.miss {
		background: rgba(56, 189, 248, 0.2);
		border-color: rgba(56, 189, 248, 0.4);
	}

	.cell.miss::after {
		content: '○';
		color: rgba(56, 189, 248, 0.8);
		font-size: 0.8rem;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.placement-controls {
		display: flex;
		gap: 10px;
		justify-content: center;
		margin-bottom: 15px;
	}

	.waiting-opponent {
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
		margin-top: 15px;
		font-size: 0.9rem;
	}

	/* Battle Phase */
	.battle {
		width: 100%;
		max-width: 400px;
	}

	.battle-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
		padding: 10px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 10px;
	}

	.opponent-name {
		color: white;
		font-weight: 500;
	}

	.turn-indicator {
		padding: 6px 12px;
		border-radius: 15px;
		font-size: 0.85rem;
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
	}

	.turn-indicator.your-turn {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.board-section {
		margin-bottom: 20px;
	}

	.board-section h3 {
		text-align: center;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.9rem;
		margin-bottom: 8px;
	}

	.your-board-section .battle-grid {
		opacity: 0.8;
	}

	.your-board .cell {
		cursor: default;
	}

	.opponent-board .cell:not(:disabled):hover {
		background: rgba(255, 255, 255, 0.15);
	}

	/* Game Ended */
	.ended {
		width: 100%;
		max-width: 400px;
		text-align: center;
	}

	.result {
		font-size: 1.8rem;
		margin-bottom: 10px;
	}

	.result.won {
		color: #22c55e;
	}

	.result.lost {
		color: #ef4444;
	}

	.points-change {
		font-size: 1.2rem;
		margin-bottom: 20px;
		color: rgba(255, 255, 255, 0.8);
	}

	.final-boards {
		display: flex;
		gap: 15px;
		justify-content: center;
		margin-bottom: 25px;
		flex-wrap: wrap;
	}

	.small-grid {
		transform: scale(0.8);
		transform-origin: top center;
	}

	.small-grid .cell {
		width: 24px;
		height: 24px;
	}

	/* Error */
	.error {
		color: #ef4444;
		text-align: center;
		margin-top: 15px;
		font-size: 0.9rem;
	}
</style>
