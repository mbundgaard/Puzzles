class Strikkespil {
    constructor() {
        // Direction constants: 0=up, 1=right, 2=down, 3=left
        this.DIRECTIONS = {
            UP: 0,
            RIGHT: 1,
            DOWN: 2,
            LEFT: 3
        };

        // Opposite directions for connection checking
        this.OPPOSITE = [2, 3, 0, 1]; // up->down, right->left, etc.

        // Direction offsets for neighbor finding [row, col]
        this.OFFSETS = [
            [-1, 0],  // up
            [0, 1],   // right
            [1, 0],   // down
            [0, -1]   // left
        ];

        // Piece types with their base exits (before rotation)
        // Each piece type has exits in certain directions
        this.PIECE_TYPES = {
            EMPTY: { exits: [], name: 'empty' },
            STRAIGHT: { exits: [0, 2], name: 'straight' },      // up-down
            CORNER: { exits: [0, 1], name: 'corner' },          // up-right
            T_PIECE: { exits: [0, 1, 2], name: 't-piece' },     // up-right-down
            CROSS: { exits: [0, 1, 2, 3], name: 'cross' },      // all
            END: { exits: [0], name: 'end' }                     // up only
        };

        this.gridSize = 6;
        this.grid = [];
        this.moves = 0;
        this.gameWon = false;

        // DOM elements
        this.boardEl = document.getElementById('board');
        this.movesEl = document.getElementById('moves');
        this.newGameBtn = document.getElementById('new-game');

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.newGame();
    }

    newGame() {
        this.moves = 0;
        this.gameWon = false;
        this.movesEl.textContent = '0';
        this.boardEl.classList.remove('solved');

        // Generate puzzle
        this.generatePuzzle();
        this.render();

        // Track game start
        if (typeof HjernespilAPI !== 'undefined') {
            HjernespilAPI.sessionEvent('newGame');
        }
    }

    generatePuzzle() {
        // Step 1: Create empty grid
        this.grid = Array(this.gridSize).fill(null).map(() =>
            Array(this.gridSize).fill(null).map(() => ({
                type: 'EMPTY',
                rotation: 0,
                solvedRotation: 0
            }))
        );

        // Step 2: Generate a connected network using maze-like algorithm
        const visited = Array(this.gridSize).fill(null).map(() =>
            Array(this.gridSize).fill(false)
        );

        // Start from center and grow outward
        const startRow = Math.floor(this.gridSize / 2);
        const startCol = Math.floor(this.gridSize / 2);

        // Use a growing tree algorithm to create connected paths
        const frontier = [[startRow, startCol]];
        visited[startRow][startCol] = true;
        const connections = Array(this.gridSize).fill(null).map(() =>
            Array(this.gridSize).fill(null).map(() => new Set())
        );

        while (frontier.length > 0) {
            // Pick a random cell from frontier (biased toward recent for longer paths)
            const idx = Math.random() < 0.7 ? frontier.length - 1 : Math.floor(Math.random() * frontier.length);
            const [row, col] = frontier[idx];

            // Find unvisited neighbors
            const neighbors = [];
            for (let dir = 0; dir < 4; dir++) {
                const newRow = row + this.OFFSETS[dir][0];
                const newCol = col + this.OFFSETS[dir][1];
                if (newRow >= 0 && newRow < this.gridSize &&
                    newCol >= 0 && newCol < this.gridSize &&
                    !visited[newRow][newCol]) {
                    neighbors.push({ row: newRow, col: newCol, dir });
                }
            }

            if (neighbors.length > 0) {
                // Connect to a random unvisited neighbor
                const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                visited[neighbor.row][neighbor.col] = true;

                // Add connections in both directions
                connections[row][col].add(neighbor.dir);
                connections[neighbor.row][neighbor.col].add(this.OPPOSITE[neighbor.dir]);

                frontier.push([neighbor.row, neighbor.col]);

                // Sometimes add extra connections for more interesting puzzles
                if (Math.random() < 0.3 && neighbors.length > 1) {
                    const otherNeighbors = neighbors.filter(n => n !== neighbor && visited[n.row][n.col] === false);
                    if (otherNeighbors.length > 0) {
                        const extra = otherNeighbors[Math.floor(Math.random() * otherNeighbors.length)];
                        visited[extra.row][extra.col] = true;
                        connections[row][col].add(extra.dir);
                        connections[extra.row][extra.col].add(this.OPPOSITE[extra.dir]);
                        frontier.push([extra.row, extra.col]);
                    }
                }
            } else {
                // No unvisited neighbors, remove from frontier
                frontier.splice(idx, 1);
            }
        }

        // Add some extra connections to make the puzzle more interesting
        for (let i = 0; i < this.gridSize * 2; i++) {
            const row = Math.floor(Math.random() * this.gridSize);
            const col = Math.floor(Math.random() * this.gridSize);
            const dir = Math.floor(Math.random() * 4);
            const newRow = row + this.OFFSETS[dir][0];
            const newCol = col + this.OFFSETS[dir][1];

            if (newRow >= 0 && newRow < this.gridSize &&
                newCol >= 0 && newCol < this.gridSize) {
                connections[row][col].add(dir);
                connections[newRow][newCol].add(this.OPPOSITE[dir]);
            }
        }

        // Step 3: Convert connections to piece types
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const exits = Array.from(connections[row][col]).sort();
                const piece = this.determinePieceType(exits);
                this.grid[row][col] = {
                    type: piece.type,
                    rotation: piece.rotation,
                    solvedRotation: piece.rotation
                };
            }
        }

        // Step 4: Scramble by rotating each piece randomly (but not to solved position)
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.grid[row][col].type !== 'EMPTY' && this.grid[row][col].type !== 'CROSS') {
                    // Rotate 1-3 times (never 0 to ensure it's scrambled)
                    const rotations = 1 + Math.floor(Math.random() * 3);
                    this.grid[row][col].rotation = (this.grid[row][col].rotation + rotations) % 4;
                }
            }
        }
    }

    determinePieceType(exits) {
        const count = exits.length;

        if (count === 0) {
            return { type: 'EMPTY', rotation: 0 };
        }

        if (count === 1) {
            // End piece - rotation is the exit direction
            return { type: 'END', rotation: exits[0] };
        }

        if (count === 2) {
            // Check if straight (opposite directions) or corner (adjacent)
            const diff = Math.abs(exits[1] - exits[0]);
            if (diff === 2) {
                // Straight piece
                // Base straight is up-down (0,2), so rotation is exits[0]
                return { type: 'STRAIGHT', rotation: exits[0] % 2 };
            } else {
                // Corner piece
                // Find the rotation needed to match base corner (0,1 = up-right)
                // Corners: (0,1)->0, (1,2)->1, (2,3)->2, (0,3)->3
                if (exits.includes(0) && exits.includes(1)) return { type: 'CORNER', rotation: 0 };
                if (exits.includes(1) && exits.includes(2)) return { type: 'CORNER', rotation: 1 };
                if (exits.includes(2) && exits.includes(3)) return { type: 'CORNER', rotation: 2 };
                if (exits.includes(0) && exits.includes(3)) return { type: 'CORNER', rotation: 3 };
            }
        }

        if (count === 3) {
            // T-piece - find the missing direction
            const missing = [0, 1, 2, 3].find(d => !exits.includes(d));
            // Base T is (0,1,2) missing 3 (left)
            // Rotation = missing direction rotated to position 3
            return { type: 'T_PIECE', rotation: (missing + 1) % 4 };
        }

        if (count === 4) {
            return { type: 'CROSS', rotation: 0 };
        }

        return { type: 'EMPTY', rotation: 0 };
    }

    getExits(type, rotation) {
        const baseExits = this.PIECE_TYPES[type].exits;
        return baseExits.map(exit => (exit + rotation) % 4);
    }

    hasExit(row, col, direction) {
        const cell = this.grid[row][col];
        const exits = this.getExits(cell.type, cell.rotation);
        return exits.includes(direction);
    }

    isConnected(row, col, direction) {
        // Check if the exit in given direction connects to neighbor's exit
        if (!this.hasExit(row, col, direction)) return null; // No exit to check

        const newRow = row + this.OFFSETS[direction][0];
        const newCol = col + this.OFFSETS[direction][1];

        // Edge of board - not connected
        if (newRow < 0 || newRow >= this.gridSize ||
            newCol < 0 || newCol >= this.gridSize) {
            return false;
        }

        // Check if neighbor has matching exit
        return this.hasExit(newRow, newCol, this.OPPOSITE[direction]);
    }

    checkWin() {
        // All exits must be connected (no loose ends except at edges)
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.grid[row][col];
                if (cell.type === 'EMPTY') continue;

                const exits = this.getExits(cell.type, cell.rotation);
                for (const exit of exits) {
                    const connected = this.isConnected(row, col, exit);
                    if (connected === false) {
                        return false; // Found a loose end
                    }
                }
            }
        }
        return true;
    }

    rotatePiece(row, col) {
        if (this.gameWon) return;

        const cell = this.grid[row][col];
        if (cell.type === 'EMPTY' || cell.type === 'CROSS') return;

        cell.rotation = (cell.rotation + 1) % 4;
        this.moves++;
        this.movesEl.textContent = this.moves;

        this.render();

        if (this.checkWin()) {
            this.showVictory();
        }
    }

    showVictory() {
        this.gameWon = true;
        this.boardEl.classList.add('solved');

        // Track completion
        if (typeof HjernespilAPI !== 'undefined') {
            HjernespilAPI.sessionEvent('win');
        }

        // Show win modal with points
        setTimeout(() => {
            if (typeof HjernespilUI !== 'undefined') {
                HjernespilUI.showWinModal(3);
            }
        }, 500);
    }

    render() {
        this.boardEl.innerHTML = '';

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.grid[row][col];
                const cellEl = document.createElement('div');
                cellEl.className = 'cell';
                cellEl.dataset.row = row;
                cellEl.dataset.col = col;

                if (cell.type !== 'EMPTY') {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = 'yarn-piece';
                    pieceEl.style.transform = `rotate(${cell.rotation * 90}deg)`;

                    // Add yarn lines based on piece type (in base orientation)
                    this.addYarnLines(pieceEl, cell.type);

                    cellEl.appendChild(pieceEl);

                    // Add connection classes for visual feedback
                    const exits = this.getExits(cell.type, cell.rotation);
                    for (const exit of exits) {
                        const connected = this.isConnected(row, col, exit);
                        if (connected === true) {
                            const dirName = ['top', 'right', 'bottom', 'left'][exit];
                            cellEl.classList.add(`connected-${dirName}`);
                        }
                    }

                    cellEl.addEventListener('click', () => this.rotatePiece(row, col));
                }

                this.boardEl.appendChild(cellEl);
            }
        }
    }

    addYarnLines(pieceEl, type) {
        // Add yarn line elements based on piece type (base orientation)
        switch (type) {
            case 'STRAIGHT':
                // Vertical line (up-down in base)
                pieceEl.appendChild(this.createYarnLine('yarn-v'));
                break;

            case 'CORNER':
                // Up and right in base
                pieceEl.appendChild(this.createYarnLine('yarn-top'));
                pieceEl.appendChild(this.createYarnLine('yarn-right'));
                pieceEl.appendChild(this.createYarnLine('yarn-center'));
                break;

            case 'T_PIECE':
                // Up, right, down in base (missing left)
                pieceEl.appendChild(this.createYarnLine('yarn-v'));
                pieceEl.appendChild(this.createYarnLine('yarn-right'));
                pieceEl.appendChild(this.createYarnLine('yarn-center'));
                break;

            case 'CROSS':
                // All directions
                pieceEl.appendChild(this.createYarnLine('yarn-h'));
                pieceEl.appendChild(this.createYarnLine('yarn-v'));
                pieceEl.appendChild(this.createYarnLine('yarn-center'));
                break;

            case 'END':
                // Up only in base
                pieceEl.appendChild(this.createYarnLine('yarn-top'));
                pieceEl.appendChild(this.createYarnLine('yarn-center'));
                break;
        }
    }

    createYarnLine(className) {
        const line = document.createElement('div');
        line.className = `yarn-line ${className}`;
        return line;
    }
}

// Initialize game
new Strikkespil();
