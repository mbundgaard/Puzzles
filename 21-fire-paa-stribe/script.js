class ConnectFour {
    constructor() {
        this.boardEl = document.getElementById('board');
        this.statusEl = document.getElementById('status');
        this.messageEl = document.getElementById('message');
        this.difficultySelect = document.getElementById('difficulty');
        this.newGameBtn = document.getElementById('new-game');
        this.helpToggle = document.getElementById('help-toggle');
        this.helpContent = document.getElementById('help-content');

        this.ROWS = 6;
        this.COLS = 7;
        this.PLAYER = 1;
        this.AI = 2;
        this.EMPTY = 0;

        this.board = [];
        this.currentPlayer = this.PLAYER;
        this.gameOver = false;
        this.winningCells = [];

        this.setupEventListeners();
        this.newGame();
    }

    setupEventListeners() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.difficultySelect.addEventListener('change', () => this.newGame());
        this.helpToggle.addEventListener('click', () => {
            this.helpContent.classList.toggle('show');
        });
    }

    newGame() {
        this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(this.EMPTY));
        this.currentPlayer = this.PLAYER;
        this.gameOver = false;
        this.winningCells = [];

        this.messageEl.textContent = '';
        this.messageEl.className = 'message';

        this.updateStatus();
        this.render();

        HjernespilAPI.trackStart('21');
    }

    updateStatus() {
        if (this.gameOver) return;

        if (this.currentPlayer === this.PLAYER) {
            this.statusEl.textContent = 'Din tur';
            this.statusEl.className = 'status player-turn';
        } else {
            this.statusEl.textContent = 'Computeren tænker...';
            this.statusEl.className = 'status ai-turn';
        }
    }

    render() {
        this.boardEl.innerHTML = '';

        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.col = col;
                cell.dataset.row = row;

                if (this.board[row][col] === this.PLAYER) {
                    cell.classList.add('player');
                } else if (this.board[row][col] === this.AI) {
                    cell.classList.add('ai');
                }

                if (this.winningCells.some(([r, c]) => r === row && c === col)) {
                    cell.classList.add('winning');
                }

                if (this.gameOver || this.currentPlayer === this.AI) {
                    cell.classList.add('disabled');
                } else {
                    cell.addEventListener('click', () => this.handleClick(col));
                }

                this.boardEl.appendChild(cell);
            }
        }
    }

    handleClick(col) {
        if (this.gameOver || this.currentPlayer !== this.PLAYER) return;

        const row = this.getLowestEmptyRow(col);
        if (row === -1) return; // Column is full

        this.makeMove(col, this.PLAYER);

        if (!this.gameOver) {
            this.currentPlayer = this.AI;
            this.updateStatus();
            this.render();

            // AI move with slight delay for better UX
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    getLowestEmptyRow(col) {
        for (let row = this.ROWS - 1; row >= 0; row--) {
            if (this.board[row][col] === this.EMPTY) {
                return row;
            }
        }
        return -1;
    }

    makeMove(col, player) {
        const row = this.getLowestEmptyRow(col);
        if (row === -1) return false;

        this.board[row][col] = player;

        // Check for win
        const win = this.checkWin(player);
        if (win) {
            this.gameOver = true;
            this.winningCells = win;

            if (player === this.PLAYER) {
                this.messageEl.textContent = 'Tillykke! Du vandt!';
                this.messageEl.className = 'message victory';
                this.statusEl.textContent = 'Du vandt!';
                this.statusEl.className = 'status player-turn';

                HjernespilAPI.trackComplete('21');
                setTimeout(() => HjernespilUI.showWinModal(3), 500);
            } else {
                this.messageEl.textContent = 'Computeren vandt!';
                this.messageEl.className = 'message defeat';
                this.statusEl.textContent = 'Du tabte';
                this.statusEl.className = 'status ai-turn';
            }
        } else if (this.isBoardFull()) {
            this.gameOver = true;
            this.messageEl.textContent = 'Uafgjort!';
            this.messageEl.className = 'message draw';
            this.statusEl.textContent = 'Uafgjort';
            this.statusEl.className = 'status';
        }

        this.render();

        // Add drop animation to the new piece
        const cells = this.boardEl.querySelectorAll('.cell');
        const cellIndex = row * this.COLS + col;
        if (cells[cellIndex]) {
            cells[cellIndex].classList.add('dropping');
        }

        return true;
    }

    checkWin(player) {
        // Check all possible 4-in-a-row
        const directions = [
            [0, 1],   // horizontal
            [1, 0],   // vertical
            [1, 1],   // diagonal down-right
            [1, -1]   // diagonal down-left
        ];

        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                if (this.board[row][col] !== player) continue;

                for (const [dr, dc] of directions) {
                    const cells = [[row, col]];
                    let r = row + dr;
                    let c = col + dc;

                    while (
                        r >= 0 && r < this.ROWS &&
                        c >= 0 && c < this.COLS &&
                        this.board[r][c] === player &&
                        cells.length < 4
                    ) {
                        cells.push([r, c]);
                        r += dr;
                        c += dc;
                    }

                    if (cells.length >= 4) {
                        return cells;
                    }
                }
            }
        }

        return null;
    }

    isBoardFull() {
        return this.board[0].every(cell => cell !== this.EMPTY);
    }

    makeAIMove() {
        if (this.gameOver) return;

        const difficulty = this.difficultySelect.value;
        let depth;

        switch (difficulty) {
            case 'easy': depth = 2; break;
            case 'medium': depth = 4; break;
            case 'hard': depth = 6; break;
            default: depth = 4;
        }

        const col = this.getBestMove(depth);
        this.makeMove(col, this.AI);

        if (!this.gameOver) {
            this.currentPlayer = this.PLAYER;
            this.updateStatus();
            this.render();
        }
    }

    getBestMove(depth) {
        let bestScore = -Infinity;
        let bestCols = [];

        const validCols = this.getValidColumns();

        for (const col of validCols) {
            const row = this.getLowestEmptyRow(col);
            this.board[row][col] = this.AI;

            const score = this.minimax(depth - 1, -Infinity, Infinity, false);

            this.board[row][col] = this.EMPTY;

            if (score > bestScore) {
                bestScore = score;
                bestCols = [col];
            } else if (score === bestScore) {
                bestCols.push(col);
            }
        }

        // Randomly pick among equally good moves
        return bestCols[Math.floor(Math.random() * bestCols.length)];
    }

    minimax(depth, alpha, beta, isMaximizing) {
        const aiWin = this.checkWin(this.AI);
        const playerWin = this.checkWin(this.PLAYER);

        if (aiWin) return 10000 + depth;
        if (playerWin) return -10000 - depth;
        if (this.isBoardFull() || depth === 0) {
            return this.evaluateBoard();
        }

        const validCols = this.getValidColumns();

        if (isMaximizing) {
            let maxScore = -Infinity;

            for (const col of validCols) {
                const row = this.getLowestEmptyRow(col);
                this.board[row][col] = this.AI;

                const score = this.minimax(depth - 1, alpha, beta, false);

                this.board[row][col] = this.EMPTY;

                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);

                if (beta <= alpha) break;
            }

            return maxScore;
        } else {
            let minScore = Infinity;

            for (const col of validCols) {
                const row = this.getLowestEmptyRow(col);
                this.board[row][col] = this.PLAYER;

                const score = this.minimax(depth - 1, alpha, beta, true);

                this.board[row][col] = this.EMPTY;

                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);

                if (beta <= alpha) break;
            }

            return minScore;
        }
    }

    evaluateBoard() {
        let score = 0;

        // Evaluate all possible windows of 4
        const directions = [
            [0, 1],   // horizontal
            [1, 0],   // vertical
            [1, 1],   // diagonal down-right
            [1, -1]   // diagonal down-left
        ];

        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                for (const [dr, dc] of directions) {
                    const window = [];

                    for (let i = 0; i < 4; i++) {
                        const r = row + dr * i;
                        const c = col + dc * i;

                        if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) {
                            window.push(this.board[r][c]);
                        }
                    }

                    if (window.length === 4) {
                        score += this.evaluateWindow(window);
                    }
                }
            }
        }

        // Prefer center column
        for (let row = 0; row < this.ROWS; row++) {
            if (this.board[row][3] === this.AI) score += 3;
            if (this.board[row][3] === this.PLAYER) score -= 3;
        }

        return score;
    }

    evaluateWindow(window) {
        const aiCount = window.filter(c => c === this.AI).length;
        const playerCount = window.filter(c => c === this.PLAYER).length;
        const emptyCount = window.filter(c => c === this.EMPTY).length;

        if (aiCount === 4) return 100;
        if (aiCount === 3 && emptyCount === 1) return 10;
        if (aiCount === 2 && emptyCount === 2) return 2;

        if (playerCount === 4) return -100;
        if (playerCount === 3 && emptyCount === 1) return -10;
        if (playerCount === 2 && emptyCount === 2) return -2;

        return 0;
    }

    getValidColumns() {
        const valid = [];
        for (let col = 0; col < this.COLS; col++) {
            if (this.board[0][col] === this.EMPTY) {
                valid.push(col);
            }
        }
        return valid;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    new ConnectFour();
});
