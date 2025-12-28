class Minesweeper {
    constructor() {
        this.difficulties = {
            easy: { rows: 8, cols: 8, mines: 10 },
            medium: { rows: 10, cols: 10, mines: 20 },
            hard: { rows: 12, cols: 12, mines: 35 }
        };
        this.difficulty = 'medium';
        this.grid = [];
        this.revealed = [];
        this.flagged = [];
        this.gameOver = false;
        this.firstClick = true;
        this.flagMode = false;

        this.boardEl = document.getElementById('board');
        this.minesCountEl = document.getElementById('mines-count');
        this.newGameBtn = document.getElementById('new-game');
        this.difficultySelect = document.getElementById('difficulty');
        this.digModeBtn = document.getElementById('dig-mode');
        this.flagModeBtn = document.getElementById('flag-mode');
        this.gameOverOverlay = document.getElementById('game-over');
        this.victoryOverlay = document.getElementById('victory');
        this.retryBtn = document.getElementById('retry');
        this.playAgainBtn = document.getElementById('play-again');

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.retryBtn.addEventListener('click', () => {
            this.gameOverOverlay.classList.remove('show');
            this.newGame();
        });
        this.playAgainBtn.addEventListener('click', () => {
            this.victoryOverlay.classList.remove('show');
            this.newGame();
        });
        this.difficultySelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.newGame();
        });

        this.digModeBtn.addEventListener('click', () => {
            this.flagMode = false;
            this.digModeBtn.classList.add('active');
            this.flagModeBtn.classList.remove('active');
        });

        this.flagModeBtn.addEventListener('click', () => {
            this.flagMode = true;
            this.flagModeBtn.classList.add('active');
            this.digModeBtn.classList.remove('active');
        });

        this.newGame();
    }

    newGame() {
        const { rows, cols, mines } = this.difficulties[this.difficulty];
        this.rows = rows;
        this.cols = cols;
        this.totalMines = mines;
        this.grid = Array(rows).fill(null).map(() => Array(cols).fill(0));
        this.revealed = Array(rows).fill(null).map(() => Array(cols).fill(false));
        this.flagged = Array(rows).fill(null).map(() => Array(cols).fill(false));
        this.gameOver = false;
        this.firstClick = true;
        this.updateMinesCount();
        this.render();
        HjernespilAPI.trackStart('06');
    }

    placeMines(excludeRow, excludeCol) {
        let placed = 0;
        while (placed < this.totalMines) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);
            if (this.grid[r][c] !== -1 && !(r === excludeRow && c === excludeCol)) {
                this.grid[r][c] = -1;
                placed++;
            }
        }
        this.calculateNumbers();
    }

    calculateNumbers() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === -1) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                            if (this.grid[nr][nc] === -1) count++;
                        }
                    }
                }
                this.grid[r][c] = count;
            }
        }
    }

    updateMinesCount() {
        let flagCount = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.flagged[r][c]) flagCount++;
            }
        }
        this.minesCountEl.textContent = this.totalMines - flagCount;
    }

    render() {
        this.boardEl.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        this.boardEl.innerHTML = '';

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                if (this.revealed[r][c]) {
                    cell.classList.add('revealed');
                    if (this.grid[r][c] === -1) {
                        cell.classList.add('mine');
                        cell.textContent = '💣';
                    } else if (this.grid[r][c] > 0) {
                        cell.textContent = this.grid[r][c];
                        cell.classList.add('n' + this.grid[r][c]);
                    }
                } else if (this.flagged[r][c]) {
                    cell.classList.add('flagged');
                    cell.textContent = '🚩';
                }

                cell.addEventListener('click', () => this.handleClick(r, c));
                this.boardEl.appendChild(cell);
            }
        }
    }

    handleClick(row, col) {
        if (this.gameOver || this.revealed[row][col]) return;

        if (this.flagMode) {
            this.toggleFlag(row, col);
            return;
        }

        if (this.flagged[row][col]) return;

        if (this.firstClick) {
            this.placeMines(row, col);
            this.firstClick = false;
        }

        this.reveal(row, col);
    }

    toggleFlag(row, col) {
        if (this.revealed[row][col]) return;
        this.flagged[row][col] = !this.flagged[row][col];
        this.updateMinesCount();
        this.render();
    }

    reveal(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
        if (this.revealed[row][col] || this.flagged[row][col]) return;

        this.revealed[row][col] = true;

        if (this.grid[row][col] === -1) {
            this.gameOver = true;
            this.revealAll();
            this.render();
            setTimeout(() => this.gameOverOverlay.classList.add('show'), 300);
            return;
        }

        if (this.grid[row][col] === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    this.reveal(row + dr, col + dc);
                }
            }
        }

        this.render();

        if (this.checkWin()) {
            this.gameOver = true;
            setTimeout(() => this.victoryOverlay.classList.add('show'), 300);
            HjernespilAPI.trackComplete('06');
        }
    }

    revealAll() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === -1) {
                    this.revealed[r][c] = true;
                }
            }
        }
    }

    checkWin() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== -1 && !this.revealed[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }
}

new Minesweeper();
