class DissectionPuzzle {
    constructor() {
        // Puzzle files to load
        this.puzzleFiles = ['t-puslespil.json', 'fem-dele.json'];
        this.puzzles = [];

        this.currentPuzzle = null;
        this.pieces = [];
        this.svgEl = document.getElementById('puzzle-svg');
        this.playArea = document.getElementById('play-area');
        this.puzzleSelector = document.getElementById('puzzle-selector');
        this.puzzleList = document.getElementById('puzzle-list');
        this.gameArea = document.getElementById('game-area');
        this.puzzleNameEl = document.getElementById('puzzle-name');
        this.coverageEl = document.getElementById('coverage');
        this.backBtn = document.getElementById('back-btn');
        this.resetBtn = document.getElementById('reset-btn');

        this.dragState = null;
        this.svgScale = 1;
        this.svgOffset = { x: 0, y: 0 };

        // Coverage calculation
        this.coverage = 0;
        this.canvasScale = 4; // Pixels per SVG unit for coverage calculation
        this.hasWon = false;

        this.init();
    }

    async init() {
        this.backBtn.addEventListener('click', () => this.showSelector());
        this.resetBtn.addEventListener('click', () => this.resetPuzzle());

        await this.loadPuzzles();
        this.renderPuzzleList();
    }

    async loadPuzzles() {
        for (const file of this.puzzleFiles) {
            try {
                const response = await fetch(`shapes/${file}`);
                if (!response.ok) {
                    console.error(`Failed to load ${file}: ${response.status}`);
                    continue;
                }
                const data = await response.json();
                this.puzzles.push({ id: data.id, data });
            } catch (e) {
                console.error(`Error loading ${file}:`, e.message);
            }
        }

        if (this.puzzles.length === 0) {
            console.warn('No puzzles loaded. If testing locally, use a web server (e.g., "python -m http.server" or VS Code Live Server)');
        }
    }

    renderPuzzleList() {
        this.puzzleList.innerHTML = '';

        for (const puzzle of this.puzzles) {
            if (!puzzle.data) continue;

            const item = document.createElement('div');
            item.className = 'puzzle-item';
            item.innerHTML = `
                <div class="puzzle-thumbnail">
                    ${this.createThumbnailSVG(puzzle.data)}
                </div>
                <div class="puzzle-info">
                    <h3>${puzzle.data.name}</h3>
                    <p>${puzzle.data.description}</p>
                </div>
                <span class="puzzle-difficulty ${puzzle.data.difficulty}">${this.getDifficultyLabel(puzzle.data.difficulty)}</span>
            `;

            item.addEventListener('click', () => this.startPuzzle(puzzle.data));
            this.puzzleList.appendChild(item);
        }
    }

    createThumbnailSVG(puzzle) {
        const target = puzzle.targetShape;
        const points = target.points.map(p => p.join(',')).join(' ');
        return `<svg viewBox="0 0 ${target.width} ${target.height}">
            <polygon points="${points}" fill="rgba(168, 85, 247, 0.3)" stroke="#a855f7" stroke-width="2"/>
        </svg>`;
    }

    getDifficultyLabel(difficulty) {
        const labels = { easy: 'Let', medium: 'Mellem', hard: 'Svær' };
        return labels[difficulty] || difficulty;
    }

    showSelector() {
        this.gameArea.classList.add('hidden');
        this.puzzleSelector.classList.remove('hidden');
        this.currentPuzzle = null;
    }

    startPuzzle(puzzleData) {
        this.currentPuzzle = puzzleData;
        this.hasWon = false;
        this.puzzleSelector.classList.add('hidden');
        this.gameArea.classList.remove('hidden');
        this.puzzleNameEl.textContent = puzzleData.name;

        this.setupSVG();
        this.setupCoverageCanvas();
        this.renderPuzzle();
        this.scatterPieces();
        this.updateCoverage();

        HjernespilAPI.trackStart('24');
    }

    setupSVG() {
        const target = this.currentPuzzle.targetShape;
        const padding = 60;
        const viewWidth = target.width + padding * 2;
        const viewHeight = target.height + padding * 2;

        this.svgEl.setAttribute('viewBox', `${-padding} ${-padding} ${viewWidth} ${viewHeight}`);
        this.svgOffset = { x: padding, y: padding };

        // Store viewBox for coverage calculation
        this.viewBox = { x: -padding, y: -padding, width: viewWidth, height: viewHeight };

        // Calculate scale for coordinate conversion
        const rect = this.playArea.getBoundingClientRect();
        this.svgScale = viewWidth / rect.width;
    }

    setupCoverageCanvas() {
        // Create offscreen canvases for coverage calculation
        const width = this.viewBox.width * this.canvasScale;
        const height = this.viewBox.height * this.canvasScale;

        this.targetCanvas = document.createElement('canvas');
        this.targetCanvas.width = width;
        this.targetCanvas.height = height;

        this.piecesCanvas = document.createElement('canvas');
        this.piecesCanvas.width = width;
        this.piecesCanvas.height = height;

        // Draw target shape once
        const ctx = this.targetCanvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'white';
        ctx.beginPath();
        const target = this.currentPuzzle.targetShape;
        const points = target.points;
        const offsetX = -this.viewBox.x * this.canvasScale;
        const offsetY = -this.viewBox.y * this.canvasScale;

        ctx.moveTo(points[0][0] * this.canvasScale + offsetX, points[0][1] * this.canvasScale + offsetY);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0] * this.canvasScale + offsetX, points[i][1] * this.canvasScale + offsetY);
        }
        ctx.closePath();
        ctx.fill();

        // Count target pixels
        const imageData = ctx.getImageData(0, 0, width, height);
        this.targetPixelCount = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
            if (imageData.data[i] > 128) this.targetPixelCount++;
        }
    }

    renderPuzzle() {
        this.svgEl.innerHTML = '';

        // Render target shape outline
        const target = this.currentPuzzle.targetShape;
        const targetEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        targetEl.setAttribute('points', target.points.map(p => p.join(',')).join(' '));
        targetEl.classList.add('target-shape');
        this.svgEl.appendChild(targetEl);

        // Create piece elements
        this.pieces = [];
        for (const pieceData of this.currentPuzzle.pieces) {
            const piece = this.createPiece(pieceData);
            this.pieces.push(piece);
        }
    }

    createPiece(pieceData) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('piece');
        group.dataset.id = pieceData.id;

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', pieceData.points.map(p => p.join(',')).join(' '));
        polygon.setAttribute('fill', pieceData.color);

        group.appendChild(polygon);
        this.svgEl.appendChild(group);

        const piece = {
            el: group,
            data: pieceData,
            x: 0,
            y: 0,
            rotation: 0,
            center: this.calculateCenter(pieceData.points)
        };

        this.setupPieceInteraction(piece);

        return piece;
    }

    calculateCenter(points) {
        let cx = 0, cy = 0;
        for (const [x, y] of points) {
            cx += x;
            cy += y;
        }
        return { x: cx / points.length, y: cy / points.length };
    }

    setupPieceInteraction(piece) {
        const el = piece.el;

        // Mouse events
        el.addEventListener('mousedown', (e) => this.startDrag(e, piece));

        // Touch events
        el.addEventListener('touchstart', (e) => this.startDrag(e, piece), { passive: false });
    }

    startDrag(e, piece) {
        if (this.hasWon) return;

        e.preventDefault();

        const point = this.getEventPoint(e);
        const svgPoint = this.screenToSVG(point.x, point.y);

        this.dragState = {
            piece,
            startX: svgPoint.x,
            startY: svgPoint.y,
            pieceStartX: piece.x,
            pieceStartY: piece.y,
            moved: false
        };

        piece.el.classList.add('dragging');

        // Bring to front
        this.svgEl.appendChild(piece.el);

        // Add move and end listeners
        if (e.type === 'mousedown') {
            document.addEventListener('mousemove', this.handleDrag);
            document.addEventListener('mouseup', this.handleDragEnd);
        } else {
            document.addEventListener('touchmove', this.handleDrag, { passive: false });
            document.addEventListener('touchend', this.handleDragEnd);
            document.addEventListener('touchcancel', this.handleDragEnd);
        }
    }

    handleDrag = (e) => {
        if (!this.dragState) return;

        e.preventDefault();

        const point = this.getEventPoint(e);
        const svgPoint = this.screenToSVG(point.x, point.y);

        const dx = svgPoint.x - this.dragState.startX;
        const dy = svgPoint.y - this.dragState.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            this.dragState.moved = true;
        }

        this.dragState.piece.x = this.dragState.pieceStartX + dx;
        this.dragState.piece.y = this.dragState.pieceStartY + dy;

        this.updatePieceTransform(this.dragState.piece);
    }

    handleDragEnd = (e) => {
        if (!this.dragState) return;

        const piece = this.dragState.piece;
        const moved = this.dragState.moved;

        piece.el.classList.remove('dragging');

        // Remove listeners
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.handleDragEnd);
        document.removeEventListener('touchmove', this.handleDrag);
        document.removeEventListener('touchend', this.handleDragEnd);
        document.removeEventListener('touchcancel', this.handleDragEnd);

        if (!moved) {
            // It was a tap/click - rotate the piece
            this.rotatePiece(piece);
        }

        // Update coverage after any interaction
        this.updateCoverage();

        this.dragState = null;
    }

    rotatePiece(piece) {
        if (this.hasWon) return;

        piece.rotation = (piece.rotation + 45) % 360;
        this.updatePieceTransform(piece);
    }

    updatePieceTransform(piece) {
        const cx = piece.center.x;
        const cy = piece.center.y;
        piece.el.setAttribute('transform',
            `translate(${piece.x}, ${piece.y}) rotate(${piece.rotation}, ${cx}, ${cy})`
        );
    }

    calculateCoverage() {
        const width = this.piecesCanvas.width;
        const height = this.piecesCanvas.height;
        const ctx = this.piecesCanvas.getContext('2d', { willReadFrequently: true });

        // Clear and draw all pieces
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'white';
        const offsetX = -this.viewBox.x * this.canvasScale;
        const offsetY = -this.viewBox.y * this.canvasScale;

        for (const piece of this.pieces) {
            ctx.save();

            // Apply piece transform
            const cx = piece.center.x;
            const cy = piece.center.y;

            ctx.translate(
                (piece.x + cx) * this.canvasScale + offsetX,
                (piece.y + cy) * this.canvasScale + offsetY
            );
            ctx.rotate(piece.rotation * Math.PI / 180);
            ctx.translate(
                -cx * this.canvasScale,
                -cy * this.canvasScale
            );

            // Draw piece
            ctx.beginPath();
            const points = piece.data.points;
            ctx.moveTo(points[0][0] * this.canvasScale, points[0][1] * this.canvasScale);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0] * this.canvasScale, points[i][1] * this.canvasScale);
            }
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        // Count pixels that are white in BOTH canvases (intersection)
        const targetData = this.targetCanvas.getContext('2d').getImageData(0, 0, width, height);
        const piecesData = ctx.getImageData(0, 0, width, height);

        let coveredPixels = 0;
        for (let i = 0; i < targetData.data.length; i += 4) {
            if (targetData.data[i] > 128 && piecesData.data[i] > 128) {
                coveredPixels++;
            }
        }

        return this.targetPixelCount > 0 ? coveredPixels / this.targetPixelCount : 0;
    }

    updateCoverage() {
        this.coverage = this.calculateCoverage();
        const percentage = Math.round(this.coverage * 100);
        this.coverageEl.textContent = `${percentage}% dækket`;

        // Check win condition
        if (this.coverage >= 0.95 && !this.hasWon) {
            this.hasWon = true;
            this.coverageEl.textContent = '100% dækket';
            setTimeout(() => {
                HjernespilAPI.trackComplete('24');
                HjernespilUI.showWinModal(this.currentPuzzle.points);
            }, 300);
        }
    }

    scatterPieces() {
        const target = this.currentPuzzle.targetShape;

        // Place all pieces in the center of the target
        const centerX = target.width / 2;
        const centerY = target.height / 2;

        for (const piece of this.pieces) {
            // Offset from piece's center to target center
            piece.x = centerX - piece.center.x;
            piece.y = centerY - piece.center.y;

            // Random rotation
            piece.rotation = Math.floor(Math.random() * 8) * 45;

            this.updatePieceTransform(piece);
        }
    }

    resetPuzzle() {
        this.hasWon = false;
        this.scatterPieces();
        this.updateCoverage();
    }

    getEventPoint(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    screenToSVG(screenX, screenY) {
        const rect = this.playArea.getBoundingClientRect();
        const viewBox = this.svgEl.viewBox.baseVal;

        const x = ((screenX - rect.left) / rect.width) * viewBox.width + viewBox.x;
        const y = ((screenY - rect.top) / rect.height) * viewBox.height + viewBox.y;

        return { x, y };
    }
}

new DissectionPuzzle();
