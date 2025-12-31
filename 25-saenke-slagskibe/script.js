class Battleship {
    constructor() {
        this.gridSize = 10;
        this.ships = [
            { name: 'Hangarskib', size: 5 },
            { name: 'Slagskib', size: 4 },
            { name: 'Krydser', size: 3 },
            { name: 'Ubåd', size: 3 },
            { name: 'Destroyer', size: 2 }
        ];

        this.difficulty = null;
        this.points = 0;
        this.playerGrid = [];
        this.enemyGrid = [];
        this.playerShips = [];
        this.enemyShips = [];
        this.currentShipIndex = 0;
        this.isHorizontal = true;
        this.isPlayerTurn = true;
        this.gameOver = false;

        // AI state for hunting
        this.aiHits = [];
        this.aiTargets = [];
        this.aiDirection = null;

        this.init();
    }

    init() {
        this.bindDifficultyButtons();
        this.bindRotateButton();
        this.bindNewGameButton();
    }

    bindDifficultyButtons() {
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.difficulty = btn.dataset.difficulty;
                this.points = parseInt(btn.dataset.points);
                this.startPlacement();
            });
        });
    }

    bindRotateButton() {
        document.getElementById('rotate-btn').addEventListener('click', () => {
            this.isHorizontal = !this.isHorizontal;
        });
    }

    bindNewGameButton() {
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    resetGame() {
        this.playerGrid = [];
        this.enemyGrid = [];
        this.playerShips = [];
        this.enemyShips = [];
        this.currentShipIndex = 0;
        this.isHorizontal = true;
        this.isPlayerTurn = true;
        this.gameOver = false;
        this.aiHits = [];
        this.aiTargets = [];
        this.aiDirection = null;

        document.getElementById('difficulty-select').style.display = 'block';
        document.getElementById('placement-phase').style.display = 'none';
        document.getElementById('battle-phase').style.display = 'none';
        document.getElementById('game-over').style.display = 'none';
    }

    createEmptyGrid() {
        return Array(this.gridSize).fill(null).map(() =>
            Array(this.gridSize).fill({ ship: null, hit: false })
        );
    }

    startPlacement() {
        document.getElementById('difficulty-select').style.display = 'none';
        document.getElementById('placement-phase').style.display = 'block';

        this.playerGrid = this.createEmptyGrid();
        this.renderPlacementGrid();
        this.updatePlacementUI();

        HjernespilAPI.trackStart('25');
    }

    renderPlacementGrid() {
        const grid = document.getElementById('player-grid');
        grid.innerHTML = '';

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                if (this.playerGrid[row][col].ship !== null) {
                    cell.classList.add('ship');
                }

                cell.addEventListener('click', () => this.handlePlacementClick(row, col));
                cell.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.showPlacementPreview(row, col);
                });
                cell.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.handlePlacementClick(row, col);
                });
                cell.addEventListener('mouseenter', () => this.showPlacementPreview(row, col));
                cell.addEventListener('mouseleave', () => this.clearPreview());

                grid.appendChild(cell);
            }
        }
    }

    showPlacementPreview(row, col) {
        if (this.currentShipIndex >= this.ships.length) return;

        this.clearPreview();
        const ship = this.ships[this.currentShipIndex];
        const cells = this.getShipCells(row, col, ship.size, this.isHorizontal);
        const isValid = this.canPlaceShip(row, col, ship.size, this.isHorizontal);

        cells.forEach(([r, c]) => {
            if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
                const cell = document.querySelector(`#player-grid .cell[data-row="${r}"][data-col="${c}"]`);
                if (cell && !cell.classList.contains('ship')) {
                    cell.classList.add(isValid ? 'preview' : 'preview-invalid');
                }
            }
        });
    }

    clearPreview() {
        document.querySelectorAll('.preview, .preview-invalid').forEach(cell => {
            cell.classList.remove('preview', 'preview-invalid');
        });
    }

    getShipCells(row, col, size, horizontal) {
        const cells = [];
        for (let i = 0; i < size; i++) {
            if (horizontal) {
                cells.push([row, col + i]);
            } else {
                cells.push([row + i, col]);
            }
        }
        return cells;
    }

    canPlaceShip(row, col, size, horizontal) {
        const cells = this.getShipCells(row, col, size, horizontal);

        for (const [r, c] of cells) {
            if (r < 0 || r >= this.gridSize || c < 0 || c >= this.gridSize) {
                return false;
            }
            if (this.playerGrid[r][c].ship !== null) {
                return false;
            }
        }

        return true;
    }

    handlePlacementClick(row, col) {
        if (this.currentShipIndex >= this.ships.length) return;

        const ship = this.ships[this.currentShipIndex];
        if (!this.canPlaceShip(row, col, ship.size, this.isHorizontal)) {
            return;
        }

        const cells = this.getShipCells(row, col, ship.size, this.isHorizontal);
        const shipData = {
            name: ship.name,
            size: ship.size,
            cells: cells,
            hits: 0
        };

        cells.forEach(([r, c]) => {
            this.playerGrid[r][c] = { ship: this.currentShipIndex, hit: false };
        });

        this.playerShips.push(shipData);
        this.currentShipIndex++;

        this.renderPlacementGrid();
        this.updatePlacementUI();

        if (this.currentShipIndex >= this.ships.length) {
            setTimeout(() => this.startBattle(), 500);
        }
    }

    updatePlacementUI() {
        const instruction = document.getElementById('placement-instruction');
        const shipList = document.getElementById('ship-list');

        if (this.currentShipIndex < this.ships.length) {
            const ship = this.ships[this.currentShipIndex];
            instruction.textContent = `Placer dit skib (${ship.size} felter)`;
        } else {
            instruction.textContent = 'Alle skibe placeret!';
        }

        shipList.innerHTML = this.ships.map((ship, i) => {
            let className = 'ship-item';
            if (i < this.currentShipIndex) className += ' placed';
            if (i === this.currentShipIndex) className += ' current';
            return `<div class="${className}">${ship.name} (${ship.size})</div>`;
        }).join('');
    }

    startBattle() {
        document.getElementById('placement-phase').style.display = 'none';
        document.getElementById('battle-phase').style.display = 'block';

        this.enemyGrid = this.createEmptyGrid();
        this.placeEnemyShips();
        this.renderBattleGrids();
        this.updateBattleUI();
    }

    placeEnemyShips() {
        this.ships.forEach((ship, index) => {
            let placed = false;
            while (!placed) {
                const row = Math.floor(Math.random() * this.gridSize);
                const col = Math.floor(Math.random() * this.gridSize);
                const horizontal = Math.random() > 0.5;

                if (this.canPlaceEnemyShip(row, col, ship.size, horizontal)) {
                    const cells = this.getShipCells(row, col, ship.size, horizontal);
                    const shipData = {
                        name: ship.name,
                        size: ship.size,
                        cells: cells,
                        hits: 0
                    };

                    cells.forEach(([r, c]) => {
                        this.enemyGrid[r][c] = { ship: index, hit: false };
                    });

                    this.enemyShips.push(shipData);
                    placed = true;
                }
            }
        });
    }

    canPlaceEnemyShip(row, col, size, horizontal) {
        const cells = this.getShipCells(row, col, size, horizontal);

        for (const [r, c] of cells) {
            if (r < 0 || r >= this.gridSize || c < 0 || c >= this.gridSize) {
                return false;
            }
            if (this.enemyGrid[r][c].ship !== null) {
                return false;
            }
        }

        return true;
    }

    renderBattleGrids() {
        this.renderEnemyGrid();
        this.renderPlayerBattleGrid();
    }

    renderEnemyGrid() {
        const grid = document.getElementById('enemy-grid');
        grid.innerHTML = '';

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                const cellData = this.enemyGrid[row][col];
                if (cellData.hit) {
                    cell.classList.add('revealed');
                    if (cellData.ship !== null) {
                        const ship = this.enemyShips[cellData.ship];
                        if (ship.hits >= ship.size) {
                            cell.classList.add('sunk');
                        } else {
                            cell.classList.add('hit');
                        }
                    } else {
                        cell.classList.add('miss');
                    }
                }

                cell.addEventListener('click', () => this.handlePlayerShot(row, col));
                grid.appendChild(cell);
            }
        }
    }

    renderPlayerBattleGrid() {
        const grid = document.getElementById('player-grid-battle');
        grid.innerHTML = '';

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';

                const cellData = this.playerGrid[row][col];
                if (cellData.ship !== null) {
                    const ship = this.playerShips[cellData.ship];
                    if (ship.hits >= ship.size) {
                        cell.classList.add('sunk');
                    } else {
                        cell.classList.add('ship');
                    }
                }
                if (cellData.hit) {
                    cell.classList.add(cellData.ship !== null ? 'hit' : 'miss');
                }

                grid.appendChild(cell);
            }
        }
    }

    handlePlayerShot(row, col) {
        if (!this.isPlayerTurn || this.gameOver) return;
        if (this.enemyGrid[row][col].hit) return;

        this.enemyGrid[row][col].hit = true;

        if (this.enemyGrid[row][col].ship !== null) {
            const shipIndex = this.enemyGrid[row][col].ship;
            this.enemyShips[shipIndex].hits++;

            if (this.enemyShips[shipIndex].hits >= this.enemyShips[shipIndex].size) {
                // Ship sunk - player gets another turn
            }
        }

        this.renderEnemyGrid();
        this.updateBattleUI();

        if (this.checkVictory()) {
            this.endGame(true);
            return;
        }

        this.isPlayerTurn = false;
        this.updateTurnIndicator();

        setTimeout(() => this.aiTurn(), 800);
    }

    aiTurn() {
        if (this.gameOver) return;

        let row, col;

        switch (this.difficulty) {
            case 'easy':
                [row, col] = this.aiRandomShot();
                break;
            case 'medium':
                [row, col] = this.aiHuntShot();
                break;
            case 'hard':
                [row, col] = this.aiSmartShot();
                break;
        }

        this.playerGrid[row][col].hit = true;

        if (this.playerGrid[row][col].ship !== null) {
            const shipIndex = this.playerGrid[row][col].ship;
            this.playerShips[shipIndex].hits++;

            // Track hit for AI hunting
            this.aiHits.push([row, col]);

            if (this.playerShips[shipIndex].hits >= this.playerShips[shipIndex].size) {
                // Ship sunk - clear hunt state for this ship
                this.clearSunkShipFromAI(shipIndex);
            }
        }

        this.renderPlayerBattleGrid();
        this.updateBattleUI();

        if (this.checkDefeat()) {
            this.endGame(false);
            return;
        }

        this.isPlayerTurn = true;
        this.updateTurnIndicator();
    }

    aiRandomShot() {
        const available = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (!this.playerGrid[r][c].hit) {
                    available.push([r, c]);
                }
            }
        }
        return available[Math.floor(Math.random() * available.length)];
    }

    aiHuntShot() {
        // If we have targets from previous hits, use them
        while (this.aiTargets.length > 0) {
            const [r, c] = this.aiTargets.shift();
            if (!this.playerGrid[r][c].hit) {
                return [r, c];
            }
        }

        // Find unsunk hits and target adjacent cells
        for (const [hr, hc] of this.aiHits) {
            const adjacent = [
                [hr - 1, hc], [hr + 1, hc],
                [hr, hc - 1], [hr, hc + 1]
            ];

            for (const [ar, ac] of adjacent) {
                if (ar >= 0 && ar < this.gridSize &&
                    ac >= 0 && ac < this.gridSize &&
                    !this.playerGrid[ar][ac].hit) {
                    return [ar, ac];
                }
            }
        }

        return this.aiRandomShot();
    }

    aiSmartShot() {
        // If we have a direction, continue in that direction
        if (this.aiDirection && this.aiHits.length >= 2) {
            const lastHit = this.aiHits[this.aiHits.length - 1];
            const [dr, dc] = this.aiDirection;
            const nextR = lastHit[0] + dr;
            const nextC = lastHit[1] + dc;

            if (nextR >= 0 && nextR < this.gridSize &&
                nextC >= 0 && nextC < this.gridSize &&
                !this.playerGrid[nextR][nextC].hit) {
                return [nextR, nextC];
            }

            // Try opposite direction
            const firstHit = this.aiHits[0];
            const oppR = firstHit[0] - dr;
            const oppC = firstHit[1] - dc;

            if (oppR >= 0 && oppR < this.gridSize &&
                oppC >= 0 && oppC < this.gridSize &&
                !this.playerGrid[oppR][oppC].hit) {
                this.aiDirection = [-dr, -dc];
                return [oppR, oppC];
            }
        }

        // Check if we have consecutive hits to determine direction
        if (this.aiHits.length >= 2) {
            const h1 = this.aiHits[this.aiHits.length - 2];
            const h2 = this.aiHits[this.aiHits.length - 1];

            if (h1[0] === h2[0]) {
                this.aiDirection = [0, h2[1] > h1[1] ? 1 : -1];
            } else if (h1[1] === h2[1]) {
                this.aiDirection = [h2[0] > h1[0] ? 1 : -1, 0];
            }

            return this.aiSmartShot();
        }

        // Use hunt mode with smarter pattern
        if (this.aiHits.length === 1) {
            const [hr, hc] = this.aiHits[0];
            const adjacent = [
                [hr - 1, hc], [hr + 1, hc],
                [hr, hc - 1], [hr, hc + 1]
            ];

            for (const [ar, ac] of adjacent) {
                if (ar >= 0 && ar < this.gridSize &&
                    ac >= 0 && ac < this.gridSize &&
                    !this.playerGrid[ar][ac].hit) {
                    return [ar, ac];
                }
            }
        }

        // Checkerboard pattern for efficient hunting
        const available = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (!this.playerGrid[r][c].hit && (r + c) % 2 === 0) {
                    available.push([r, c]);
                }
            }
        }

        if (available.length > 0) {
            return available[Math.floor(Math.random() * available.length)];
        }

        return this.aiRandomShot();
    }

    clearSunkShipFromAI(shipIndex) {
        const ship = this.playerShips[shipIndex];
        this.aiHits = this.aiHits.filter(([r, c]) => {
            return !ship.cells.some(([sr, sc]) => sr === r && sc === c);
        });
        this.aiDirection = null;
    }

    updateTurnIndicator() {
        const indicator = document.getElementById('turn-indicator');
        if (this.isPlayerTurn) {
            indicator.textContent = 'Din tur';
            indicator.classList.remove('enemy-turn');
        } else {
            indicator.textContent = 'Fjendens tur';
            indicator.classList.add('enemy-turn');
        }
    }

    updateBattleUI() {
        const playerRemaining = this.playerShips.filter(s => s.hits < s.size).length;
        const enemyRemaining = this.enemyShips.filter(s => s.hits < s.size).length;

        document.getElementById('player-ships').textContent = playerRemaining;
        document.getElementById('enemy-ships').textContent = enemyRemaining;
    }

    checkVictory() {
        return this.enemyShips.every(ship => ship.hits >= ship.size);
    }

    checkDefeat() {
        return this.playerShips.every(ship => ship.hits >= ship.size);
    }

    endGame(isVictory) {
        this.gameOver = true;

        document.getElementById('battle-phase').style.display = 'none';
        const gameOverEl = document.getElementById('game-over');
        gameOverEl.style.display = 'block';

        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');

        if (isVictory) {
            gameOverEl.classList.add('victory');
            gameOverEl.classList.remove('defeat');
            title.textContent = 'Sejr!';
            message.textContent = 'Du sænkede alle fjendens skibe!';

            HjernespilAPI.trackComplete('25');
            HjernespilUI.showWinModal(this.points);
        } else {
            gameOverEl.classList.add('defeat');
            gameOverEl.classList.remove('victory');
            title.textContent = 'Nederlag';
            message.textContent = 'Fjenden sænkede alle dine skibe.';
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Battleship();
});
