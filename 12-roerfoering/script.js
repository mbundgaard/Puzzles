class PipePuzzle {
    constructor() {
        this.size = 4;
        this.board = [];
        this.startPos = { row: 0, col: 0 };
        this.endPos = { row: 0, col: 0 };
        this.gameOver = false;

        // Pipe types: connections in each direction [top, right, bottom, left]
        this.pipeTypes = {
            straight: [[1, 0, 1, 0], [0, 1, 0, 1]], // vertical, horizontal
            corner: [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [1, 0, 0, 1]], // TR, RB, BL, LT
            tee: [[1, 1, 1, 0], [1, 1, 0, 1], [1, 0, 1, 1], [0, 1, 1, 1]], // no-L, no-B, no-R, no-T
            cross: [[1, 1, 1, 1]]
        };

        this.boardEl = document.getElementById('board');
        this.status = document.getElementById('status');
        this.newGameBtn = document.getElementById('new-game');
        this.diffBtns = document.querySelectorAll('.diff-btn');

        this.newGameBtn.addEventListener('click', () => this.newGame());

        this.diffBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.size = parseInt(btn.dataset.size);
                this.newGame();
            });
        });

        this.newGame();
    }

    newGame() {
        this.gameOver = false;
        this.status.textContent = 'Forbind start til slut';
        this.status.className = 'status';
        this.generatePuzzle();
        this.render();
        HjernespilAPI.trackStart('12');
    }

    generatePuzzle() {
        // Create a solved path first, then scramble
        this.board = [];
        for (let r = 0; r < this.size; r++) {
            this.board.push([]);
            for (let c = 0; c < this.size; c++) {
                this.board[r].push({ type: null, rotation: 0, connections: [0, 0, 0, 0] });
            }
        }

        // Set start and end positions
        this.startPos = { row: 0, col: 0 };
        this.endPos = { row: this.size - 1, col: this.size - 1 };

        // Generate a path from start to end using DFS
        const path = this.generatePath();

        // Fill path with appropriate pipes
        for (let i = 0; i < path.length; i++) {
            const { row, col } = path[i];
            const connections = [0, 0, 0, 0]; // top, right, bottom, left

            if (i > 0) {
                const prev = path[i - 1];
                if (prev.row < row) connections[0] = 1; // from top
                if (prev.row > row) connections[2] = 1; // from bottom
                if (prev.col < col) connections[3] = 1; // from left
                if (prev.col > col) connections[1] = 1; // from right
            }

            if (i < path.length - 1) {
                const next = path[i + 1];
                if (next.row < row) connections[0] = 1; // to top
                if (next.row > row) connections[2] = 1; // to bottom
                if (next.col < col) connections[3] = 1; // to left
                if (next.col > col) connections[1] = 1; // to right
            }

            this.board[row][col].connections = connections;
            this.board[row][col].type = this.getPipeType(connections);
            this.board[row][col].rotation = 0;
        }

        // Scramble by rotating each pipe randomly
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c].type) {
                    const rotations = Math.floor(Math.random() * 4);
                    for (let i = 0; i < rotations; i++) {
                        this.rotatePipe(r, c, false);
                    }
                }
            }
        }
    }

    generatePath() {
        const path = [this.startPos];
        const visited = new Set();
        visited.add(`${this.startPos.row},${this.startPos.col}`);

        while (path.length > 0) {
            const current = path[path.length - 1];

            if (current.row === this.endPos.row && current.col === this.endPos.col) {
                return path;
            }

            const neighbors = this.getNeighbors(current.row, current.col)
                .filter(n => !visited.has(`${n.row},${n.col}`));

            // Prefer moving towards end
            neighbors.sort((a, b) => {
                const distA = Math.abs(a.row - this.endPos.row) + Math.abs(a.col - this.endPos.col);
                const distB = Math.abs(b.row - this.endPos.row) + Math.abs(b.col - this.endPos.col);
                return distA - distB + (Math.random() - 0.5);
            });

            if (neighbors.length > 0) {
                const next = neighbors[0];
                path.push(next);
                visited.add(`${next.row},${next.col}`);
            } else {
                path.pop();
            }
        }

        // Fallback: simple path
        const simplePath = [];
        for (let c = 0; c <= this.endPos.col; c++) {
            simplePath.push({ row: 0, col: c });
        }
        for (let r = 1; r <= this.endPos.row; r++) {
            simplePath.push({ row: r, col: this.endPos.col });
        }
        return simplePath;
    }

    getNeighbors(row, col) {
        const neighbors = [];
        if (row > 0) neighbors.push({ row: row - 1, col });
        if (row < this.size - 1) neighbors.push({ row: row + 1, col });
        if (col > 0) neighbors.push({ row, col: col - 1 });
        if (col < this.size - 1) neighbors.push({ row, col: col + 1 });
        return neighbors;
    }

    getPipeType(connections) {
        const count = connections.reduce((a, b) => a + b, 0);
        if (count === 2) {
            if ((connections[0] && connections[2]) || (connections[1] && connections[3])) {
                return 'straight';
            }
            return 'corner';
        }
        if (count === 3) return 'tee';
        if (count === 4) return 'cross';
        return 'end';
    }

    rotatePipe(row, col, checkWin = true) {
        const cell = this.board[row][col];
        if (!cell.type) return;

        // Rotate connections array
        const last = cell.connections.pop();
        cell.connections.unshift(last);
        cell.rotation = (cell.rotation + 90) % 360;

        if (checkWin) {
            this.render();
            this.checkConnection();
        }
    }

    render() {
        this.boardEl.innerHTML = '';
        this.boardEl.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';

                if (r === this.startPos.row && c === this.startPos.col) {
                    cell.classList.add('start');
                }
                if (r === this.endPos.row && c === this.endPos.col) {
                    cell.classList.add('end');
                }

                const pipe = this.board[r][c];
                if (pipe.type) {
                    cell.innerHTML = this.createPipeSVG(pipe.connections, pipe.rotation,
                        (r === this.startPos.row && c === this.startPos.col) ||
                        (r === this.endPos.row && c === this.endPos.col));
                }

                cell.addEventListener('click', () => {
                    if (!this.gameOver) {
                        this.rotatePipe(r, c);
                    }
                });

                this.boardEl.appendChild(cell);
            }
        }
    }

    createPipeSVG(connections, rotation, isEndpoint) {
        const [top, right, bottom, left] = connections;
        let paths = '';

        // Center point
        const cx = 25, cy = 25;

        if (top) paths += `<line class="pipe" x1="${cx}" y1="0" x2="${cx}" y2="${cy}"/>`;
        if (right) paths += `<line class="pipe" x1="${cx}" y1="${cy}" x2="50" y2="${cy}"/>`;
        if (bottom) paths += `<line class="pipe" x1="${cx}" y1="${cy}" x2="${cx}" y2="50"/>`;
        if (left) paths += `<line class="pipe" x1="0" y1="${cy}" x2="${cx}" y2="${cy}"/>`;

        if (isEndpoint) {
            paths += `<circle class="endpoint" cx="${cx}" cy="${cy}" r="6"/>`;
        }

        return `<svg viewBox="0 0 50 50">${paths}</svg>`;
    }

    checkConnection() {
        // BFS from start to end
        const visited = new Set();
        const queue = [this.startPos];
        visited.add(`${this.startPos.row},${this.startPos.col}`);

        // Reset connected state
        const cells = this.boardEl.querySelectorAll('.cell');
        cells.forEach(cell => cell.classList.remove('connected'));

        const connectedCells = [];

        while (queue.length > 0) {
            const current = queue.shift();
            connectedCells.push(current);

            const currentPipe = this.board[current.row][current.col];
            const [top, right, bottom, left] = currentPipe.connections;

            const directions = [
                { dr: -1, dc: 0, myDir: 0, theirDir: 2 }, // top
                { dr: 0, dc: 1, myDir: 1, theirDir: 3 },  // right
                { dr: 1, dc: 0, myDir: 2, theirDir: 0 },  // bottom
                { dr: 0, dc: -1, myDir: 3, theirDir: 1 }  // left
            ];

            for (const dir of directions) {
                if (!currentPipe.connections[dir.myDir]) continue;

                const nr = current.row + dir.dr;
                const nc = current.col + dir.dc;

                if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
                if (visited.has(`${nr},${nc}`)) continue;

                const neighborPipe = this.board[nr][nc];
                if (!neighborPipe.type) continue;

                if (neighborPipe.connections[dir.theirDir]) {
                    visited.add(`${nr},${nc}`);
                    queue.push({ row: nr, col: nc });
                }
            }
        }

        // Mark connected cells
        connectedCells.forEach(pos => {
            const idx = pos.row * this.size + pos.col;
            cells[idx].classList.add('connected');
        });

        // Check if end is reached
        if (visited.has(`${this.endPos.row},${this.endPos.col}`)) {
            this.gameOver = true;
            this.status.textContent = 'Tillykke! Du klarede det!';
            this.status.className = 'status winner';
            HjernespilAPI.trackComplete('12');
            HjernespilUI.showWinModal(1);
        }
    }
}

// Start game
new PipePuzzle();
