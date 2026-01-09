/**
 * Tents and Trees Puzzle Game
 */

const EMPTY = 0;
const TREE = 1;
const TENT = 2;
const MARKED = 3;

const GRID_SIZE = 8;

class TentsAndTrees {
    constructor() {
        this.size = GRID_SIZE;
        this.grid = [];
        this.solution = [];
        this.rowClues = [];
        this.colClues = [];
        this.trees = [];
        this.gameWon = false;
        this.mode = 'tent'; // 'tent' or 'mark'

        this.gridElement = document.getElementById('grid');
        this.rowCluesElement = document.getElementById('row-clues');
        this.colCluesElement = document.getElementById('column-clues');
        this.statusElement = document.getElementById('status');
        this.newGameButton = document.getElementById('new-game');
        this.modeTentButton = document.getElementById('mode-tent');
        this.modeMarkButton = document.getElementById('mode-mark');

        this.setupEventListeners();
        this.newGame();
    }

    setupEventListeners() {
        this.newGameButton.addEventListener('click', () => this.newGame());

        // Mode toggle buttons
        this.modeTentButton.addEventListener('click', () => this.setMode('tent'));
        this.modeMarkButton.addEventListener('click', () => this.setMode('mark'));

        // Prevent context menu on grid
        this.gridElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    setMode(mode) {
        this.mode = mode;
        this.modeTentButton.classList.toggle('active', mode === 'tent');
        this.modeMarkButton.classList.toggle('active', mode === 'mark');
    }

    newGame() {
        this.gameWon = false;
        this.statusElement.classList.remove('victory');
        this.generatePuzzle();
        this.render();
        this.updateStatus('Placér telte ved siden af træer');
        HjernespilAPI.sessionEvent('newGame');
    }

    generatePuzzle() {
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            attempts++;
            if (this.tryGeneratePuzzle()) {
                return;
            }
        }

        // Fallback: simple puzzle if generation fails
        console.warn('Using fallback puzzle generation');
        this.generateSimplePuzzle();
    }

    tryGeneratePuzzle() {
        // Initialize empty grid
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(EMPTY));
        this.solution = Array(this.size).fill(null).map(() => Array(this.size).fill(EMPTY));
        this.trees = [];

        // Determine number of tree-tent pairs (roughly 1/4 to 1/3 of grid)
        const numPairs = Math.floor(this.size * this.size / 5) + Math.floor(Math.random() * 3);

        // Place tree-tent pairs
        let placedPairs = 0;
        let failedAttempts = 0;

        while (placedPairs < numPairs && failedAttempts < 200) {
            const result = this.tryPlacePair();
            if (result) {
                placedPairs++;
                failedAttempts = 0;
            } else {
                failedAttempts++;
            }
        }

        if (placedPairs < numPairs / 2) {
            return false;
        }

        // Calculate row and column clues from solution
        this.calculateClues();

        // Clear player grid (keep only trees)
        this.grid = this.grid.map(row => row.map(cell => cell === TREE ? TREE : EMPTY));

        return true;
    }

    tryPlacePair() {
        // Pick a random empty cell for the tree
        const emptyCells = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === EMPTY && this.solution[r][c] === EMPTY) {
                    emptyCells.push([r, c]);
                }
            }
        }

        if (emptyCells.length === 0) return false;

        // Shuffle and try cells
        this.shuffle(emptyCells);

        for (const [treeRow, treeCol] of emptyCells) {
            // Get valid tent positions (orthogonally adjacent)
            const tentPositions = this.getOrthogonalNeighbors(treeRow, treeCol)
                .filter(([r, c]) => this.canPlaceTent(r, c));

            if (tentPositions.length === 0) continue;

            // Pick a random valid tent position
            const [tentRow, tentCol] = tentPositions[Math.floor(Math.random() * tentPositions.length)];

            // Place the pair
            this.grid[treeRow][treeCol] = TREE;
            this.solution[treeRow][treeCol] = TREE;
            this.solution[tentRow][tentCol] = TENT;
            this.trees.push({ row: treeRow, col: treeCol });

            return true;
        }

        return false;
    }

    canPlaceTent(row, col) {
        // Check bounds
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) return false;

        // Check if cell is empty
        if (this.grid[row][col] !== EMPTY || this.solution[row][col] !== EMPTY) return false;

        // Check no adjacent tents (including diagonal)
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                    if (this.solution[nr][nc] === TENT) return false;
                }
            }
        }

        return true;
    }

    getOrthogonalNeighbors(row, col) {
        const neighbors = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                neighbors.push([nr, nc]);
            }
        }
        return neighbors;
    }

    calculateClues() {
        this.rowClues = [];
        this.colClues = [];

        for (let i = 0; i < this.size; i++) {
            let rowCount = 0;
            let colCount = 0;
            for (let j = 0; j < this.size; j++) {
                if (this.solution[i][j] === TENT) rowCount++;
                if (this.solution[j][i] === TENT) colCount++;
            }
            this.rowClues.push(rowCount);
            this.colClues.push(colCount);
        }
    }

    generateSimplePuzzle() {
        // Fallback simple puzzle
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(EMPTY));
        this.solution = Array(this.size).fill(null).map(() => Array(this.size).fill(EMPTY));
        this.trees = [];

        // Place a few guaranteed pairs
        const pairs = [
            [[1, 1], [0, 1]],
            [[3, 4], [3, 5]],
            [[5, 2], [5, 1]],
            [[6, 6], [7, 6]]
        ];

        for (const [[tr, tc], [tentr, tentc]] of pairs) {
            this.grid[tr][tc] = TREE;
            this.solution[tr][tc] = TREE;
            this.solution[tentr][tentc] = TENT;
            this.trees.push({ row: tr, col: tc });
        }

        this.calculateClues();
        this.grid = this.grid.map(row => row.map(cell => cell === TREE ? TREE : EMPTY));
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    render() {
        this.renderGrid();
        this.renderClues();
    }

    renderGrid() {
        this.gridElement.innerHTML = '';
        this.gridElement.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                switch (this.grid[r][c]) {
                    case TREE:
                        cell.classList.add('tree');
                        break;
                    case TENT:
                        cell.classList.add('tent');
                        break;
                    case MARKED:
                        cell.classList.add('marked');
                        break;
                }

                // Check for invalid tent placement
                if (this.grid[r][c] === TENT && this.isTentInvalid(r, c)) {
                    cell.classList.add('invalid');
                }

                cell.addEventListener('click', (e) => this.handleClick(r, c, e));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.handleRightClick(r, c);
                });

                this.gridElement.appendChild(cell);
            }
        }
    }

    renderClues() {
        // Row clues
        this.rowCluesElement.innerHTML = '';
        for (let r = 0; r < this.size; r++) {
            const clue = document.createElement('div');
            clue.className = 'row-clue';
            clue.textContent = this.rowClues[r];

            const count = this.countTentsInRow(r);
            if (count === this.rowClues[r]) {
                clue.classList.add('correct');
            } else if (count > this.rowClues[r]) {
                clue.classList.add('exceeded');
            }

            this.rowCluesElement.appendChild(clue);
        }

        // Column clues
        this.colCluesElement.innerHTML = '';
        for (let c = 0; c < this.size; c++) {
            const clue = document.createElement('div');
            clue.className = 'column-clue';
            clue.textContent = this.colClues[c];

            const count = this.countTentsInCol(c);
            if (count === this.colClues[c]) {
                clue.classList.add('correct');
            } else if (count > this.colClues[c]) {
                clue.classList.add('exceeded');
            }

            this.colCluesElement.appendChild(clue);
        }
    }

    countTentsInRow(row) {
        return this.grid[row].filter(cell => cell === TENT).length;
    }

    countTentsInCol(col) {
        let count = 0;
        for (let r = 0; r < this.size; r++) {
            if (this.grid[r][col] === TENT) count++;
        }
        return count;
    }

    handleClick(row, col, event) {
        if (this.gameWon) return;
        if (this.grid[row][col] === TREE) return;

        if (this.mode === 'tent') {
            // Tent mode: place or remove tent
            if (this.grid[row][col] === TENT) {
                this.grid[row][col] = EMPTY;
            } else if (this.grid[row][col] === EMPTY || this.grid[row][col] === MARKED) {
                this.grid[row][col] = TENT;
            }
        } else {
            // Mark mode: place or remove mark
            if (this.grid[row][col] === MARKED) {
                this.grid[row][col] = EMPTY;
            } else if (this.grid[row][col] === EMPTY) {
                this.grid[row][col] = MARKED;
            } else if (this.grid[row][col] === TENT) {
                this.grid[row][col] = MARKED;
            }
        }

        this.render();
        this.checkVictory();
    }

    handleRightClick(row, col) {
        if (this.gameWon) return;
        if (this.grid[row][col] === TREE) return;

        if (this.grid[row][col] === MARKED) {
            this.grid[row][col] = EMPTY;
        } else if (this.grid[row][col] === EMPTY) {
            this.grid[row][col] = MARKED;
        } else if (this.grid[row][col] === TENT) {
            this.grid[row][col] = MARKED;
        }

        this.render();
    }

    isTentInvalid(row, col) {
        // Check if tent touches another tent (including diagonally)
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                    if (this.grid[nr][nc] === TENT) return true;
                }
            }
        }

        // Check if tent is adjacent to at least one tree
        const neighbors = this.getOrthogonalNeighbors(row, col);
        const hasAdjacentTree = neighbors.some(([r, c]) => this.grid[r][c] === TREE);
        if (!hasAdjacentTree) return true;

        return false;
    }

    checkVictory() {
        // Check row clues
        for (let r = 0; r < this.size; r++) {
            if (this.countTentsInRow(r) !== this.rowClues[r]) return;
        }

        // Check column clues
        for (let c = 0; c < this.size; c++) {
            if (this.countTentsInCol(c) !== this.colClues[c]) return;
        }

        // Check all tents are valid
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === TENT && this.isTentInvalid(r, c)) return;
            }
        }

        // Check each tree has exactly one adjacent tent
        for (const tree of this.trees) {
            const neighbors = this.getOrthogonalNeighbors(tree.row, tree.col);
            const adjacentTents = neighbors.filter(([r, c]) => this.grid[r][c] === TENT);
            if (adjacentTents.length !== 1) return;
        }

        // Check each tent has exactly one adjacent tree (1:1 pairing)
        const tentCount = this.grid.flat().filter(cell => cell === TENT).length;
        if (tentCount !== this.trees.length) return;

        // Victory!
        this.gameWon = true;
        this.updateStatus('Tillykke! Puslespillet er løst!');
        this.statusElement.classList.add('victory');
        HjernespilAPI.sessionEvent('win');
        HjernespilUI.showWinModal(3);
    }

    updateStatus(message) {
        this.statusElement.textContent = message;
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TentsAndTrees();
});
