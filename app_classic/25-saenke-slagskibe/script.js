class BattleshipPuzzle {
    constructor() {
        this.gridSize = 10;
        // Standard newspaper fleet: 1×4, 2×3, 3×2, 4×1 = 10 ships, 20 segments
        this.fleet = [
            { name: 'Slagskib', size: 4, count: 1 },
            { name: 'Krydser', size: 3, count: 2 },
            { name: 'Destroyer', size: 2, count: 3 },
            { name: 'Ubåd', size: 1, count: 4 }
        ];

        this.difficulty = 'medium'; // easy, medium, hard
        this.grid = [];           // Solution grid
        this.playerGrid = [];     // Player's current state
        this.rowClues = [];       // Ship segments per row
        this.colClues = [];       // Ship segments per column
        this.ships = [];          // Placed ships for tracking
        this.markMode = 'ship';   // 'ship' or 'water'
        this.gameOver = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDifficulty();
        this.newGame();
    }

    bindEvents() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('mark-ship-btn').addEventListener('click', () => this.setMarkMode('ship'));
        document.getElementById('mark-water-btn').addEventListener('click', () => this.setMarkMode('water'));

        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setDifficulty(e.target.dataset.diff);
            });
        });
    }

    loadDifficulty() {
        const saved = localStorage.getItem('battleship-difficulty');
        if (saved) {
            this.difficulty = saved;
        }
        this.updateDifficultyUI();
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        localStorage.setItem('battleship-difficulty', diff);
        this.updateDifficultyUI();
        this.newGame();
    }

    updateDifficultyUI() {
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.diff === this.difficulty);
        });
    }

    setMarkMode(mode) {
        this.markMode = mode;
        document.getElementById('mark-ship-btn').classList.toggle('active', mode === 'ship');
        document.getElementById('mark-water-btn').classList.toggle('active', mode === 'water');
    }

    newGame() {
        this.gameOver = false;
        this.ships = [];
        this.grid = this.createEmptyGrid();
        this.playerGrid = this.createEmptyGrid();

        this.placeAllShips();
        this.calculateClues();
        this.revealStartingClues();
        this.render();

        HjernespilAPI.trackStart('25');
    }

    createEmptyGrid() {
        return Array(this.gridSize).fill(null).map(() =>
            Array(this.gridSize).fill(null).map(() => ({
                isShip: false,
                shipId: null,
                revealed: false,
                playerMark: null // null, 'ship', 'water'
            }))
        );
    }

    // Check if a cell and its diagonal neighbors are free
    canPlaceAt(row, col) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
                    if (this.grid[r][c].isShip) return false;
                }
            }
        }
        return true;
    }

    canPlaceShip(row, col, size, horizontal) {
        const cells = [];
        for (let i = 0; i < size; i++) {
            const r = horizontal ? row : row + i;
            const c = horizontal ? col + i : col;

            if (r < 0 || r >= this.gridSize || c < 0 || c >= this.gridSize) {
                return false;
            }
            cells.push([r, c]);
        }

        // Check each cell and its neighbors (no touching rule)
        for (const [r, c] of cells) {
            if (!this.canPlaceAt(r, c)) return false;
        }

        return true;
    }

    placeShip(row, col, size, horizontal, shipId) {
        const cells = [];
        for (let i = 0; i < size; i++) {
            const r = horizontal ? row : row + i;
            const c = horizontal ? col + i : col;
            this.grid[r][c].isShip = true;
            this.grid[r][c].shipId = shipId;
            cells.push([r, c]);
        }

        this.ships.push({
            id: shipId,
            size: size,
            cells: cells,
            horizontal: horizontal
        });
    }

    placeAllShips() {
        let shipId = 0;

        for (const shipType of this.fleet) {
            for (let i = 0; i < shipType.count; i++) {
                let placed = false;
                let attempts = 0;

                while (!placed && attempts < 1000) {
                    const row = Math.floor(Math.random() * this.gridSize);
                    const col = Math.floor(Math.random() * this.gridSize);
                    const horizontal = Math.random() > 0.5;

                    if (this.canPlaceShip(row, col, shipType.size, horizontal)) {
                        this.placeShip(row, col, shipType.size, horizontal, shipId);
                        placed = true;
                    }
                    attempts++;
                }
                shipId++;
            }
        }
    }

    calculateClues() {
        this.rowClues = [];
        this.colClues = [];

        for (let i = 0; i < this.gridSize; i++) {
            let rowCount = 0;
            let colCount = 0;
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j].isShip) rowCount++;
                if (this.grid[j][i].isShip) colCount++;
            }
            this.rowClues.push(rowCount);
            this.colClues.push(colCount);
        }
    }

    revealStartingClues() {
        // Reveal some cells based on difficulty
        const revealCounts = {
            easy: { ships: 8, water: 12 },
            medium: { ships: 4, water: 6 },
            hard: { ships: 2, water: 2 }
        };

        const counts = revealCounts[this.difficulty];

        // Reveal some ship cells
        const shipCells = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c].isShip) {
                    shipCells.push([r, c]);
                }
            }
        }

        this.shuffle(shipCells);
        for (let i = 0; i < Math.min(counts.ships, shipCells.length); i++) {
            const [r, c] = shipCells[i];
            this.playerGrid[r][c].revealed = true;
            this.playerGrid[r][c].playerMark = 'ship';
            this.playerGrid[r][c].isShip = true;
        }

        // Reveal some water cells
        const waterCells = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (!this.grid[r][c].isShip) {
                    waterCells.push([r, c]);
                }
            }
        }

        this.shuffle(waterCells);
        for (let i = 0; i < Math.min(counts.water, waterCells.length); i++) {
            const [r, c] = waterCells[i];
            this.playerGrid[r][c].revealed = true;
            this.playerGrid[r][c].playerMark = 'water';
        }
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    handleCellClick(row, col) {
        if (this.gameOver) return;
        if (this.playerGrid[row][col].revealed) return;

        const cell = this.playerGrid[row][col];

        if (cell.playerMark === this.markMode) {
            // Toggle off if same mode
            cell.playerMark = null;
        } else {
            cell.playerMark = this.markMode;
        }

        this.render();
        this.checkVictory();
    }

    checkVictory() {
        // Check if all ship cells are marked as ship
        // and no water cells are marked as ship
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const solution = this.grid[r][c].isShip;
                const playerMark = this.playerGrid[r][c].playerMark;

                if (solution && playerMark !== 'ship') return false;
                if (!solution && playerMark === 'ship') return false;
            }
        }

        this.victory();
        return true;
    }

    victory() {
        this.gameOver = true;

        // Calculate points based on difficulty
        const points = { easy: 1, medium: 2, hard: 3 }[this.difficulty];

        HjernespilAPI.trackComplete('25');
        HjernespilUI.showWinModal(points);
    }

    getShipSegmentType(row, col) {
        if (!this.grid[row][col].isShip) return null;

        const shipId = this.grid[row][col].shipId;
        const ship = this.ships.find(s => s.id === shipId);
        if (!ship) return 'submarine';

        if (ship.size === 1) return 'submarine';

        const cellIndex = ship.cells.findIndex(([r, c]) => r === row && c === col);

        if (cellIndex === 0) {
            return ship.horizontal ? 'left' : 'top';
        } else if (cellIndex === ship.size - 1) {
            return ship.horizontal ? 'right' : 'bottom';
        } else {
            return ship.horizontal ? 'horizontal' : 'vertical';
        }
    }

    render() {
        this.renderGrid();
        this.renderFleetStatus();
    }

    renderGrid() {
        const container = document.getElementById('puzzle-grid');
        container.innerHTML = '';

        // Create grid with clues
        // Top-left corner (empty)
        const corner = document.createElement('div');
        corner.className = 'clue-cell corner';
        container.appendChild(corner);

        // Column clues (top row)
        for (let c = 0; c < this.gridSize; c++) {
            const clue = document.createElement('div');
            clue.className = 'clue-cell col-clue';
            clue.textContent = this.colClues[c];

            // Check if column is complete
            let marked = 0;
            for (let r = 0; r < this.gridSize; r++) {
                if (this.playerGrid[r][c].playerMark === 'ship') marked++;
            }
            if (marked === this.colClues[c]) clue.classList.add('complete');
            if (marked > this.colClues[c]) clue.classList.add('over');

            container.appendChild(clue);
        }

        // Grid rows with row clues
        for (let r = 0; r < this.gridSize; r++) {
            // Row clue
            const rowClue = document.createElement('div');
            rowClue.className = 'clue-cell row-clue';
            rowClue.textContent = this.rowClues[r];

            // Check if row is complete
            let marked = 0;
            for (let c = 0; c < this.gridSize; c++) {
                if (this.playerGrid[r][c].playerMark === 'ship') marked++;
            }
            if (marked === this.rowClues[r]) rowClue.classList.add('complete');
            if (marked > this.rowClues[r]) rowClue.classList.add('over');

            container.appendChild(rowClue);

            // Grid cells
            for (let c = 0; c < this.gridSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const playerCell = this.playerGrid[r][c];

                if (playerCell.revealed) {
                    cell.classList.add('revealed');
                    if (playerCell.playerMark === 'ship') {
                        cell.classList.add('ship');
                        const segType = this.getShipSegmentType(r, c);
                        if (segType) cell.classList.add(segType);
                    } else if (playerCell.playerMark === 'water') {
                        cell.classList.add('water');
                    }
                } else if (playerCell.playerMark === 'ship') {
                    cell.classList.add('ship', 'player-marked');
                } else if (playerCell.playerMark === 'water') {
                    cell.classList.add('water', 'player-marked');
                }

                cell.addEventListener('click', () => this.handleCellClick(r, c));
                container.appendChild(cell);
            }
        }
    }

    renderFleetStatus() {
        const container = document.getElementById('fleet-status');
        container.innerHTML = '';

        // Count placed ships by size in player grid
        const placedBySize = {};

        // Find connected ship groups in player grid
        const visited = new Set();

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.playerGrid[r][c].playerMark === 'ship' && !visited.has(`${r},${c}`)) {
                    const shipCells = this.floodFillShip(r, c, visited);
                    const size = shipCells.length;
                    placedBySize[size] = (placedBySize[size] || 0) + 1;
                }
            }
        }

        for (const shipType of this.fleet) {
            const div = document.createElement('div');
            div.className = 'fleet-item';

            const placed = placedBySize[shipType.size] || 0;
            const needed = shipType.count;

            // Ship icons
            const icons = '■'.repeat(shipType.size);

            div.innerHTML = `
                <span class="ship-icons">${icons}</span>
                <span class="ship-name">${shipType.name}</span>
                <span class="ship-count ${placed === needed ? 'complete' : ''}">${placed}/${needed}</span>
            `;

            container.appendChild(div);
        }
    }

    floodFillShip(startR, startC, visited) {
        const cells = [];
        const stack = [[startR, startC]];

        while (stack.length > 0) {
            const [r, c] = stack.pop();
            const key = `${r},${c}`;

            if (visited.has(key)) continue;
            if (r < 0 || r >= this.gridSize || c < 0 || c >= this.gridSize) continue;
            if (this.playerGrid[r][c].playerMark !== 'ship') continue;

            visited.add(key);
            cells.push([r, c]);

            // Only horizontal and vertical neighbors (ships are straight)
            stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
        }

        return cells;
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BattleshipPuzzle();
});
