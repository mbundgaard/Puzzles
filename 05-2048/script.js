class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.best = parseInt(localStorage.getItem('2048-best')) || 0;
        this.won = false;
        this.gameOver = false;

        this.boardEl = document.getElementById('board');
        this.scoreEl = document.getElementById('score');
        this.bestEl = document.getElementById('best');
        this.newGameBtn = document.getElementById('new-game');
        this.gameOverOverlay = document.getElementById('game-over');
        this.victoryOverlay = document.getElementById('victory');
        this.retryBtn = document.getElementById('retry');
        this.continueBtn = document.getElementById('continue');
        this.newGameWinBtn = document.getElementById('new-game-win');
        this.finalScoreEl = document.getElementById('final-score');

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.retryBtn.addEventListener('click', () => {
            this.gameOverOverlay.classList.remove('show');
            this.newGame();
        });
        this.continueBtn.addEventListener('click', () => {
            this.victoryOverlay.classList.remove('show');
        });
        this.newGameWinBtn.addEventListener('click', () => {
            this.victoryOverlay.classList.remove('show');
            this.newGame();
        });

        // Swipe controls
        document.querySelectorAll('.swipe-btn').forEach(btn => {
            btn.addEventListener('click', () => this.move(btn.dataset.dir));
        });

        // Touch swipe
        let startX, startY;
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            const diffX = e.changedTouches[0].clientX - startX;
            const diffY = e.changedTouches[0].clientY - startY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > 30) {
                    this.move(diffX > 0 ? 'right' : 'left');
                }
            } else {
                if (Math.abs(diffY) > 30) {
                    this.move(diffY > 0 ? 'down' : 'up');
                }
            }
            startX = startY = null;
        }, { passive: true });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            const moves = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
            if (moves[e.key]) {
                e.preventDefault();
                this.move(moves[e.key]);
            }
        });

        this.bestEl.textContent = this.best;
        this.newGame();
    }

    newGame() {
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
        this.score = 0;
        this.won = false;
        this.gameOver = false;
        this.addRandomTile();
        this.addRandomTile();
        this.render();
        HjernespilAPI.trackStart('05');
    }

    addRandomTile() {
        const empty = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) empty.push({ r, c });
            }
        }
        if (empty.length === 0) return;
        const { r, c } = empty[Math.floor(Math.random() * empty.length)];
        this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }

    move(direction) {
        if (this.gameOver) return;

        const oldGrid = JSON.stringify(this.grid);

        if (direction === 'left') this.moveLeft();
        else if (direction === 'right') this.moveRight();
        else if (direction === 'up') this.moveUp();
        else if (direction === 'down') this.moveDown();

        if (JSON.stringify(this.grid) !== oldGrid) {
            this.addRandomTile();
            this.updateScore();
            this.render();

            if (!this.won && this.hasWon()) {
                this.won = true;
                setTimeout(() => this.victoryOverlay.classList.add('show'), 300);
                HjernespilAPI.trackComplete('05');
                HjernespilUI.showWinModal(3);
            }

            if (this.isGameOver()) {
                this.gameOver = true;
                this.finalScoreEl.textContent = this.score;
                setTimeout(() => this.gameOverOverlay.classList.add('show'), 300);
            }
        }
    }

    moveLeft() {
        for (let r = 0; r < this.size; r++) {
            this.grid[r] = this.slideAndMerge(this.grid[r]);
        }
    }

    moveRight() {
        for (let r = 0; r < this.size; r++) {
            this.grid[r] = this.slideAndMerge(this.grid[r].reverse()).reverse();
        }
    }

    moveUp() {
        this.grid = this.transpose(this.grid);
        this.moveLeft();
        this.grid = this.transpose(this.grid);
    }

    moveDown() {
        this.grid = this.transpose(this.grid);
        this.moveRight();
        this.grid = this.transpose(this.grid);
    }

    slideAndMerge(row) {
        let arr = row.filter(x => x !== 0);
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                arr[i] *= 2;
                this.score += arr[i];
                arr.splice(i + 1, 1);
            }
        }
        while (arr.length < this.size) arr.push(0);
        return arr;
    }

    transpose(grid) {
        return grid[0].map((_, i) => grid.map(row => row[i]));
    }

    hasWon() {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 2048) return true;
            }
        }
        return false;
    }

    isGameOver() {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) return false;
                if (c < this.size - 1 && this.grid[r][c] === this.grid[r][c + 1]) return false;
                if (r < this.size - 1 && this.grid[r][c] === this.grid[r + 1][c]) return false;
            }
        }
        return true;
    }

    updateScore() {
        this.scoreEl.textContent = this.score;
        if (this.score > this.best) {
            this.best = this.score;
            this.bestEl.textContent = this.best;
            localStorage.setItem('2048-best', this.best);
        }
    }

    render() {
        this.boardEl.innerHTML = '';
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                const val = this.grid[r][c];
                if (val !== 0) {
                    tile.textContent = val;
                    tile.classList.add('t' + val);
                }
                this.boardEl.appendChild(tile);
            }
        }
        this.scoreEl.textContent = this.score;
    }
}

new Game2048();
