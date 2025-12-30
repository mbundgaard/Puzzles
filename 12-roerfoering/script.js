class PipePuzzle {
    constructor() {
        this.size = 6;
        this.board = [];
        this.tray = [];
        this.selectedPipe = null;
        this.startPos = { row: 0, col: 0 };
        this.endPos = { row: 5, col: 5 };
        this.gameOver = false;
        this.difficulty = 'hard';
        this.fixedCells = new Set();

        this.boardEl = document.getElementById('board');
        this.trayEl = document.getElementById('tray');
        this.status = document.getElementById('status');
        this.newGameBtn = document.getElementById('new-game');
        this.diffBtns = document.querySelectorAll('.diff-btn');

        this.newGameBtn.addEventListener('click', () => this.newGame());

        this.diffBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.difficulty = btn.dataset.difficulty;
                this.newGame();
            });
        });

        this.newGame();
    }

    newGame() {
        this.gameOver = false;
        this.selectedPipe = null;
        this.fixedCells = new Set();
        this.status.textContent = 'Placer alle rør for at forbinde start til slut';
        this.status.className = 'status';

        // Initialize empty board
        this.board = [];
        for (let r = 0; r < this.size; r++) {
            this.board.push([]);
            for (let c = 0; c < this.size; c++) {
                this.board[r].push(null);
            }
        }

        this.tray = [];
        this.generatePuzzle();
        this.render();
        HjernespilAPI.trackStart('12');
    }

    generatePuzzle() {
        // Minimum path length based on difficulty (adds complexity)
        let minPathLength = 12; // Easy
        if (this.difficulty === 'medium') minPathLength = 14;
        if (this.difficulty === 'hard') minPathLength = 16;

        // Generate a solved path first (retry if too short)
        let path;
        let attempts = 0;
        do {
            path = this.generatePath();
            attempts++;
        } while (path.length < minPathLength && attempts < 50);

        const pipes = [];

        // Create pipes for the path
        for (let i = 0; i < path.length; i++) {
            const { row, col } = path[i];
            const connections = [0, 0, 0, 0]; // top, right, bottom, left

            if (i > 0) {
                const prev = path[i - 1];
                if (prev.row < row) connections[0] = 1;
                if (prev.row > row) connections[2] = 1;
                if (prev.col < col) connections[3] = 1;
                if (prev.col > col) connections[1] = 1;
            }

            if (i < path.length - 1) {
                const next = path[i + 1];
                if (next.row < row) connections[0] = 1;
                if (next.row > row) connections[2] = 1;
                if (next.col < col) connections[3] = 1;
                if (next.col > col) connections[1] = 1;
            }

            pipes.push({
                connections: connections,
                correctRow: row,
                correctCol: col,
                id: i
            });
        }

        // Always place start and end pipes on the board
        const startPipe = pipes[0];
        const endPipe = pipes[pipes.length - 1];

        this.board[startPipe.correctRow][startPipe.correctCol] = {
            connections: startPipe.connections,
            id: startPipe.id
        };
        this.fixedCells.add(`${startPipe.correctRow},${startPipe.correctCol}`);

        this.board[endPipe.correctRow][endPipe.correctCol] = {
            connections: endPipe.connections,
            id: endPipe.id
        };
        this.fixedCells.add(`${endPipe.correctRow},${endPipe.correctCol}`);

        // Get middle pipes (exclude start and end)
        const middlePipes = pipes.slice(1, -1);

        // No additional fixed pipes - all middle pipes go to tray
        let additionalFixed = 0;

        // Shuffle middle pipes to pick random ones to fix
        const shuffledIndices = [...Array(middlePipes.length).keys()];
        this.shuffleArray(shuffledIndices);

        // Place additional fixed pipes on board
        for (let i = 0; i < additionalFixed && i < middlePipes.length; i++) {
            const pipeIdx = shuffledIndices[i];
            const pipe = middlePipes[pipeIdx];
            this.board[pipe.correctRow][pipe.correctCol] = {
                connections: pipe.connections,
                id: pipe.id
            };
            this.fixedCells.add(`${pipe.correctRow},${pipe.correctCol}`);
        }

        // Put remaining middle pipes in tray (shuffled)
        for (let i = additionalFixed; i < shuffledIndices.length; i++) {
            const pipeIdx = shuffledIndices[i];
            const pipe = middlePipes[pipeIdx];
            this.tray.push({
                connections: pipe.connections,
                id: pipe.id
            });
        }

        this.shuffleArray(this.tray);
    }

    generatePath() {
        // Generate a winding path from start to end
        const path = [{ ...this.startPos }];
        const visited = new Set();
        visited.add(`${this.startPos.row},${this.startPos.col}`);

        let current = { ...this.startPos };

        while (current.row !== this.endPos.row || current.col !== this.endPos.col) {
            const neighbors = this.getNeighbors(current.row, current.col)
                .filter(n => !visited.has(`${n.row},${n.col}`));

            if (neighbors.length === 0) {
                // Backtrack if stuck
                if (path.length > 1) {
                    path.pop();
                    current = path[path.length - 1];
                    continue;
                }
                break;
            }

            // Add randomness but generally move towards end
            neighbors.sort((a, b) => {
                const distA = Math.abs(a.row - this.endPos.row) + Math.abs(a.col - this.endPos.col);
                const distB = Math.abs(b.row - this.endPos.row) + Math.abs(b.col - this.endPos.col);
                // Add significant randomness to create winding paths
                return (distA - distB) + (Math.random() - 0.5) * 6;
            });

            const next = neighbors[0];
            path.push(next);
            visited.add(`${next.row},${next.col}`);
            current = next;
        }

        return path;
    }

    getNeighbors(row, col) {
        const neighbors = [];
        if (row > 0) neighbors.push({ row: row - 1, col });
        if (row < this.size - 1) neighbors.push({ row: row + 1, col });
        if (col > 0) neighbors.push({ row, col: col - 1 });
        if (col < this.size - 1) neighbors.push({ row, col: col + 1 });
        return neighbors;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    render() {
        this.renderBoard();
        this.renderTray();
    }

    renderBoard() {
        this.boardEl.innerHTML = '';
        this.boardEl.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';

                const isStart = r === this.startPos.row && c === this.startPos.col;
                const isEnd = r === this.endPos.row && c === this.endPos.col;
                const isFixed = this.fixedCells.has(`${r},${c}`);

                if (isStart) cell.classList.add('start');
                if (isEnd) cell.classList.add('end');
                if (isFixed) cell.classList.add('fixed');

                const pipe = this.board[r][c];
                if (pipe) {
                    cell.innerHTML = this.createPipeSVG(pipe.connections, isStart || isEnd);
                    cell.classList.add('has-pipe');
                }

                if (!this.gameOver && !isFixed) {
                    cell.addEventListener('click', () => this.handleCellClick(r, c));
                }

                this.boardEl.appendChild(cell);
            }
        }
    }

    renderTray() {
        this.trayEl.innerHTML = '';

        if (this.tray.length === 0) {
            this.trayEl.innerHTML = '<div class="tray-empty">Alle rør er placeret</div>';
            return;
        }

        this.tray.forEach((pipe, index) => {
            const pipeEl = document.createElement('div');
            pipeEl.className = 'tray-pipe';
            if (this.selectedPipe === index) {
                pipeEl.classList.add('selected');
            }
            pipeEl.innerHTML = this.createPipeSVG(pipe.connections, false);

            pipeEl.addEventListener('click', () => {
                if (this.gameOver) return;
                if (this.selectedPipe === index) {
                    this.selectedPipe = null;
                } else {
                    this.selectedPipe = index;
                }
                this.render();
            });

            this.trayEl.appendChild(pipeEl);
        });
    }

    handleCellClick(row, col) {
        if (this.gameOver) return;
        if (this.fixedCells.has(`${row},${col}`)) return;

        const currentPipe = this.board[row][col];

        if (currentPipe !== null) {
            // Return pipe to tray
            this.tray.push(currentPipe);
            this.board[row][col] = null;
            this.selectedPipe = null;
            this.render();
            return;
        }

        if (this.selectedPipe !== null) {
            // Place selected pipe
            const pipe = this.tray[this.selectedPipe];
            this.board[row][col] = pipe;
            this.tray.splice(this.selectedPipe, 1);
            this.selectedPipe = null;
            this.render();
            this.checkWin();
        }
    }

    createPipeSVG(connections, isEndpoint) {
        const [top, right, bottom, left] = connections;
        let paths = '';
        const cx = 25, cy = 25;

        if (top) paths += `<line class="pipe" x1="${cx}" y1="0" x2="${cx}" y2="${cy}"/>`;
        if (right) paths += `<line class="pipe" x1="${cx}" y1="${cy}" x2="50" y2="${cy}"/>`;
        if (bottom) paths += `<line class="pipe" x1="${cx}" y1="${cy}" x2="${cx}" y2="50"/>`;
        if (left) paths += `<line class="pipe" x1="0" y1="${cy}" x2="${cx}" y2="${cy}"/>`;

        if (isEndpoint) {
            paths += `<circle class="endpoint" cx="${cx}" cy="${cy}" r="6"/>`;
        } else {
            paths += `<circle class="pipe-center" cx="${cx}" cy="${cy}" r="4"/>`;
        }

        return `<svg viewBox="0 0 50 50">${paths}</svg>`;
    }

    checkWin() {
        // Must use all pipes
        if (this.tray.length > 0) return;

        // Check if path connects start to end
        const visited = new Set();
        const queue = [this.startPos];
        visited.add(`${this.startPos.row},${this.startPos.col}`);

        while (queue.length > 0) {
            const current = queue.shift();
            const currentPipe = this.board[current.row][current.col];

            if (!currentPipe) continue;

            const directions = [
                { dr: -1, dc: 0, myDir: 0, theirDir: 2 },
                { dr: 0, dc: 1, myDir: 1, theirDir: 3 },
                { dr: 1, dc: 0, myDir: 2, theirDir: 0 },
                { dr: 0, dc: -1, myDir: 3, theirDir: 1 }
            ];

            for (const dir of directions) {
                if (!currentPipe.connections[dir.myDir]) continue;

                const nr = current.row + dir.dr;
                const nc = current.col + dir.dc;

                if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
                if (visited.has(`${nr},${nc}`)) continue;

                const neighborPipe = this.board[nr][nc];
                if (!neighborPipe) continue;

                if (neighborPipe.connections[dir.theirDir]) {
                    visited.add(`${nr},${nc}`);
                    queue.push({ row: nr, col: nc });
                }
            }
        }

        if (visited.has(`${this.endPos.row},${this.endPos.col}`)) {
            this.gameOver = true;
            this.status.textContent = 'Tillykke! Du klarede det!';
            this.status.className = 'status winner';

            // Highlight connected path
            const cells = this.boardEl.querySelectorAll('.cell');
            visited.forEach(key => {
                const [r, c] = key.split(',').map(Number);
                cells[r * this.size + c].classList.add('connected');
            });

            // Points based on difficulty
            let points = 2;
            if (this.difficulty === 'medium') points = 3;
            if (this.difficulty === 'hard') points = 4;

            HjernespilAPI.trackComplete('12');
            HjernespilUI.showWinModal(points);
        }
    }
}

// Start game
new PipePuzzle();
