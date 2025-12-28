class FifteenPuzzle {
    constructor() {
        this.size = 4;
        this.tiles = [];
        this.emptyPos = 15;
        this.moves = 0;
        this.time = 0;
        this.timer = null;
        this.gameOver = false;
        this.started = false;

        this.boardEl = document.getElementById('board');
        this.movesEl = document.getElementById('moves');
        this.timeEl = document.getElementById('time');
        this.newGameBtn = document.getElementById('new-game');

        this.newGameBtn.addEventListener('click', () => this.newGame());

        this.newGame();
    }

    newGame() {
        this.stopTimer();
        this.moves = 0;
        this.time = 0;
        this.gameOver = false;
        this.started = false;
        this.movesEl.textContent = '0';
        this.timeEl.textContent = '0:00';
        this.boardEl.classList.remove('won');

        // Create solved state
        this.tiles = [];
        for (let i = 1; i <= 15; i++) {
            this.tiles.push(i);
        }
        this.tiles.push(0); // Empty tile
        this.emptyPos = 15;

        // Shuffle by making random valid moves (ensures solvability)
        this.shuffle(100);

        this.render();
        HjernespilAPI.trackStart('13');
    }

    shuffle(moves) {
        for (let i = 0; i < moves; i++) {
            const neighbors = this.getMovableTiles();
            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            this.swapTiles(randomNeighbor, this.emptyPos, false);
        }
    }

    getMovableTiles() {
        const movable = [];
        const row = Math.floor(this.emptyPos / this.size);
        const col = this.emptyPos % this.size;

        if (row > 0) movable.push(this.emptyPos - this.size); // Above
        if (row < this.size - 1) movable.push(this.emptyPos + this.size); // Below
        if (col > 0) movable.push(this.emptyPos - 1); // Left
        if (col < this.size - 1) movable.push(this.emptyPos + 1); // Right

        return movable;
    }

    swapTiles(tilePos, emptyPos, countMove = true) {
        [this.tiles[tilePos], this.tiles[emptyPos]] = [this.tiles[emptyPos], this.tiles[tilePos]];
        this.emptyPos = tilePos;

        if (countMove) {
            this.moves++;
            this.movesEl.textContent = this.moves;

            if (!this.started) {
                this.started = true;
                this.startTimer();
            }
        }
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.time++;
            const minutes = Math.floor(this.time / 60);
            const seconds = this.time % 60;
            this.timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    render() {
        this.boardEl.innerHTML = '';
        const movable = this.getMovableTiles();

        this.tiles.forEach((tile, index) => {
            const tileEl = document.createElement('div');
            tileEl.className = 'tile';

            if (tile === 0) {
                tileEl.classList.add('empty');
            } else {
                tileEl.textContent = tile;

                if (movable.includes(index)) {
                    tileEl.classList.add('movable');
                }

                // Check if tile is in correct position
                if (tile === index + 1) {
                    tileEl.classList.add('correct');
                }

                tileEl.addEventListener('click', () => this.handleClick(index));
            }

            this.boardEl.appendChild(tileEl);
        });
    }

    handleClick(index) {
        if (this.gameOver) return;

        const movable = this.getMovableTiles();
        if (movable.includes(index)) {
            this.swapTiles(index, this.emptyPos);
            this.render();
            this.checkWin();
        }
    }

    checkWin() {
        for (let i = 0; i < 15; i++) {
            if (this.tiles[i] !== i + 1) return;
        }

        // Win!
        this.gameOver = true;
        this.stopTimer();
        this.boardEl.classList.add('won');
        HjernespilAPI.trackComplete('13');

        setTimeout(() => {
            alert(`Tillykke! Du løste puslespillet på ${this.moves} træk og ${this.formatTime(this.time)}!`);
        }, 500);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return `${mins} min og ${secs} sek`;
        }
        return `${secs} sekunder`;
    }
}

// Start game
new FifteenPuzzle();
