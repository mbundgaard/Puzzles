class WordSearchGame {
    constructor() {
        this.gridSize = 12;
        this.words = [];
        this.grid = [];
        this.wordPositions = [];
        this.foundWords = new Set();
        this.difficulty = null;
        this.points = 0;
        this.startCell = null;
        this.gameStarted = false;

        this.directions = [
            { dx: 1, dy: 0 },   // right
            { dx: -1, dy: 0 },  // left
            { dx: 0, dy: 1 },   // down
            { dx: 0, dy: -1 },  // up
            { dx: 1, dy: 1 },   // diagonal down-right
            { dx: -1, dy: -1 }, // diagonal up-left
            { dx: 1, dy: -1 },  // diagonal up-right
            { dx: -1, dy: 1 }   // diagonal down-left
        ];

        this.danishLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ';

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
            this.words = data.words;

            this.generateGrid();
            this.renderGame();

            HjernespilAPI.trackStart('27');
            this.gameStarted = true;

        } catch (error) {
            console.error('Error starting game:', error);
            alert('Kunne ikke starte spillet. Prøv igen.');
            this.showDifficultySelect();
        }
    }

    generateGrid() {
        // Initialize empty grid
        this.grid = Array(this.gridSize).fill(null).map(() =>
            Array(this.gridSize).fill('')
        );
        this.wordPositions = [];
        this.foundWords = new Set();
        this.startCell = null;

        // Sort words by length (longest first for better placement)
        const sortedWords = [...this.words].sort((a, b) => b.length - a.length);

        // Place each word
        for (const word of sortedWords) {
            const placed = this.placeWord(word);
            if (!placed) {
                console.warn(`Could not place word: ${word}`);
            }
        }

        // Fill empty cells with random letters
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x] === '') {
                    this.grid[y][x] = this.danishLetters[Math.floor(Math.random() * this.danishLetters.length)];
                }
            }
        }
    }

    placeWord(word) {
        const maxAttempts = 100;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const dir = this.directions[Math.floor(Math.random() * this.directions.length)];

            // Calculate valid starting positions
            let minX = 0, maxX = this.gridSize - 1;
            let minY = 0, maxY = this.gridSize - 1;

            if (dir.dx > 0) maxX = this.gridSize - word.length;
            if (dir.dx < 0) minX = word.length - 1;
            if (dir.dy > 0) maxY = this.gridSize - word.length;
            if (dir.dy < 0) minY = word.length - 1;

            if (minX > maxX || minY > maxY) continue;

            const startX = minX + Math.floor(Math.random() * (maxX - minX + 1));
            const startY = minY + Math.floor(Math.random() * (maxY - minY + 1));

            // Check if word fits
            let canPlace = true;
            const positions = [];

            for (let i = 0; i < word.length; i++) {
                const x = startX + i * dir.dx;
                const y = startY + i * dir.dy;
                const letter = word[i];

                if (this.grid[y][x] !== '' && this.grid[y][x] !== letter) {
                    canPlace = false;
                    break;
                }
                positions.push({ x, y, letter });
            }

            if (canPlace) {
                // Place the word
                for (const pos of positions) {
                    this.grid[pos.y][pos.x] = pos.letter;
                }
                this.wordPositions.push({
                    word,
                    positions,
                    startX,
                    startY,
                    endX: startX + (word.length - 1) * dir.dx,
                    endY: startY + (word.length - 1) * dir.dy
                });
                return true;
            }
        }

        return false;
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

        for (const word of this.words) {
            const wordEl = document.createElement('div');
            wordEl.className = 'word-item';
            wordEl.textContent = word;
            wordEl.id = `word-${word}`;
            wordListEl.appendChild(wordEl);
        }
    }

    updateStats() {
        document.getElementById('words-found').textContent = this.foundWords.size;
        document.getElementById('words-total').textContent = this.words.length;
    }

    handleCellClick(x, y) {
        if (this.startCell === null) {
            // First tap - select start
            this.startCell = { x, y };
            this.highlightCell(x, y, 'start');
            this.updatePreviewLine(x, y, x, y);
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

        // Horizontal
        if (dy === 0) return true;

        // Vertical
        if (dx === 0) return true;

        // Diagonal (must be 45 degrees)
        if (Math.abs(dx) === Math.abs(dy)) return true;

        return false;
    }

    checkSelection(x1, y1, x2, y2) {
        const selectedWord = this.getWordFromSelection(x1, y1, x2, y2);

        // Check if this matches any word (forward or backward)
        for (const wordPos of this.wordPositions) {
            if (this.foundWords.has(wordPos.word)) continue;

            const matchesForward =
                (x1 === wordPos.startX && y1 === wordPos.startY &&
                 x2 === wordPos.endX && y2 === wordPos.endY);
            const matchesBackward =
                (x2 === wordPos.startX && y2 === wordPos.startY &&
                 x1 === wordPos.endX && y1 === wordPos.endY);

            if (matchesForward || matchesBackward) {
                this.markWordFound(wordPos, x1, y1, x2, y2);
                return;
            }
        }
    }

    getWordFromSelection(x1, y1, x2, y2) {
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);
        const length = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) + 1;

        let word = '';
        for (let i = 0; i < length; i++) {
            const x = x1 + i * dx;
            const y = y1 + i * dy;
            word += this.grid[y][x];
        }
        return word;
    }

    markWordFound(wordPos, x1, y1, x2, y2) {
        this.foundWords.add(wordPos.word);

        // Mark cells as found
        for (const pos of wordPos.positions) {
            const cell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
            if (cell) cell.classList.add('found');
        }

        // Mark word in list
        const wordEl = document.getElementById(`word-${wordPos.word}`);
        if (wordEl) wordEl.classList.add('found');

        // Draw found line
        this.drawFoundLine(x1, y1, x2, y2);

        this.updateStats();

        // Check for win
        if (this.foundWords.size === this.words.length) {
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

        // Remove preview line
        const preview = document.querySelector('.selection-line.preview');
        if (preview) preview.remove();
    }

    updatePreviewLine(x1, y1, x2, y2) {
        const svg = document.getElementById('selection-overlay');
        let preview = svg.querySelector('.selection-line.preview');

        if (!preview) {
            preview = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            preview.classList.add('selection-line', 'preview');
            svg.appendChild(preview);
        }

        const coords = this.getCellCenter(x1, y1, x2, y2);
        preview.setAttribute('x1', coords.x1);
        preview.setAttribute('y1', coords.y1);
        preview.setAttribute('x2', coords.x2);
        preview.setAttribute('y2', coords.y2);
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
        const cellSize = (gridContainer.offsetWidth - 8) / this.gridSize; // Account for padding and gaps
        const offset = 4; // Grid padding

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
