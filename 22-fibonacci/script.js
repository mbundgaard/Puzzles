class Fibonacci {
    constructor() {
        this.boardEl = document.getElementById('board');
        this.scoreEl = document.getElementById('score');
        this.bestScoreEl = document.getElementById('best-score');
        this.messageEl = document.getElementById('message');
        this.newGameBtn = document.getElementById('new-game');
        this.undoBtn = document.getElementById('undo-btn');
        this.helpToggle = document.getElementById('help-toggle');
        this.helpContent = document.getElementById('help-content');

        this.SIZE = 4;
        this.board = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('fibonacci_best') || '0');
        this.gameOver = false;
        this.previousState = null;

        // Generate Fibonacci lookup
        this.fibSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];
        this.fibSet = new Set(this.fibSequence);

        this.setupEventListeners();
        this.updateBestScore();
        this.newGame();
    }

    setupEventListeners() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.undoBtn.addEventListener('click', () => this.undo());
        this.helpToggle.addEventListener('click', () => {
            this.helpContent.classList.toggle('show');
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                this.handleMove(e.key.replace('Arrow', '').toLowerCase());
            }
        });

        // Arrow button controls
        document.getElementById('btn-up').addEventListener('click', () => this.handleMove('up'));
        document.getElementById('btn-down').addEventListener('click', () => this.handleMove('down'));
        document.getElementById('btn-left').addEventListener('click', () => this.handleMove('left'));
        document.getElementById('btn-right').addEventListener('click', () => this.handleMove('right'));
    }

    newGame() {
        this.board = Array(this.SIZE).fill(null).map(() => Array(this.SIZE).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.previousState = null;

        this.messageEl.textContent = '';
        this.messageEl.className = 'message';

        this.addRandomTile();
        this.addRandomTile();

        this.updateScore();
        this.updateUndoButton();
        this.render();

        HjernespilAPI.trackStart('22');
    }

    saveState() {
        this.previousState = {
            board: this.board.map(row => [...row]),
            score: this.score
        };
        this.updateUndoButton();
    }

    undo() {
        if (!this.previousState || this.gameOver) return;

        this.board = this.previousState.board;
        this.score = this.previousState.score;
        this.previousState = null;

        this.updateScore();
        this.updateUndoButton();
        this.render();
    }

    updateUndoButton() {
        this.undoBtn.disabled = !this.previousState || this.gameOver;
    }

    addRandomTile() {
        const emptyCells = [];

        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.board[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length === 0) return;

        const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        // 80% chance for 1, 20% chance for 2
        this.board[cell.row][cell.col] = Math.random() < 0.8 ? 1 : 2;
    }

    canMerge(a, b) {
        if (a === 0 || b === 0) return false;

        // Special case: two 1s can merge into 2
        if (a === 1 && b === 1) return true;

        // Check if they are consecutive Fibonacci numbers
        const indexA = this.fibSequence.indexOf(a);
        const indexB = this.fibSequence.indexOf(b);

        if (indexA === -1 || indexB === -1) return false;

        // They need to be consecutive (but skip the first 1)
        // 1, 1, 2, 3, 5... indices are 0, 1, 2, 3, 4...
        // 1(0)+1(1)=2, 1(1)+2(2)=3, 2(2)+3(3)=5, etc.
        return Math.abs(indexA - indexB) === 1 && !(a === 1 && b === 1 && indexA === 0);
    }

    getMergeResult(a, b) {
        if (a === 1 && b === 1) return 2;

        // Return the next Fibonacci number
        return a + b;
    }

    handleMove(direction) {
        if (this.gameOver) return;

        this.saveState();

        let moved = false;

        switch (direction) {
            case 'up':
                moved = this.moveUp();
                break;
            case 'down':
                moved = this.moveDown();
                break;
            case 'left':
                moved = this.moveLeft();
                break;
            case 'right':
                moved = this.moveRight();
                break;
        }

        if (moved) {
            this.addRandomTile();
            this.updateScore();
            this.render();

            if (!this.canMove()) {
                this.gameOver = true;
                this.messageEl.textContent = 'Spillet er slut!';
                this.messageEl.className = 'message game-over';
                this.updateUndoButton();
            }
        } else {
            // Restore state if no move was made
            this.previousState = null;
            this.updateUndoButton();
        }
    }

    moveLeft() {
        let moved = false;

        for (let row = 0; row < this.SIZE; row++) {
            const newRow = this.processLine(this.board[row]);
            if (newRow.toString() !== this.board[row].toString()) {
                moved = true;
            }
            this.board[row] = newRow;
        }

        return moved;
    }

    moveRight() {
        let moved = false;

        for (let row = 0; row < this.SIZE; row++) {
            const reversed = [...this.board[row]].reverse();
            const processed = this.processLine(reversed);
            const newRow = processed.reverse();

            if (newRow.toString() !== this.board[row].toString()) {
                moved = true;
            }
            this.board[row] = newRow;
        }

        return moved;
    }

    moveUp() {
        let moved = false;

        for (let col = 0; col < this.SIZE; col++) {
            const column = this.board.map(row => row[col]);
            const newColumn = this.processLine(column);

            if (newColumn.toString() !== column.toString()) {
                moved = true;
            }

            for (let row = 0; row < this.SIZE; row++) {
                this.board[row][col] = newColumn[row];
            }
        }

        return moved;
    }

    moveDown() {
        let moved = false;

        for (let col = 0; col < this.SIZE; col++) {
            const column = this.board.map(row => row[col]).reverse();
            const processed = this.processLine(column);
            const newColumn = processed.reverse();

            const originalColumn = this.board.map(row => row[col]);
            if (newColumn.toString() !== originalColumn.toString()) {
                moved = true;
            }

            for (let row = 0; row < this.SIZE; row++) {
                this.board[row][col] = newColumn[row];
            }
        }

        return moved;
    }

    processLine(line) {
        // Remove zeros and process merges
        let filtered = line.filter(x => x !== 0);
        const result = [];

        let i = 0;
        while (i < filtered.length) {
            if (i + 1 < filtered.length && this.canMerge(filtered[i], filtered[i + 1])) {
                const merged = this.getMergeResult(filtered[i], filtered[i + 1]);
                result.push(merged);
                this.score += merged;
                i += 2;
            } else {
                result.push(filtered[i]);
                i++;
            }
        }

        // Pad with zeros
        while (result.length < this.SIZE) {
            result.push(0);
        }

        return result;
    }

    canMove() {
        // Check for empty cells
        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.board[row][col] === 0) return true;
            }
        }

        // Check for possible merges
        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                const current = this.board[row][col];

                // Check right
                if (col + 1 < this.SIZE && this.canMerge(current, this.board[row][col + 1])) {
                    return true;
                }

                // Check down
                if (row + 1 < this.SIZE && this.canMerge(current, this.board[row + 1][col])) {
                    return true;
                }
            }
        }

        return false;
    }

    updateScore() {
        this.scoreEl.textContent = this.score;

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('fibonacci_best', this.bestScore.toString());
            this.updateBestScore();
        }
    }

    updateBestScore() {
        this.bestScoreEl.textContent = this.bestScore;
    }

    render() {
        this.boardEl.innerHTML = '';

        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                const value = this.board[row][col];
                const tile = document.createElement('div');
                tile.className = 'tile';

                if (value === 0) {
                    tile.classList.add('empty');
                } else {
                    tile.classList.add(`t${value}`);
                    tile.textContent = value;
                }

                this.boardEl.appendChild(tile);
            }
        }
    }

    // Check if player has reached a high Fibonacci number (like 610)
    checkVictory() {
        for (let row = 0; row < this.SIZE; row++) {
            for (let col = 0; col < this.SIZE; col++) {
                if (this.board[row][col] >= 610) {
                    this.messageEl.textContent = `Tillykke! Du nåede ${this.board[row][col]}!`;
                    this.messageEl.className = 'message victory';

                    HjernespilAPI.trackComplete('22');
                    HjernespilUI.showWinModal();

                    return true;
                }
            }
        }
        return false;
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    new Fibonacci();
});
