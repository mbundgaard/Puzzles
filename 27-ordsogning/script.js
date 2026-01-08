class WordSearchGame {
    constructor() {
        this.gridSize = 12;
        this.grid = [];
        this.words = [];           // List of words to find
        this.wordPositions = [];   // Calculated positions of words in grid
        this.foundWords = new Set();
        this.difficulty = null;
        this.points = 0;
        this.startCell = null;
        this.gameStarted = false;

        // Valid directions: right, down, diagonal down-right, diagonal up-right
        this.directions = [
            { dx: 1, dy: 0 },   // right (horizontal)
            { dx: 0, dy: 1 },   // down (vertical)
            { dx: 1, dy: 1 },   // diagonal down-right
            { dx: 1, dy: -1 }   // diagonal up-right
        ];

        this.init();
    }

    init() {
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectDifficulty(btn));
        });

        document.getElementById('new-game-btn').addEventListener('click', () => this.showDifficultySelect());
    }

    selectDifficulty(btn) {
        this.difficulty = btn.dataset.difficulty;
        this.points = parseInt(btn.dataset.points);
        this.startGame();
    }

    showDifficultySelect() {
        document.getElementById('difficulty-select').style.display = 'block';
        document.getElementById('game-phase').style.display = 'none';
        document.getElementById('loading').style.display = 'none';
    }

    async startGame() {
        document.getElementById('difficulty-select').style.display = 'none';
        document.getElementById('loading').style.display = 'block';
        document.getElementById('game-phase').style.display = 'none';

        try {
            const response = await fetch('https://puzzlesapi.azurewebsites.net/api/game/27/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ difficulty: this.difficulty })
            });

            if (!response.ok) throw new Error('API error');

            const data = await response.json();

            // Store grid and words from API
            this.grid = data.grid;
            this.words = data.words;

            // Find positions of all words in the grid
            this.wordPositions = this.findAllWordPositions();

            this.foundWords = new Set();
            this.startCell = null;

            this.renderGame();

            HjernespilAPI.trackStart('27');
            this.gameStarted = true;

        } catch (error) {
            console.error('Error starting game:', error);
            alert('Kunne ikke starte spillet. Prøv igen.');
            this.showDifficultySelect();
        }
    }

    findAllWordPositions() {
        const positions = [];
        for (const word of this.words) {
            const pos = this.findWordInGrid(word);
            if (pos) {
                positions.push(pos);
            } else {
                console.warn(`Word "${word}" not found in grid`);
            }
        }
        return positions;
    }

    findWordInGrid(word) {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                for (const dir of this.directions) {
                    if (this.checkWordAt(word, x, y, dir.dx, dir.dy)) {
                        return {
                            word: word,
                            startX: x,
                            startY: y,
                            endX: x + (word.length - 1) * dir.dx,
                            endY: y + (word.length - 1) * dir.dy
                        };
                    }
                }
            }
        }
        return null;
    }

    checkWordAt(word, startX, startY, dx, dy) {
        const endX = startX + (word.length - 1) * dx;
        const endY = startY + (word.length - 1) * dy;

        // Check bounds
        if (endX < 0 || endX >= this.gridSize || endY < 0 || endY >= this.gridSize) {
            return false;
        }

        for (let i = 0; i < word.length; i++) {
            const x = startX + i * dx;
            const y = startY + i * dy;
            if (this.grid[y][x] !== word[i]) {
                return false;
            }
        }
        return true;
    }

    renderGame() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('game-phase').style.display = 'block';

        this.renderGrid();
        this.renderWordList();
        this.updateStats();
    }

    renderGrid() {
        const gridEl = document.getElementById('puzzle-grid');
        gridEl.innerHTML = '';

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = this.grid[y][x];
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('click', () => this.handleCellClick(x, y));
                gridEl.appendChild(cell);
            }
        }

        // Clear SVG overlay
        const svg = document.getElementById('selection-overlay');
        svg.innerHTML = '';
    }

    renderWordList() {
        const wordListEl = document.getElementById('word-list');
        wordListEl.innerHTML = '';

        for (const wordPos of this.wordPositions) {
            const wordEl = document.createElement('div');
            wordEl.className = 'word-item';
            wordEl.textContent = wordPos.word;
            wordEl.id = `word-${wordPos.word}`;
            wordListEl.appendChild(wordEl);
        }
    }

    updateStats() {
        document.getElementById('words-found').textContent = this.foundWords.size;
        document.getElementById('words-total').textContent = this.wordPositions.length;
    }

    handleCellClick(x, y) {
        if (this.startCell === null) {
            // First tap - select start
            this.startCell = { x, y };
            this.highlightCell(x, y, 'start');
        } else {
            // Second tap - check selection
            const startX = this.startCell.x;
            const startY = this.startCell.y;

            // Check if this forms a valid line
            if (this.isValidLine(startX, startY, x, y)) {
                this.checkSelection(startX, startY, x, y);
            }

            // Clear start selection
            this.clearStartSelection();
        }
    }

    isValidLine(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        // Same cell
        if (dx === 0 && dy === 0) return true;

        // Horizontal (left to right only)
        if (dy === 0 && dx > 0) return true;

        // Vertical (top to bottom only)
        if (dx === 0 && dy > 0) return true;

        // Diagonal down-right or up-right (must start from left)
        if (dx > 0 && Math.abs(dx) === Math.abs(dy)) return true;

        return false;
    }

    checkSelection(x1, y1, x2, y2) {
        // Check if this matches any word (forward direction only)
        for (const wordPos of this.wordPositions) {
            if (this.foundWords.has(wordPos.word)) continue;

            const matchesForward =
                (x1 === wordPos.startX && y1 === wordPos.startY &&
                 x2 === wordPos.endX && y2 === wordPos.endY);

            if (matchesForward) {
                this.markWordFound(wordPos, x1, y1, x2, y2);
                return;
            }
        }
    }

    markWordFound(wordPos, x1, y1, x2, y2) {
        this.foundWords.add(wordPos.word);

        // Calculate direction
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);
        const length = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) + 1;

        // Mark cells as found
        for (let i = 0; i < length; i++) {
            const x = x1 + i * dx;
            const y = y1 + i * dy;
            const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            if (cell) cell.classList.add('found');
        }

        // Mark word in list
        const wordEl = document.getElementById(`word-${wordPos.word}`);
        if (wordEl) wordEl.classList.add('found');

        // Draw found line
        this.drawFoundLine(x1, y1, x2, y2);

        this.updateStats();

        // Check for win
        if (this.foundWords.size === this.wordPositions.length) {
            this.handleWin();
        }
    }

    highlightCell(x, y, className) {
        const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (cell) cell.classList.add(className);
    }

    clearStartSelection() {
        if (this.startCell) {
            const cell = document.querySelector(`.cell[data-x="${this.startCell.x}"][data-y="${this.startCell.y}"]`);
            if (cell) cell.classList.remove('start');
        }
        this.startCell = null;
    }

    drawFoundLine(x1, y1, x2, y2) {
        const svg = document.getElementById('selection-overlay');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.classList.add('selection-line', 'found');

        const coords = this.getCellCenter(x1, y1, x2, y2);
        line.setAttribute('x1', coords.x1);
        line.setAttribute('y1', coords.y1);
        line.setAttribute('x2', coords.x2);
        line.setAttribute('y2', coords.y2);

        svg.appendChild(line);
    }

    getCellCenter(x1, y1, x2, y2) {
        const gridContainer = document.querySelector('.grid-container');
        const cellSize = (gridContainer.offsetWidth - 8) / this.gridSize;
        const offset = 4;

        return {
            x1: offset + x1 * cellSize + cellSize / 2,
            y1: offset + y1 * cellSize + cellSize / 2,
            x2: offset + x2 * cellSize + cellSize / 2,
            y2: offset + y2 * cellSize + cellSize / 2
        };
    }

    handleWin() {
        HjernespilAPI.trackComplete('27');

        setTimeout(() => {
            HjernespilUI.showWinModal(this.points);
        }, 500);
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WordSearchGame();
});
