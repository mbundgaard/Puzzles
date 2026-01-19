<script lang="ts">
	import { onMount } from 'svelte';
	import type { Translations } from '$lib/i18n';
	import { trackStart, trackComplete, recordWin } from '$lib/api';
	import WinModal from '$lib/components/WinModal.svelte';

	interface Props {
		translations: Translations;
	}

	let { translations }: Props = $props();

	// Win modal state
	let showWinModal = $state(false);
	const GAME_NUMBER = '24';

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

	// Puzzle data types
	interface PieceData {
		id: string;
		color: string;
		points: number[][];
	}

	interface TargetShape {
		points: number[][];
		width: number;
		height: number;
	}

	interface PuzzleData {
		id: string;
		name: string;
		description: string;
		difficulty: 'easy' | 'medium' | 'hard';
		points: number;
		targetShape: TargetShape;
		pieces: PieceData[];
	}

	interface Piece {
		data: PieceData;
		x: number;
		y: number;
		rotation: number;
		center: { x: number; y: number };
	}

	// All puzzle definitions embedded directly
	const PUZZLES: PuzzleData[] = [
		{
			id: "t-lille",
			name: "Mini T",
			description: "Saml fire dele til et T",
			difficulty: "easy",
			points: 1,
			targetShape: {
				points: [[0,0], [150,0], [150,50], [100,50], [100,180], [50,180], [50,50], [0,50]],
				width: 150,
				height: 180
			},
			pieces: [
				{ id: "p1", color: "#ef4444", points: [[0,0], [50,50], [0,50]] },
				{ id: "p2", color: "#22c55e", points: [[0,0], [70,0], [120,50], [100,50], [100,100]] },
				{ id: "p3", color: "#3b82f6", points: [[70,0], [150,0], [150,50], [120,50]] },
				{ id: "p4", color: "#f59e0b", points: [[50,50], [100,100], [100,180], [50,180]] }
			]
		},
		{
			id: "pil",
			name: "Pilen",
			description: "Saml fem dele til en pil",
			difficulty: "easy",
			points: 1,
			targetShape: {
				points: [[0,60], [120,60], [120,0], [200,100], [120,200], [120,140], [0,140]],
				width: 200,
				height: 200
			},
			pieces: [
				{ id: "p1", color: "#ef4444", points: [[0,60], [80,60], [80,140], [0,140]] },
				{ id: "p2", color: "#22c55e", points: [[80,60], [120,60], [120,100], [80,100]] },
				{ id: "p3", color: "#3b82f6", points: [[80,100], [120,100], [120,140], [80,140]] },
				{ id: "p4", color: "#f59e0b", points: [[120,0], [200,100], [120,100], [120,60]] },
				{ id: "p5", color: "#a855f7", points: [[120,100], [200,100], [120,200], [120,140]] }
			]
		},
		{
			id: "klassisk",
			name: "Klassisk",
			description: "Den klassiske tangram med syv dele",
			difficulty: "medium",
			points: 3,
			targetShape: {
				points: [[0,0], [200,0], [200,200], [0,200]],
				width: 200,
				height: 200
			},
			pieces: [
				{ id: "p1", color: "#f97316", points: [[0,0], [100,100], [0,200]] },
				{ id: "p2", color: "#ef4444", points: [[0,0], [200,0], [100,100]] },
				{ id: "p3", color: "#22c55e", points: [[150,50], [200,0], [200,100]] },
				{ id: "p4", color: "#a855f7", points: [[100,100], [150,50], [200,100], [150,150]] },
				{ id: "p5", color: "#38bdf8", points: [[50,150], [100,100], [150,150]] },
				{ id: "p6", color: "#475569", points: [[0,200], [50,150], [150,150], [100,200]] },
				{ id: "p7", color: "#eab308", points: [[100,200], [200,100], [200,200]] }
			]
		},
		{
			id: "fem-dele",
			name: "Fem Dele",
			description: "Saml fem dele til en firkant",
			difficulty: "medium",
			points: 3,
			targetShape: {
				points: [[0,0], [200,0], [200,200], [0,200]],
				width: 200,
				height: 200
			},
			pieces: [
				{ id: "p1", color: "#ef4444", points: [[0,0], [150,0], [75,75], [0,150]] },
				{ id: "p2", color: "#22c55e", points: [[75,75], [150,0], [200,0], [200,50], [125,125]] },
				{ id: "p3", color: "#06b6d4", points: [[0,150], [50,150], [50,200], [0,200]] },
				{ id: "p4", color: "#3b82f6", points: [[0,150], [75,75], [125,125], [200,200], [50,200], [50,150]] },
				{ id: "p5", color: "#a855f7", points: [[125,125], [200,50], [200,200]] }
			]
		},
		{
			id: "hus",
			name: "Huset",
			description: "Byg et hus med seks dele",
			difficulty: "hard",
			points: 5,
			targetShape: {
				points: [[100,0], [200,80], [200,200], [0,200], [0,80]],
				width: 200,
				height: 200
			},
			pieces: [
				{ id: "p1", color: "#ef4444", points: [[100,0], [200,80], [100,120]] },
				{ id: "p2", color: "#22c55e", points: [[100,0], [100,120], [0,80]] },
				{ id: "p3", color: "#3b82f6", points: [[0,80], [100,120], [0,200]] },
				{ id: "p4", color: "#f59e0b", points: [[200,80], [200,200], [100,120]] },
				{ id: "p5", color: "#a855f7", points: [[100,120], [200,200], [100,200]] },
				{ id: "p6", color: "#06b6d4", points: [[0,200], [100,120], [100,200]] }
			]
		},
		{
			id: "diamant",
			name: "Diamanten",
			description: "Saml otte trekanter til en diamant",
			difficulty: "hard",
			points: 5,
			targetShape: {
				points: [[100,0], [200,100], [100,200], [0,100]],
				width: 200,
				height: 200
			},
			pieces: [
				{ id: "p1", color: "#ef4444", points: [[100,0], [140,40], [100,100]] },
				{ id: "p2", color: "#22c55e", points: [[140,40], [200,100], [100,100]] },
				{ id: "p3", color: "#3b82f6", points: [[200,100], [170,130], [100,100]] },
				{ id: "p4", color: "#f59e0b", points: [[170,130], [100,200], [100,100]] },
				{ id: "p5", color: "#a855f7", points: [[100,200], [60,160], [100,100]] },
				{ id: "p6", color: "#06b6d4", points: [[60,160], [0,100], [100,100]] },
				{ id: "p7", color: "#ec4899", points: [[0,100], [30,70], [100,100]] },
				{ id: "p8", color: "#84cc16", points: [[30,70], [100,0], [100,100]] }
			]
		}
	];

	// Game state
	let showSelector = $state(true);
	let currentPuzzle = $state<PuzzleData | null>(null);
	let pieces = $state<Piece[]>([]);
	let coverage = $state(0);
	let hasWon = $state(false);
	let points = $state(1);

	// Drag state
	let dragState = $state<{
		piece: Piece;
		startX: number;
		startY: number;
		pieceStartX: number;
		pieceStartY: number;
		moved: boolean;
	} | null>(null);

	// SVG and canvas refs
	let playAreaEl: HTMLDivElement | null = null;
	let svgEl: SVGSVGElement | null = null;
	let targetCanvas: HTMLCanvasElement | null = null;
	let piecesCanvas: HTMLCanvasElement | null = null;
	let targetPixelCount = 0;

	// Constants
	const SNAP_INTERVAL = 5;
	const CANVAS_SCALE = 4;
	let viewBox = { x: 0, y: 0, width: 200, height: 200 };

	// Daily win limit helpers
	function getTodayKey(): string {
		return new Date().toISOString().split('T')[0];
	}

	function isWonToday(puzzleId: string): boolean {
		const key = `tangram-${puzzleId}-won`;
		if (typeof localStorage !== 'undefined') {
			return localStorage.getItem(key) === getTodayKey();
		}
		return false;
	}

	function markWonToday(puzzleId: string): void {
		const key = `tangram-${puzzleId}-won`;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(key, getTodayKey());
		}
	}

	// Get difficulty label
	function getDifficultyLabel(difficulty: string): string {
		return t(`difficulty.${difficulty}`);
	}

	// Get puzzle name with translation fallback
	function getPuzzleName(puzzle: PuzzleData): string {
		const translated = t(`puzzles.${puzzle.id}`);
		return translated !== `puzzles.${puzzle.id}` ? translated : puzzle.name;
	}

	// Create thumbnail SVG for puzzle list
	function createThumbnailPoints(puzzle: PuzzleData): string {
		return puzzle.targetShape.points.map(p => p.join(',')).join(' ');
	}

	// Calculate center of piece
	function calculateCenter(points: number[][]): { x: number; y: number } {
		let cx = 0, cy = 0;
		for (const [x, y] of points) {
			cx += x;
			cy += y;
		}
		return { x: cx / points.length, y: cy / points.length };
	}

	// Snap value to grid
	function snap(value: number): number {
		return Math.round(value / SNAP_INTERVAL) * SNAP_INTERVAL;
	}

	// Show puzzle selector
	function showPuzzleSelector() {
		showSelector = true;
		currentPuzzle = null;
		hasWon = false;
		showWinModal = false;
	}

	// Start puzzle
	function startPuzzle(puzzleData: PuzzleData) {
		if (isWonToday(puzzleData.id)) return;

		currentPuzzle = puzzleData;
		points = puzzleData.points;
		hasWon = false;
		showSelector = false;
		showWinModal = false;

		// Setup after DOM update
		requestAnimationFrame(() => {
			setupPuzzle();
			trackStart(GAME_NUMBER);
		});
	}

	// Setup puzzle
	function setupPuzzle() {
		if (!currentPuzzle || !playAreaEl) return;

		const target = currentPuzzle.targetShape;
		const padding = 30;
		const viewWidth = target.width + padding * 2;
		const viewHeight = target.height + padding * 2;

		viewBox = { x: -padding, y: -padding, width: viewWidth, height: viewHeight };

		// Create pieces
		pieces = currentPuzzle.pieces.map(pieceData => ({
			data: pieceData,
			x: 0,
			y: 0,
			rotation: 0,
			center: calculateCenter(pieceData.points)
		}));

		// Setup coverage canvas
		setupCoverageCanvas();

		// Scatter pieces
		scatterPieces();

		// Calculate initial coverage
		requestAnimationFrame(() => {
			updateCoverage();
		});
	}

	// Setup coverage calculation canvases
	function setupCoverageCanvas() {
		if (!currentPuzzle) return;

		const width = viewBox.width * CANVAS_SCALE;
		const height = viewBox.height * CANVAS_SCALE;

		// Create target canvas
		targetCanvas = document.createElement('canvas');
		targetCanvas.width = width;
		targetCanvas.height = height;

		// Create pieces canvas
		piecesCanvas = document.createElement('canvas');
		piecesCanvas.width = width;
		piecesCanvas.height = height;

		// Draw target shape
		const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return;

		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, width, height);

		ctx.fillStyle = 'white';
		ctx.beginPath();
		const target = currentPuzzle.targetShape;
		const pts = target.points;
		const offsetX = -viewBox.x * CANVAS_SCALE;
		const offsetY = -viewBox.y * CANVAS_SCALE;

		ctx.moveTo(pts[0][0] * CANVAS_SCALE + offsetX, pts[0][1] * CANVAS_SCALE + offsetY);
		for (let i = 1; i < pts.length; i++) {
			ctx.lineTo(pts[i][0] * CANVAS_SCALE + offsetX, pts[i][1] * CANVAS_SCALE + offsetY);
		}
		ctx.closePath();
		ctx.fill();

		// Count target pixels
		const imageData = ctx.getImageData(0, 0, width, height);
		targetPixelCount = 0;
		for (let i = 0; i < imageData.data.length; i += 4) {
			if (imageData.data[i] > 128) targetPixelCount++;
		}
	}

	// Scatter pieces to center
	function scatterPieces() {
		if (!currentPuzzle) return;

		const target = currentPuzzle.targetShape;
		const centerX = target.width / 2;
		const centerY = target.height / 2;

		pieces = pieces.map(piece => ({
			...piece,
			x: snap(centerX - piece.center.x),
			y: snap(centerY - piece.center.y),
			rotation: Math.floor(Math.random() * 8) * 45
		}));
	}

	// Reset puzzle
	function resetPuzzle() {
		hasWon = false;
		showWinModal = false;
		scatterPieces();
		requestAnimationFrame(() => {
			updateCoverage();
		});
	}

	// Calculate coverage
	function calculateCoverageValue(): number {
		if (!piecesCanvas || !targetCanvas) return 0;

		const width = piecesCanvas.width;
		const height = piecesCanvas.height;
		const ctx = piecesCanvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return 0;

		// Clear and draw all pieces
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, width, height);

		ctx.fillStyle = 'white';
		const offsetX = -viewBox.x * CANVAS_SCALE;
		const offsetY = -viewBox.y * CANVAS_SCALE;

		for (const piece of pieces) {
			ctx.save();

			const cx = piece.center.x;
			const cy = piece.center.y;

			ctx.translate(
				(piece.x + cx) * CANVAS_SCALE + offsetX,
				(piece.y + cy) * CANVAS_SCALE + offsetY
			);
			ctx.rotate(piece.rotation * Math.PI / 180);
			ctx.translate(
				-cx * CANVAS_SCALE,
				-cy * CANVAS_SCALE
			);

			ctx.beginPath();
			const pts = piece.data.points;
			ctx.moveTo(pts[0][0] * CANVAS_SCALE, pts[0][1] * CANVAS_SCALE);
			for (let i = 1; i < pts.length; i++) {
				ctx.lineTo(pts[i][0] * CANVAS_SCALE, pts[i][1] * CANVAS_SCALE);
			}
			ctx.closePath();
			ctx.fill();

			ctx.restore();
		}

		// Count overlapping pixels
		const targetCtx = targetCanvas.getContext('2d');
		if (!targetCtx) return 0;

		const targetData = targetCtx.getImageData(0, 0, width, height);
		const piecesData = ctx.getImageData(0, 0, width, height);

		let coveredPixels = 0;
		for (let i = 0; i < targetData.data.length; i += 4) {
			if (targetData.data[i] > 128 && piecesData.data[i] > 128) {
				coveredPixels++;
			}
		}

		return targetPixelCount > 0 ? coveredPixels / targetPixelCount : 0;
	}

	// Update coverage
	function updateCoverage() {
		coverage = calculateCoverageValue();

		// Check win condition
		if (coverage >= 0.95 && !hasWon && currentPuzzle) {
			hasWon = true;
			coverage = 1;
			markWonToday(currentPuzzle.id);
			setTimeout(() => {
				trackComplete(GAME_NUMBER);
				showWinModal = true;
			}, 300);
		}
	}

	// Get piece transform
	function getPieceTransform(piece: Piece): string {
		const cx = piece.center.x;
		const cy = piece.center.y;
		return `translate(${piece.x}, ${piece.y}) rotate(${piece.rotation}, ${cx}, ${cy})`;
	}

	// Get piece points as string
	function getPiecePoints(piece: Piece): string {
		return piece.data.points.map(p => p.join(',')).join(' ');
	}

	// Convert screen coordinates to SVG coordinates
	function screenToSVG(screenX: number, screenY: number): { x: number; y: number } {
		if (!playAreaEl) return { x: 0, y: 0 };

		const rect = playAreaEl.getBoundingClientRect();
		const x = ((screenX - rect.left) / rect.width) * viewBox.width + viewBox.x;
		const y = ((screenY - rect.top) / rect.height) * viewBox.height + viewBox.y;

		return { x, y };
	}

	// Get event point
	function getEventPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
		if ('touches' in e && e.touches.length > 0) {
			return { x: e.touches[0].clientX, y: e.touches[0].clientY };
		}
		if ('changedTouches' in e && e.changedTouches.length > 0) {
			return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
		}
		if ('clientX' in e) {
			return { x: e.clientX, y: e.clientY };
		}
		return { x: 0, y: 0 };
	}

	// Start drag
	function startDrag(e: MouseEvent | TouchEvent, piece: Piece) {
		if (hasWon) return;

		e.preventDefault();

		const point = getEventPoint(e);
		const svgPoint = screenToSVG(point.x, point.y);

		dragState = {
			piece,
			startX: svgPoint.x,
			startY: svgPoint.y,
			pieceStartX: piece.x,
			pieceStartY: piece.y,
			moved: false
		};

		// Bring to front by moving to end of array
		const idx = pieces.indexOf(piece);
		if (idx !== -1) {
			pieces = [...pieces.slice(0, idx), ...pieces.slice(idx + 1), piece];
		}
	}

	// Handle drag
	function handleDrag(e: MouseEvent | TouchEvent) {
		if (!dragState) return;

		e.preventDefault();

		const point = getEventPoint(e);
		const svgPoint = screenToSVG(point.x, point.y);

		const dx = svgPoint.x - dragState.startX;
		const dy = svgPoint.y - dragState.startY;

		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
			dragState.moved = true;
		}

		// Update piece position - use ID lookup since piece objects are replaced
		const pieceIdx = pieces.findIndex(p => p.data.id === dragState.piece.data.id);
		if (pieceIdx !== -1) {
			pieces[pieceIdx] = {
				...pieces[pieceIdx],
				x: dragState.pieceStartX + dx,
				y: dragState.pieceStartY + dy
			};
			pieces = [...pieces]; // Trigger reactivity
		}
	}

	// End drag
	function handleDragEnd(e: MouseEvent | TouchEvent) {
		if (!dragState) return;

		const pieceId = dragState.piece.data.id;
		const moved = dragState.moved;

		// Find piece by ID since object reference may have changed
		const pieceIdx = pieces.findIndex(p => p.data.id === pieceId);

		if (!moved) {
			// It was a tap/click - rotate the piece
			if (pieceIdx !== -1) {
				rotatePieceByIndex(pieceIdx);
			}
		} else {
			// Snap to grid on release
			if (pieceIdx !== -1) {
				pieces[pieceIdx] = {
					...pieces[pieceIdx],
					x: snap(pieces[pieceIdx].x),
					y: snap(pieces[pieceIdx].y)
				};
				pieces = [...pieces];
			}
		}

		// Update coverage after any interaction
		updateCoverage();

		dragState = null;
	}

	// Rotate piece by index
	function rotatePieceByIndex(pieceIdx: number) {
		if (hasWon || pieceIdx === -1) return;

		pieces[pieceIdx] = {
			...pieces[pieceIdx],
			rotation: (pieces[pieceIdx].rotation + 45) % 360
		};
		pieces = [...pieces];
		updateCoverage();
	}

	// Event listeners setup
	onMount(() => {
		const handleGlobalMove = (e: MouseEvent | TouchEvent) => handleDrag(e);
		const handleGlobalEnd = (e: MouseEvent | TouchEvent) => handleDragEnd(e);

		document.addEventListener('mousemove', handleGlobalMove);
		document.addEventListener('mouseup', handleGlobalEnd);
		document.addEventListener('touchmove', handleGlobalMove, { passive: false });
		document.addEventListener('touchend', handleGlobalEnd);
		document.addEventListener('touchcancel', handleGlobalEnd);

		return () => {
			document.removeEventListener('mousemove', handleGlobalMove);
			document.removeEventListener('mouseup', handleGlobalEnd);
			document.removeEventListener('touchmove', handleGlobalMove);
			document.removeEventListener('touchend', handleGlobalEnd);
			document.removeEventListener('touchcancel', handleGlobalEnd);
		};
	});
</script>

<div class="game">
	{#if showSelector}
		<!-- Puzzle Selector -->
		<div class="puzzle-selector">
			<h2>{t('selectPuzzle')}</h2>
			<div class="puzzle-list">
				{#each PUZZLES as puzzle}
					{@const wonToday = isWonToday(puzzle.id)}
					<button
						class="puzzle-item"
						class:won-today={wonToday}
						onclick={() => startPuzzle(puzzle)}
						disabled={wonToday}
					>
						<div class="puzzle-thumbnail">
							<svg viewBox="0 0 {puzzle.targetShape.width} {puzzle.targetShape.height}">
								<polygon
									points={createThumbnailPoints(puzzle)}
									fill="rgba(168, 85, 247, 0.3)"
									stroke="#a855f7"
									stroke-width="2"
								/>
							</svg>
						</div>
						<div class="puzzle-info">
							<h3>{getPuzzleName(puzzle)}{wonToday ? ' \u2713' : ''}</h3>
						</div>
						<span class="puzzle-difficulty {puzzle.difficulty}">
							{getDifficultyLabel(puzzle.difficulty)}
						</span>
					</button>
				{/each}
			</div>

			<div class="rules">
				<h3>{t('rules.title')}</h3>
				<ul>
					<li>{t('rules.rule1')}</li>
					<li>{t('rules.rule2')}</li>
					<li>{t('rules.rule3')}</li>
				</ul>
			</div>
		</div>
	{:else}
		<!-- Game Area -->
		<div class="game-area">
			<div class="game-header">
				<button class="back-btn" onclick={showPuzzleSelector}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="15 18 9 12 15 6"></polyline>
					</svg>
					{t('back')}
				</button>
				<div class="puzzle-name">{currentPuzzle ? getPuzzleName(currentPuzzle) : ''}</div>
				<button class="reset-btn" onclick={resetPuzzle}>{t('reset')}</button>
			</div>

			<div class="hint-text">{t('hint')}</div>

			<div class="play-area" bind:this={playAreaEl}>
				<svg
					bind:this={svgEl}
					class="puzzle-svg"
					viewBox="{viewBox.x} {viewBox.y} {viewBox.width} {viewBox.height}"
				>
					<!-- Target shape outline -->
					{#if currentPuzzle}
						<polygon
							class="target-shape"
							points={currentPuzzle.targetShape.points.map(p => p.join(',')).join(' ')}
						/>
					{/if}

					<!-- Pieces -->
					{#each pieces as piece}
						<g
							class="piece"
							class:dragging={dragState?.piece === piece}
							transform={getPieceTransform(piece)}
							onmousedown={(e) => startDrag(e, piece)}
							ontouchstart={(e) => startDrag(e, piece)}
							role="button"
							tabindex="0"
						>
							<polygon
								points={getPiecePoints(piece)}
								fill={piece.data.color}
							/>
						</g>
					{/each}
				</svg>
			</div>

			<div class="progress">
				<span>{Math.round(coverage * 100)}% {t('covered')}</span>
			</div>
		</div>
	{/if}
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

	/* Puzzle Selector */
	.puzzle-selector {
		width: 100%;
	}

	.puzzle-selector h2 {
		color: #fff;
		font-size: 1.1rem;
		text-align: center;
		margin-bottom: 15px;
	}

	.puzzle-list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
		margin-bottom: 15px;
	}

	.puzzle-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: 'Poppins', sans-serif;
		color: white;
	}

	.puzzle-item:active:not(:disabled) {
		transform: scale(0.98);
		background: rgba(255, 255, 255, 0.12);
	}

	.puzzle-item:disabled {
		cursor: default;
	}

	.puzzle-item.won-today {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.2);
	}

	.puzzle-item.won-today:active {
		transform: none;
	}

	.puzzle-item.won-today .puzzle-info h3 {
		color: rgba(34, 197, 94, 0.8);
	}

	.puzzle-thumbnail {
		width: 60px;
		height: 60px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.puzzle-thumbnail svg {
		width: 50px;
		height: 50px;
	}

	.puzzle-info {
		text-align: center;
	}

	.puzzle-info h3 {
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0;
	}

	.puzzle-difficulty {
		padding: 4px 10px;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.puzzle-difficulty.easy {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.puzzle-difficulty.medium {
		background: rgba(245, 158, 11, 0.2);
		color: #f59e0b;
	}

	.puzzle-difficulty.hard {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	/* Game Area */
	.game-area {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.game-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}

	.back-btn, .reset-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 8px 12px;
		background: rgba(128, 128, 128, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 8px;
		color: #fff;
		font-family: 'Poppins', sans-serif;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.back-btn:active, .reset-btn:active {
		transform: scale(0.95);
		background: rgba(128, 128, 128, 0.5);
	}

	.puzzle-name {
		color: #fff;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.hint-text {
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.8rem;
		margin-bottom: 10px;
	}

	.play-area {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		margin-bottom: 15px;
		overflow: hidden;
		touch-action: none;
	}

	.puzzle-svg {
		width: 100%;
		height: 100%;
	}

	.target-shape {
		fill: none;
		stroke: rgba(255, 255, 255, 0.2);
		stroke-width: 2;
		stroke-dasharray: 5, 5;
	}

	.piece {
		cursor: grab;
		transition: filter 0.15s ease;
		filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));
	}

	.piece:active {
		cursor: grabbing;
	}

	.piece.dragging {
		filter: drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.5));
	}

	.piece polygon {
		stroke: rgba(255, 255, 255, 0.3);
		stroke-width: 1;
	}

	.progress {
		text-align: center;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
		margin-bottom: 15px;
		padding: 10px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
	}

	/* Rules */
	.rules {
		background: rgba(255, 255, 255, 0.05);
		padding: 15px 20px;
		border-radius: 12px;
	}

	.rules h3 {
		color: #a855f7;
		margin-bottom: 10px;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.rules ul {
		list-style: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
		padding: 0;
		margin: 0;
	}

	.rules li {
		padding: 4px 0;
		padding-left: 20px;
		position: relative;
	}

	.rules li::before {
		content: '\2022';
		position: absolute;
		left: 5px;
		color: #a855f7;
	}

	@media (max-width: 400px) {
		.puzzle-list {
			gap: 8px;
		}

		.puzzle-item {
			padding: 10px;
		}

		.puzzle-thumbnail {
			width: 50px;
			height: 50px;
		}

		.puzzle-thumbnail svg {
			width: 40px;
			height: 40px;
		}

		.puzzle-info h3 {
			font-size: 0.8rem;
		}
	}
</style>
