class Slitherlink {
    constructor() {
        this.board = document.getElementById('board');
        this.message = document.getElementById('message');
        this.difficultySelect = document.getElementById('difficulty');
        this.newGameBtn = document.getElementById('new-game');
        this.helpToggle = document.getElementById('help-toggle');
        this.helpContent = document.getElementById('help-content');

        this.cellSize = 50;
        this.gridWidth = 7;
        this.gridHeight = 7;
        this.numbers = [];
        this.edges = { horizontal: [], vertical: [] };
        this.gameWon = false;

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
        const difficulty = this.difficultySelect.value;

        switch (difficulty) {
            case 'easy':
                this.gridWidth = 5;
                this.gridHeight = 5;
                break;
            case 'medium':
                this.gridWidth = 7;
                this.gridHeight = 7;
                break;
            case 'hard':
                this.gridWidth = 9;
                this.gridHeight = 9;
                break;
        }

        this.gameWon = false;
        this.message.textContent = '';
        this.message.className = 'message';

        this.initializeEdges();
        this.generatePuzzle();
        this.render();

        HjernespilAPI.trackStart('20');
    }

    initializeEdges() {
        this.edges = {
            horizontal: [],
            vertical: []
        };

        // Horizontal edges: (gridHeight + 1) rows, gridWidth edges per row
        for (let row = 0; row <= this.gridHeight; row++) {
            this.edges.horizontal[row] = [];
            for (let col = 0; col < this.gridWidth; col++) {
                this.edges.horizontal[row][col] = 0; // 0 = empty, 1 = line, 2 = crossed
            }
        }

        // Vertical edges: gridHeight rows, (gridWidth + 1) edges per row
        for (let row = 0; row < this.gridHeight; row++) {
            this.edges.vertical[row] = [];
            for (let col = 0; col <= this.gridWidth; col++) {
                this.edges.vertical[row][col] = 0;
            }
        }
    }

    generatePuzzle() {
        // Generate a valid loop first, then derive numbers from it
        const solution = this.generateValidLoop();
        this.numbers = this.deriveNumbers(solution);
    }

    generateValidLoop() {
        // Create a simple rectangular loop that we can modify
        const solution = {
            horizontal: [],
            vertical: []
        };

        // Initialize empty solution
        for (let row = 0; row <= this.gridHeight; row++) {
            solution.horizontal[row] = new Array(this.gridWidth).fill(0);
        }
        for (let row = 0; row < this.gridHeight; row++) {
            solution.vertical[row] = new Array(this.gridWidth + 1).fill(0);
        }

        // Create a simple loop - start with a rectangle and add variations
        const margin = 1;
        const loopTop = margin;
        const loopBottom = this.gridHeight - margin;
        const loopLeft = margin;
        const loopRight = this.gridWidth - margin;

        // Top edge
        for (let col = loopLeft; col < loopRight; col++) {
            solution.horizontal[loopTop][col] = 1;
        }
        // Bottom edge
        for (let col = loopLeft; col < loopRight; col++) {
            solution.horizontal[loopBottom][col] = 1;
        }
        // Left edge
        for (let row = loopTop; row < loopBottom; row++) {
            solution.vertical[row][loopLeft] = 1;
        }
        // Right edge
        for (let row = loopTop; row < loopBottom; row++) {
            solution.vertical[row][loopRight] = 1;
        }

        // Add some variations to make it more interesting
        this.addLoopVariations(solution);

        return solution;
    }

    addLoopVariations(solution) {
        // Try to add bumps to the loop to make it more interesting
        const attempts = Math.floor(this.gridWidth * this.gridHeight / 4);

        for (let i = 0; i < attempts; i++) {
            this.tryAddBump(solution);
        }
    }

    tryAddBump(solution) {
        // Try to add a rectangular bump to the existing loop
        const direction = Math.floor(Math.random() * 4); // 0=up, 1=right, 2=down, 3=left

        // Find a horizontal or vertical edge that's part of the loop
        let edges = [];

        if (direction === 0 || direction === 2) {
            // Looking for horizontal edges
            for (let row = 1; row < this.gridHeight; row++) {
                for (let col = 0; col < this.gridWidth - 1; col++) {
                    if (solution.horizontal[row][col] === 1 && solution.horizontal[row][col + 1] === 1) {
                        edges.push({ row, col, type: 'horizontal' });
                    }
                }
            }
        } else {
            // Looking for vertical edges
            for (let row = 0; row < this.gridHeight - 1; row++) {
                for (let col = 1; col < this.gridWidth; col++) {
                    if (solution.vertical[row][col] === 1 && solution.vertical[row + 1][col] === 1) {
                        edges.push({ row, col, type: 'vertical' });
                    }
                }
            }
        }

        if (edges.length === 0) return;

        const edge = edges[Math.floor(Math.random() * edges.length)];

        // Try to create a bump
        if (edge.type === 'horizontal') {
            const row = edge.row;
            const col = edge.col;
            const bumpDir = direction === 0 ? -1 : 1;
            const newRow = row + bumpDir;

            if (newRow >= 0 && newRow <= this.gridHeight) {
                // Check if we can add a bump here
                if (solution.horizontal[newRow][col] === 0 &&
                    solution.horizontal[newRow][col + 1] === 0 &&
                    solution.vertical[Math.min(row, newRow)][col] === 0 &&
                    solution.vertical[Math.min(row, newRow)][col + 2] === 0) {

                    // Remove original edges
                    solution.horizontal[row][col] = 0;
                    solution.horizontal[row][col + 1] = 0;

                    // Add bump
                    solution.horizontal[newRow][col] = 1;
                    solution.horizontal[newRow][col + 1] = 1;
                    solution.vertical[Math.min(row, newRow)][col] = 1;
                    solution.vertical[Math.min(row, newRow)][col + 2] = 1;
                }
            }
        }
    }

    deriveNumbers(solution) {
        const numbers = [];
        const difficulty = this.difficultySelect.value;

        // Calculate number density based on difficulty
        let density;
        switch (difficulty) {
            case 'easy': density = 0.6; break;
            case 'medium': density = 0.45; break;
            case 'hard': density = 0.35; break;
            default: density = 0.45;
        }

        for (let row = 0; row < this.gridHeight; row++) {
            numbers[row] = [];
            for (let col = 0; col < this.gridWidth; col++) {
                // Count edges around this cell
                const count = this.countEdgesAroundCell(solution, row, col);

                // Randomly decide whether to show this number
                if (Math.random() < density) {
                    numbers[row][col] = count;
                } else {
                    numbers[row][col] = null;
                }
            }
        }

        return numbers;
    }

    countEdgesAroundCell(edges, row, col) {
        let count = 0;

        // Top edge
        if (edges.horizontal[row] && edges.horizontal[row][col] === 1) count++;
        // Bottom edge
        if (edges.horizontal[row + 1] && edges.horizontal[row + 1][col] === 1) count++;
        // Left edge
        if (edges.vertical[row] && edges.vertical[row][col] === 1) count++;
        // Right edge
        if (edges.vertical[row] && edges.vertical[row][col + 1] === 1) count++;

        return count;
    }

    render() {
        this.board.innerHTML = '';

        const boardWidth = this.gridWidth * this.cellSize;
        const boardHeight = this.gridHeight * this.cellSize;

        this.board.style.width = `${boardWidth + 20}px`;
        this.board.style.height = `${boardHeight + 20}px`;

        // Render cell numbers
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.numbers[row][col] !== null) {
                    const numberEl = document.createElement('div');
                    numberEl.className = 'cell-number';
                    numberEl.textContent = this.numbers[row][col];
                    numberEl.style.left = `${col * this.cellSize + this.cellSize / 2 + 10}px`;
                    numberEl.style.top = `${row * this.cellSize + this.cellSize / 2 + 10}px`;
                    numberEl.style.width = `${this.cellSize}px`;
                    numberEl.style.height = `${this.cellSize}px`;
                    numberEl.dataset.row = row;
                    numberEl.dataset.col = col;
                    this.board.appendChild(numberEl);
                }
            }
        }

        // Render horizontal edges
        for (let row = 0; row <= this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const edge = document.createElement('div');
                edge.className = 'edge horizontal';
                edge.style.left = `${col * this.cellSize + 10}px`;
                edge.style.top = `${row * this.cellSize + 10}px`;
                edge.style.width = `${this.cellSize}px`;

                const line = document.createElement('div');
                line.className = 'edge-line';
                edge.appendChild(line);

                if (this.edges.horizontal[row][col] === 1) {
                    edge.classList.add('active');
                } else if (this.edges.horizontal[row][col] === 2) {
                    edge.classList.add('crossed');
                }

                edge.addEventListener('click', () => this.toggleEdge('horizontal', row, col));
                this.board.appendChild(edge);
            }
        }

        // Render vertical edges
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col <= this.gridWidth; col++) {
                const edge = document.createElement('div');
                edge.className = 'edge vertical';
                edge.style.left = `${col * this.cellSize + 10}px`;
                edge.style.top = `${row * this.cellSize + 10}px`;
                edge.style.height = `${this.cellSize}px`;

                const line = document.createElement('div');
                line.className = 'edge-line';
                edge.appendChild(line);

                if (this.edges.vertical[row][col] === 1) {
                    edge.classList.add('active');
                } else if (this.edges.vertical[row][col] === 2) {
                    edge.classList.add('crossed');
                }

                edge.addEventListener('click', () => this.toggleEdge('vertical', row, col));
                this.board.appendChild(edge);
            }
        }

        // Render dots
        for (let row = 0; row <= this.gridHeight; row++) {
            for (let col = 0; col <= this.gridWidth; col++) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                dot.style.left = `${col * this.cellSize + 10}px`;
                dot.style.top = `${row * this.cellSize + 10}px`;
                this.board.appendChild(dot);
            }
        }

        this.updateNumberStatus();
    }

    toggleEdge(type, row, col) {
        if (this.gameWon) return;

        const current = this.edges[type][row][col];
        this.edges[type][row][col] = (current + 1) % 3;

        this.render();
        this.checkWin();
    }

    updateNumberStatus() {
        const numberEls = this.board.querySelectorAll('.cell-number');

        numberEls.forEach(el => {
            const row = parseInt(el.dataset.row);
            const col = parseInt(el.dataset.col);
            const target = this.numbers[row][col];
            const current = this.countEdgesAroundCell(this.edges, row, col);

            el.classList.remove('satisfied', 'exceeded');

            if (current === target) {
                el.classList.add('satisfied');
            } else if (current > target) {
                el.classList.add('exceeded');
            }
        });
    }

    checkWin() {
        // Check if all numbers are satisfied
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.numbers[row][col] !== null) {
                    const current = this.countEdgesAroundCell(this.edges, row, col);
                    if (current !== this.numbers[row][col]) {
                        return false;
                    }
                }
            }
        }

        // Check if edges form a single closed loop
        if (!this.isValidLoop()) {
            return false;
        }

        // Victory!
        this.gameWon = true;
        this.message.textContent = 'Tillykke! Du løste puslespillet!';
        this.message.className = 'message victory';

        HjernespilAPI.trackComplete('20');
        HjernespilUI.showWinModal();

        return true;
    }

    isValidLoop() {
        // Find all active edges
        const activeEdges = [];

        for (let row = 0; row <= this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.edges.horizontal[row][col] === 1) {
                    activeEdges.push({
                        type: 'horizontal',
                        row,
                        col,
                        dot1: { row, col },
                        dot2: { row, col: col + 1 }
                    });
                }
            }
        }

        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col <= this.gridWidth; col++) {
                if (this.edges.vertical[row][col] === 1) {
                    activeEdges.push({
                        type: 'vertical',
                        row,
                        col,
                        dot1: { row, col },
                        dot2: { row: row + 1, col }
                    });
                }
            }
        }

        if (activeEdges.length === 0) return false;

        // Build adjacency map for dots
        const dotConnections = {};

        const getDotKey = (row, col) => `${row},${col}`;

        activeEdges.forEach(edge => {
            const key1 = getDotKey(edge.dot1.row, edge.dot1.col);
            const key2 = getDotKey(edge.dot2.row, edge.dot2.col);

            if (!dotConnections[key1]) dotConnections[key1] = [];
            if (!dotConnections[key2]) dotConnections[key2] = [];

            dotConnections[key1].push(key2);
            dotConnections[key2].push(key1);
        });

        // Check that every dot has exactly 0 or 2 connections
        for (const key in dotConnections) {
            if (dotConnections[key].length !== 0 && dotConnections[key].length !== 2) {
                return false;
            }
        }

        // Check that there's exactly one connected component
        const visited = new Set();
        const startDot = Object.keys(dotConnections).find(key => dotConnections[key].length === 2);

        if (!startDot) return false;

        const stack = [startDot];
        while (stack.length > 0) {
            const current = stack.pop();
            if (visited.has(current)) continue;
            visited.add(current);

            dotConnections[current].forEach(neighbor => {
                if (!visited.has(neighbor)) {
                    stack.push(neighbor);
                }
            });
        }

        // Check all dots with connections are visited
        const dotsWithConnections = Object.keys(dotConnections).filter(key => dotConnections[key].length > 0);

        return visited.size === dotsWithConnections.length;
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    new Slitherlink();
});
