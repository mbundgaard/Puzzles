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

        this.grid = [];
        this.placedShips = [];
        this.shots = 0;
        this.gameOver = false;

        this.init();
    }

    init() {
        this.bindNewGameButton();
        this.startGame();
    }

    bindNewGameButton() {
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    resetGame() {
        this.grid = [];
        this.placedShips = [];
        this.shots = 0;
        this.gameOver = false;

        document.getElementById('game-phase').style.display = 'block';
        document.getElementById('game-over').style.display = 'none';

        this.startGame();
    }

    createEmptyGrid() {
        return Array(this.gridSize).fill(null).map(() =>
            Array(this.gridSize).fill({ ship: null, hit: false })
        );
    }

    startGame() {
        this.grid = this.createEmptyGrid();
        this.placeShips();
        this.renderGrid();
        this.updateUI();

        HjernespilAPI.sessionEvent('newGame');
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
            if (this.grid[r][c].ship !== null) {
                return false;
            }
        }

        return true;
    }

    placeShips() {
        this.ships.forEach((ship, index) => {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                const row = Math.floor(Math.random() * this.gridSize);
                const col = Math.floor(Math.random() * this.gridSize);
                const horizontal = Math.random() > 0.5;

                if (this.canPlaceShip(row, col, ship.size, horizontal)) {
                    const cells = this.getShipCells(row, col, ship.size, horizontal);
                    const shipData = {
                        name: ship.name,
                        size: ship.size,
                        cells: cells,
                        hits: 0
                    };

                    cells.forEach(([r, c]) => {
                        this.grid[r][c] = { ship: index, hit: false };
                    });

                    this.placedShips.push(shipData);
                    placed = true;
                }
                attempts++;
            }
        });
    }

    renderGrid() {
        const grid = document.getElementById('puzzle-grid');
        grid.innerHTML = '';

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                const cellData = this.grid[row][col];
                if (cellData.hit) {
                    cell.classList.add('revealed');
                    if (cellData.ship !== null) {
                        const ship = this.placedShips[cellData.ship];
                        if (ship.hits >= ship.size) {
                            cell.classList.add('sunk');
                        } else {
                            cell.classList.add('hit');
                        }
                    } else {
                        cell.classList.add('miss');
                    }
                }

                cell.addEventListener('click', () => this.handleShot(row, col));
                grid.appendChild(cell);
            }
        }
    }

    handleShot(row, col) {
        if (this.gameOver) return;
        if (this.grid[row][col].hit) return;

        this.grid[row][col].hit = true;
        this.shots++;

        if (this.grid[row][col].ship !== null) {
            const shipIndex = this.grid[row][col].ship;
            this.placedShips[shipIndex].hits++;
        }

        this.renderGrid();
        this.updateUI();

        if (this.checkVictory()) {
            this.endGame();
        }
    }

    updateUI() {
        const shipsRemaining = this.placedShips.filter(s => s.hits < s.size).length;
        const shipsSunk = this.placedShips.length - shipsRemaining;

        document.getElementById('shots-count').textContent = this.shots;
        document.getElementById('ships-found').textContent = shipsSunk;
        document.getElementById('ships-total').textContent = this.placedShips.length;

        // Update ship list
        const shipList = document.getElementById('ship-list');
        shipList.innerHTML = this.placedShips.map((ship, i) => {
            const isSunk = ship.hits >= ship.size;
            let className = 'ship-item';
            if (isSunk) className += ' sunk';
            return `<div class="${className}">${ship.name} (${ship.size})</div>`;
        }).join('');
    }

    checkVictory() {
        return this.placedShips.every(ship => ship.hits >= ship.size);
    }

    endGame() {
        this.gameOver = true;

        document.getElementById('game-phase').style.display = 'none';
        const gameOverEl = document.getElementById('game-over');
        gameOverEl.style.display = 'block';

        document.getElementById('final-shots').textContent = this.shots;

        HjernespilAPI.sessionEvent('win');
        HjernespilUI.showWinModal(2);
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Battleship();
});
