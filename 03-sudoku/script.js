class Sudoku {
    constructor() {
        this.board = [];
        this.solution = [];
        this.given = [];
        this.selectedCell = null;
        this.difficulty = 'medium';

        this.boardEl = document.getElementById('board');
        this.numpadEl = document.getElementById('numpad');
        this.newGameBtn = document.getElementById('new-game');
        this.difficultySelect = document.getElementById('difficulty');
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
        this.difficultySelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
        });

        this.numpadEl.addEventListener('click', (e) => {
            if (e.target.dataset.num !== undefined) {
                this.enterNumber(parseInt(e.target.dataset.num));
            }
        });

        this.newGame();
    }

    newGame() {
        this.solution = this.generateSolution();
        this.board = this.solution.map(row => [...row]);
        this.removeNumbers();
        this.given = this.board.map(row => row.map(cell => cell !== 0));
        this.selectedCell = null;
        this.render();
        HjernespilAPI.sessionEvent('newGame');
    }

    generateSolution() {
        const grid = Array(9).fill(null).map(() => Array(9).fill(0));
        this.fillGrid(grid);
        return grid;
    }

    fillGrid(grid) {
        const find = this.findEmpty(grid);
        if (!find) return true;

        const [row, col] = find;
        const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const num of nums) {
            if (this.isValid(grid, row, col, num)) {
                grid[row][col] = num;
                if (this.fillGrid(grid)) return true;
                grid[row][col] = 0;
            }
        }
        return false;
    }

    findEmpty(grid) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) return [r, c];
            }
        }
        return null;
    }

    isValid(grid, row, col, num) {
        for (let c = 0; c < 9; c++) {
            if (grid[row][c] === num) return false;
        }
        for (let r = 0; r < 9; r++) {
            if (grid[r][col] === num) return false;
        }
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
                if (grid[r][c] === num) return false;
            }
        }
        return true;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    removeNumbers() {
        const counts = { easy: 35, medium: 45, hard: 55 };
        let toRemove = counts[this.difficulty];

        while (toRemove > 0) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (this.board[row][col] !== 0) {
                this.board[row][col] = 0;
                toRemove--;
            }
        }
    }

    render() {
        this.boardEl.innerHTML = '';

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                if (this.board[r][c] !== 0) {
                    cell.textContent = this.board[r][c];
                }

                if (this.given[r][c]) {
                    cell.classList.add('given');
                }

                if (this.selectedCell && this.selectedCell.row === r && this.selectedCell.col === c) {
                    cell.classList.add('selected');
                }

                if (this.selectedCell) {
                    if (this.selectedCell.row === r || this.selectedCell.col === c) {
                        cell.classList.add('highlight');
                    }
                    const boxRow = Math.floor(this.selectedCell.row / 3);
                    const boxCol = Math.floor(this.selectedCell.col / 3);
                    if (Math.floor(r / 3) === boxRow && Math.floor(c / 3) === boxCol) {
                        cell.classList.add('highlight');
                    }
                }

                cell.addEventListener('click', () => this.selectCell(r, c));
                this.boardEl.appendChild(cell);
            }
        }
    }

    selectCell(row, col) {
        if (this.given[row][col]) return;
        this.selectedCell = { row, col };
        this.render();
    }

    enterNumber(num) {
        if (!this.selectedCell) return;
        const { row, col } = this.selectedCell;
        if (this.given[row][col]) return;

        this.board[row][col] = num;
        this.render();

        if (this.checkWin()) {
            setTimeout(() => this.showVictory(), 300);
        }
    }

    checkWin() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] !== this.solution[r][c]) return false;
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

new Sudoku();
