class LightUp {
    constructor() {
        this.boardEl = document.getElementById('board');
        this.difficultySelect = document.getElementById('difficulty');
        this.newGameBtn = document.getElementById('new-game');
        this.bulbModeBtn = document.getElementById('bulb-mode');
        this.markModeBtn = document.getElementById('mark-mode');
        this.victoryOverlay = document.getElementById('victory');
        this.playAgainBtn = document.getElementById('play-again');

        this.bulbMode = true;
        this.grid = [];
        this.size = 7;

        this.difficulties = {
            easy: { size: 5, wallRatio: 0.15 },
            medium: { size: 7, wallRatio: 0.2 },
            hard: { size: 7, wallRatio: 0.25 }
        };

        // Cell types: 0 = empty, -1 = wall, -2 = wall with no number, 0-4 = wall with number
        this.EMPTY = 'empty';
        this.WALL = 'wall';

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.playAgainBtn.addEventListener('click', () => {
            this.victoryOverlay.classList.remove('show');
            this.newGame();
        });
        this.difficultySelect.addEventListener('change', () => this.newGame());

        this.bulbModeBtn.addEventListener('click', () => {
            this.bulbMode = true;
            this.bulbModeBtn.classList.add('active');
            this.markModeBtn.classList.remove('active');
        });

        this.markModeBtn.addEventListener('click', () => {
            this.bulbMode = false;
            this.markModeBtn.classList.add('active');
            this.bulbModeBtn.classList.remove('active');
        });

        this.newGame();
    }

    newGame() {
        const diff = this.difficulties[this.difficultySelect.value];
        this.size = diff.size;
        this.wallRatio = diff.wallRatio;

        this.generatePuzzle();
        this.render();
        HjernespilAPI.trackStart('16');
    }

    generatePuzzle() {
        // Initialize empty grid
        this.grid = [];
        for (let y = 0; y < this.size; y++) {
            const row = [];
            for (let x = 0; x < this.size; x++) {
                row.push({ type: this.EMPTY, bulb: false, marked: false, number: null });
            }
            this.grid.push(row);
        }

        // Place walls
        const wallCount = Math.floor(this.size * this.size * this.wallRatio);
        let placed = 0;
        let attempts = 0;

        while (placed < wallCount && attempts < 200) {
            attempts++;
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);

            if (this.grid[y][x].type === this.EMPTY) {
                this.grid[y][x].type = this.WALL;
                placed++;
            }
        }

        // Add numbers to some walls
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.grid[y][x].type === this.WALL) {
                    // Count adjacent empty cells
                    const adjacent = this.getAdjacentCells(x, y)
                        .filter(([ax, ay]) => this.grid[ay][ax].type === this.EMPTY);

                    if (adjacent.length > 0 && Math.random() < 0.5) {
                        // Assign a random valid number (0 to adjacent count)
                        const maxNum = Math.min(adjacent.length, 4);
                        this.grid[y][x].number = Math.floor(Math.random() * (maxNum + 1));
                    }
                }
            }
        }
    }

    getAdjacentCells(x, y) {
        const cells = [];
        if (y > 0) cells.push([x, y - 1]);
        if (y < this.size - 1) cells.push([x, y + 1]);
        if (x > 0) cells.push([x - 1, y]);
        if (x < this.size - 1) cells.push([x + 1, y]);
        return cells;
    }

    handleClick(x, y) {
        const cell = this.grid[y][x];
        if (cell.type === this.WALL) return;

        if (this.bulbMode) {
            if (cell.bulb) {
                cell.bulb = false;
            } else if (!cell.marked) {
                cell.bulb = true;
                cell.marked = false;
            }
        } else {
            if (cell.marked) {
                cell.marked = false;
            } else if (!cell.bulb) {
                cell.marked = true;
            }
        }

        this.render();

        if (this.checkVictory()) {
            setTimeout(() => {
                this.victoryOverlay.classList.add('show');
                HjernespilAPI.trackComplete('16');
                HjernespilUI.showWinModal();
            }, 300);
        }
    }

    isLit(x, y) {
        const cell = this.grid[y][x];
        if (cell.type === this.WALL) return false;
        if (cell.bulb) return true;

        // Check in all four directions
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];

        for (const [dx, dy] of directions) {
            let cx = x + dx;
            let cy = y + dy;

            while (cx >= 0 && cx < this.size && cy >= 0 && cy < this.size) {
                const c = this.grid[cy][cx];
                if (c.type === this.WALL) break;
                if (c.bulb) return true;
                cx += dx;
                cy += dy;
            }
        }

        return false;
    }

    hasConflict(x, y) {
        const cell = this.grid[y][x];
        if (!cell.bulb) return false;

        // Check if another bulb shines on this one
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];

        for (const [dx, dy] of directions) {
            let cx = x + dx;
            let cy = y + dy;

            while (cx >= 0 && cx < this.size && cy >= 0 && cy < this.size) {
                const c = this.grid[cy][cx];
                if (c.type === this.WALL) break;
                if (c.bulb) return true;
                cx += dx;
                cy += dy;
            }
        }

        return false;
    }

    getAdjacentBulbCount(x, y) {
        return this.getAdjacentCells(x, y)
            .filter(([ax, ay]) => this.grid[ay][ax].bulb)
            .length;
    }

    checkVictory() {
        // All empty cells must be lit
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = this.grid[y][x];
                if (cell.type === this.EMPTY && !this.isLit(x, y)) {
                    return false;
                }
            }
        }

        // No bulb conflicts
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.grid[y][x].bulb && this.hasConflict(x, y)) {
                    return false;
                }
            }
        }

        // All numbered walls satisfied
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = this.grid[y][x];
                if (cell.type === this.WALL && cell.number !== null) {
                    if (this.getAdjacentBulbCount(x, y) !== cell.number) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    render() {
        this.boardEl.innerHTML = '';
        this.boardEl.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = this.grid[y][x];
                const div = document.createElement('div');
                div.className = 'cell';

                if (cell.type === this.WALL) {
                    div.classList.add('wall');
                    if (cell.number !== null) {
                        div.classList.add('numbered');
                        div.textContent = cell.number;

                        const adjacentBulbs = this.getAdjacentBulbCount(x, y);
                        if (adjacentBulbs === cell.number) {
                            div.classList.add('satisfied');
                        } else if (adjacentBulbs > cell.number) {
                            div.classList.add('unsatisfied');
                        }
                    }
                } else {
                    div.classList.add('empty');

                    if (cell.bulb) {
                        div.classList.add('bulb');
                        div.textContent = '💡';
                        if (this.hasConflict(x, y)) {
                            div.classList.add('conflict');
                        }
                    } else if (cell.marked) {
                        div.classList.add('marked');
                    } else if (this.isLit(x, y)) {
                        div.classList.add('lit');
                    }

                    div.addEventListener('click', () => this.handleClick(x, y));
                }

                this.boardEl.appendChild(div);
            }
        }
    }
}

new LightUp();
