class Nonogram {
    constructor() {
        this.size = 8;
        this.solution = [];
        this.playerGrid = [];
        this.fillMode = true;

        this.puzzleEl = document.getElementById('puzzle');
        this.newGameBtn = document.getElementById('new-game');
        this.sizeSelect = document.getElementById('size');
        this.fillModeBtn = document.getElementById('fill-mode');
        this.markModeBtn = document.getElementById('mark-mode');
        this.victoryOverlay = document.getElementById('victory');
        this.playAgainBtn = document.getElementById('play-again');

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.playAgainBtn.addEventListener('click', () => {
            this.victoryOverlay.classList.remove('show');
            this.newGame();
        });
        this.sizeSelect.addEventListener('change', (e) => {
            this.size = parseInt(e.target.value);
            this.newGame();
        });

        this.fillModeBtn.addEventListener('click', () => {
            this.fillMode = true;
            this.fillModeBtn.classList.add('active');
            this.markModeBtn.classList.remove('active');
        });

        this.markModeBtn.addEventListener('click', () => {
            this.fillMode = false;
            this.markModeBtn.classList.add('active');
            this.fillModeBtn.classList.remove('active');
        });

        this.newGame();
    }

    newGame() {
        this.solution = this.generatePuzzle();
        this.playerGrid = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
        this.rowHints = this.calculateHints(this.solution);
        this.colHints = this.calculateHints(this.transpose(this.solution));
        this.render();
        HjernespilAPI.sessionEvent('newGame');
    }

    generatePuzzle() {
        const grid = [];
        for (let r = 0; r < this.size; r++) {
            const row = [];
            for (let c = 0; c < this.size; c++) {
                row.push(Math.random() < 0.5 ? 1 : 0);
            }
            grid.push(row);
        }
        return grid;
    }

    transpose(grid) {
        return grid[0].map((_, i) => grid.map(row => row[i]));
    }

    calculateHints(grid) {
        return grid.map(row => {
            const hints = [];
            let count = 0;
            for (const cell of row) {
                if (cell === 1) {
                    count++;
                } else if (count > 0) {
                    hints.push(count);
                    count = 0;
                }
            }
            if (count > 0) hints.push(count);
            return hints.length ? hints : [0];
        });
    }

    render() {
        const cols = this.size + 1;
        this.puzzleEl.style.gridTemplateColumns = `auto repeat(${this.size}, 1fr)`;
        this.puzzleEl.innerHTML = '';

        // Corner cell
        const corner = document.createElement('div');
        corner.className = 'corner';
        this.puzzleEl.appendChild(corner);

        // Column hints
        for (let c = 0; c < this.size; c++) {
            const hints = document.createElement('div');
            hints.className = 'col-hints';
            hints.innerHTML = this.colHints[c].map(h => `<span>${h}</span>`).join('');
            this.puzzleEl.appendChild(hints);
        }

        // Rows
        for (let r = 0; r < this.size; r++) {
            // Row hints
            const hints = document.createElement('div');
            hints.className = 'row-hints';
            hints.innerHTML = this.rowHints[r].map(h => `<span>${h}</span>`).join('');
            this.puzzleEl.appendChild(hints);

            // Cells
            for (let c = 0; c < this.size; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                if (this.playerGrid[r][c] === 1) {
                    cell.classList.add('filled');
                } else if (this.playerGrid[r][c] === 2) {
                    cell.classList.add('marked');
                }

                cell.addEventListener('click', () => this.toggleCell(r, c));
                this.puzzleEl.appendChild(cell);
            }
        }
    }

    toggleCell(row, col) {
        if (this.fillMode) {
            this.playerGrid[row][col] = this.playerGrid[row][col] === 1 ? 0 : 1;
        } else {
            this.playerGrid[row][col] = this.playerGrid[row][col] === 2 ? 0 : 2;
        }
        this.render();

        if (this.checkWin()) {
            setTimeout(() => this.showVictory(), 300);
        }
    }

    checkWin() {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const playerFilled = this.playerGrid[r][c] === 1;
                const solutionFilled = this.solution[r][c] === 1;
                if (playerFilled !== solutionFilled) return false;
            }
        }
        return true;
    }

    showVictory() {
        this.victoryOverlay.classList.add('show');
        HjernespilAPI.sessionEvent('win');
        HjernespilUI.showWinModal(3);
    }
}

new Nonogram();
