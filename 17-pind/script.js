class PegSolitaire {
    constructor() {
        this.boardEl = document.getElementById('board');
        this.boardTypeSelect = document.getElementById('board-type');
        this.newGameBtn = document.getElementById('new-game');
        this.undoBtn = document.getElementById('undo');
        this.movesEl = document.getElementById('moves');
        this.pegsEl = document.getElementById('pegs');
        this.victoryOverlay = document.getElementById('victory');
        this.victoryTitle = document.getElementById('victory-title');
        this.victoryMessage = document.getElementById('victory-message');
        this.playAgainBtn = document.getElementById('play-again');

        this.board = [];
        this.selectedPeg = null;
        this.moves = 0;
        this.history = [];

        // Board layouts
        // 0 = invalid, 1 = hole, 2 = peg
        this.layouts = {
            english: [
                [0, 0, 1, 1, 1, 0, 0],
                [0, 0, 1, 1, 1, 0, 0],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [0, 0, 1, 1, 1, 0, 0],
                [0, 0, 1, 1, 1, 0, 0]
            ],
            european: [
                [0, 0, 1, 1, 1, 0, 0],
                [0, 1, 1, 1, 1, 1, 0],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [0, 1, 1, 1, 1, 1, 0],
                [0, 0, 1, 1, 1, 0, 0]
            ]
        };

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.playAgainBtn.addEventListener('click', () => {
            this.victoryOverlay.classList.remove('show');
            this.newGame();
        });
        this.boardTypeSelect.addEventListener('change', () => this.newGame());
        this.undoBtn.addEventListener('click', () => this.undo());

        this.newGame();
    }

    newGame() {
        const boardType = this.boardTypeSelect.value;
        const layout = this.layouts[boardType];

        this.board = [];
        for (let y = 0; y < 7; y++) {
            const row = [];
            for (let x = 0; x < 7; x++) {
                if (layout[y][x] === 0) {
                    row.push('invalid');
                } else if (x === 3 && y === 3) {
                    row.push('hole'); // Center starts empty
                } else {
                    row.push('peg');
                }
            }
            this.board.push(row);
        }

        this.selectedPeg = null;
        this.moves = 0;
        this.history = [];
        this.updateStats();
        this.render();
        HjernespilAPI.trackStart('17');
    }

    updateStats() {
        this.movesEl.textContent = this.moves;
        this.pegsEl.textContent = this.countPegs();
        this.undoBtn.disabled = this.history.length === 0;
    }

    countPegs() {
        let count = 0;
        for (let y = 0; y < 7; y++) {
            for (let x = 0; x < 7; x++) {
                if (this.board[y][x] === 'peg') count++;
            }
        }
        return count;
    }

    getValidMoves(x, y) {
        const moves = [];
        const directions = [
            [0, -2, 0, -1], // Up
            [0, 2, 0, 1],   // Down
            [-2, 0, -1, 0], // Left
            [2, 0, 1, 0]    // Right
        ];

        for (const [dx, dy, jx, jy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            const jumpX = x + jx;
            const jumpY = y + jy;

            if (newX >= 0 && newX < 7 && newY >= 0 && newY < 7) {
                if (this.board[newY][newX] === 'hole' &&
                    this.board[jumpY][jumpX] === 'peg') {
                    moves.push({ toX: newX, toY: newY, jumpX, jumpY });
                }
            }
        }

        return moves;
    }

    hasAnyValidMoves() {
        for (let y = 0; y < 7; y++) {
            for (let x = 0; x < 7; x++) {
                if (this.board[y][x] === 'peg') {
                    if (this.getValidMoves(x, y).length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    handleClick(x, y) {
        const cell = this.board[y][x];

        if (cell === 'invalid') return;

        if (cell === 'peg') {
            if (this.selectedPeg && this.selectedPeg.x === x && this.selectedPeg.y === y) {
                // Deselect
                this.selectedPeg = null;
            } else {
                // Select new peg
                const moves = this.getValidMoves(x, y);
                if (moves.length > 0) {
                    this.selectedPeg = { x, y, moves };
                } else {
                    this.selectedPeg = null;
                }
            }
            this.render();
            return;
        }

        if (cell === 'hole' && this.selectedPeg) {
            // Try to make a move
            const move = this.selectedPeg.moves.find(m => m.toX === x && m.toY === y);
            if (move) {
                this.makeMove(this.selectedPeg.x, this.selectedPeg.y, move);
            }
            this.selectedPeg = null;
            this.render();

            // Check for game over
            setTimeout(() => this.checkGameOver(), 100);
        }
    }

    makeMove(fromX, fromY, move) {
        // Save state for undo
        this.history.push({
            fromX, fromY,
            toX: move.toX, toY: move.toY,
            jumpX: move.jumpX, jumpY: move.jumpY
        });

        // Execute move
        this.board[fromY][fromX] = 'hole';
        this.board[move.jumpY][move.jumpX] = 'hole';
        this.board[move.toY][move.toX] = 'peg';
        this.moves++;
        this.updateStats();
    }

    undo() {
        if (this.history.length === 0) return;

        const move = this.history.pop();
        this.board[move.fromY][move.fromX] = 'peg';
        this.board[move.jumpY][move.jumpX] = 'peg';
        this.board[move.toY][move.toX] = 'hole';
        this.moves--;
        this.selectedPeg = null;
        this.updateStats();
        this.render();
    }

    checkGameOver() {
        if (this.hasAnyValidMoves()) return;

        const pegCount = this.countPegs();

        if (pegCount === 1) {
            // Check if peg is in center
            const centerPeg = this.board[3][3] === 'peg';

            if (centerPeg) {
                this.victoryTitle.textContent = 'Perfekt!';
                this.victoryTitle.className = '';
                this.victoryMessage.textContent = 'Du efterlod kun én pind i midten!';
                HjernespilAPI.trackComplete('17');
                HjernespilUI.showWinModal();
            } else {
                this.victoryTitle.textContent = 'Næsten!';
                this.victoryTitle.className = 'near-win';
                this.victoryMessage.textContent = 'Kun én pind tilbage, men ikke i midten.';
                HjernespilAPI.trackComplete('17');
                HjernespilUI.showWinModal();
            }

            setTimeout(() => {
                this.victoryOverlay.classList.add('show');
            }, 300);
        } else {
            // Game over but not won
            this.victoryTitle.textContent = 'Spil slut';
            this.victoryTitle.className = 'near-win';
            this.victoryMessage.textContent = `${pegCount} pinde tilbage. Prøv igen!`;

            setTimeout(() => {
                this.victoryOverlay.classList.add('show');
            }, 300);
        }
    }

    render() {
        this.boardEl.innerHTML = '';
        this.boardEl.style.gridTemplateColumns = 'repeat(7, 1fr)';

        const validDestinations = this.selectedPeg ?
            this.selectedPeg.moves.map(m => `${m.toX},${m.toY}`) : [];

        for (let y = 0; y < 7; y++) {
            for (let x = 0; x < 7; x++) {
                const cell = this.board[y][x];
                const div = document.createElement('div');
                div.className = 'cell';

                if (cell === 'invalid') {
                    div.classList.add('invalid');
                } else if (cell === 'hole') {
                    div.classList.add('hole');
                    if (validDestinations.includes(`${x},${y}`)) {
                        div.classList.add('valid-move');
                    }
                    div.addEventListener('click', () => this.handleClick(x, y));
                } else if (cell === 'peg') {
                    div.classList.add('peg');
                    if (this.selectedPeg && this.selectedPeg.x === x && this.selectedPeg.y === y) {
                        div.classList.add('selected');
                    } else if (this.getValidMoves(x, y).length > 0) {
                        div.classList.add('jumpable');
                    }
                    div.addEventListener('click', () => this.handleClick(x, y));
                }

                this.boardEl.appendChild(div);
            }
        }
    }
}

new PegSolitaire();
