class TicTacToe {
    constructor() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.difficulty = 'easy';
        this.scores = { player: 0, ai: 0, draw: 0 };

        this.cells = document.querySelectorAll('.cell');
        this.status = document.getElementById('status');
        this.newGameBtn = document.getElementById('new-game');
        this.diffBtns = document.querySelectorAll('.diff-btn');
        this.playerScoreEl = document.getElementById('player-score');
        this.aiScoreEl = document.getElementById('ai-score');
        this.drawScoreEl = document.getElementById('draw-score');

        this.winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]              // Diagonals
        ];

        this.cells.forEach(cell => {
            cell.addEventListener('click', () => this.handleClick(cell));
        });

        this.newGameBtn.addEventListener('click', () => this.newGame());

        this.diffBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.difficulty = btn.dataset.diff;
                this.newGame();
            });
        });

        this.newGame();
    }

    newGame() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;

        this.cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'cell';
        });

        this.status.textContent = 'Din tur (X)';
        this.status.className = 'status';
        HjernespilAPI.trackStart('11');
    }

    handleClick(cell) {
        if (this.gameOver || this.currentPlayer !== 'X') return;

        const index = parseInt(cell.dataset.index);
        if (this.board[index]) return;

        this.makeMove(index, 'X');

        if (!this.gameOver) {
            this.currentPlayer = 'O';
            this.status.textContent = 'AI tænker...';
            setTimeout(() => this.aiMove(), 500);
        }
    }

    makeMove(index, player) {
        this.board[index] = player;
        const cell = this.cells[index];
        cell.textContent = player;
        cell.classList.add(player.toLowerCase());

        const winner = this.checkWinner();
        if (winner) {
            this.endGame(winner);
        } else if (!this.board.includes(null)) {
            this.endGame('draw');
        }
    }

    aiMove() {
        if (this.gameOver) return;

        let move;
        switch (this.difficulty) {
            case 'easy':
                move = this.getRandomMove();
                break;
            case 'medium':
                move = Math.random() < 0.6 ? this.getBestMove() : this.getRandomMove();
                break;
            case 'hard':
                move = this.getBestMove();
                break;
        }

        if (move !== null) {
            this.makeMove(move, 'O');
        }

        if (!this.gameOver) {
            this.currentPlayer = 'X';
            this.status.textContent = 'Din tur (X)';
        }
    }

    getRandomMove() {
        const available = this.board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }

    getBestMove() {
        // Minimax algorithm
        let bestScore = -Infinity;
        let bestMove = null;

        for (let i = 0; i < 9; i++) {
            if (this.board[i] === null) {
                this.board[i] = 'O';
                const score = this.minimax(this.board, 0, false);
                this.board[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = i;
                }
            }
        }

        return bestMove;
    }

    minimax(board, depth, isMaximizing) {
        const winner = this.checkWinner();
        if (winner === 'O') return 10 - depth;
        if (winner === 'X') return depth - 10;
        if (!board.includes(null)) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'O';
                    const score = this.minimax(board, depth + 1, false);
                    board[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'X';
                    const score = this.minimax(board, depth + 1, true);
                    board[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    checkWinner() {
        for (const pattern of this.winPatterns) {
            const [a, b, c] = pattern;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return this.board[a];
            }
        }
        return null;
    }

    getWinningPattern() {
        for (const pattern of this.winPatterns) {
            const [a, b, c] = pattern;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return pattern;
            }
        }
        return null;
    }

    endGame(result) {
        this.gameOver = true;
        this.cells.forEach(cell => cell.classList.add('disabled'));

        const winPattern = this.getWinningPattern();
        if (winPattern) {
            winPattern.forEach(idx => {
                this.cells[idx].classList.add('winning');
            });
        }

        if (result === 'X') {
            this.status.textContent = 'Du vandt!';
            this.status.className = 'status winner';
            this.scores.player++;
            this.playerScoreEl.textContent = this.scores.player;
            HjernespilAPI.trackComplete('11');
        } else if (result === 'O') {
            this.status.textContent = 'AI vandt!';
            this.status.className = 'status loser';
            this.scores.ai++;
            this.aiScoreEl.textContent = this.scores.ai;
        } else {
            this.status.textContent = 'Uafgjort!';
            this.status.className = 'status draw';
            this.scores.draw++;
            this.drawScoreEl.textContent = this.scores.draw;
        }
    }
}

// Start game
new TicTacToe();
