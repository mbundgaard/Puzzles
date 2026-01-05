class MazeGame {
    constructor() {
        // Maze size (must be odd for proper maze generation)
        this.cols = 15;
        this.rows = 15;
        this.visibilityRadius = 3; // How many cells the player can see around them (7x7 area)

        this.boardEl = document.getElementById('board');
        this.movesEl = document.getElementById('moves');
        this.newGameBtn = document.getElementById('new-game');
        this.exitArrowEl = document.getElementById('exit-arrow');
        this.exitDirectionEl = document.getElementById('exit-direction');

        this.maze = [];
        this.player = { x: 1, y: 1 };
        this.exit = { x: this.cols - 2, y: this.rows - 2 };
        this.moves = 0;
        this.gameOver = false;

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Arrow button controls
        this.setupButtonControls();

        this.newGame();
    }

    newGame() {
        this.moves = 0;
        this.movesEl.textContent = '0';
        this.gameOver = false;
        this.player = { x: 1, y: 1 };
        this.exit = { x: this.cols - 2, y: this.rows - 2 };

        this.generateMaze();
        this.render();
        this.updateExitArrow();

        HjernespilAPI.trackStart('28');
    }

    updateExitArrow() {
        const dx = this.exit.x - this.player.x;
        const dy = this.exit.y - this.player.y;

        // Check if player is at exit
        if (dx === 0 && dy === 0) {
            this.exitArrowEl.textContent = '✓';
            this.exitDirectionEl.classList.add('found');
            return;
        }

        this.exitDirectionEl.classList.remove('found');

        // Calculate angle and pick appropriate arrow
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // 8 directions
        let arrow;
        if (angle >= -22.5 && angle < 22.5) arrow = '→';
        else if (angle >= 22.5 && angle < 67.5) arrow = '↘';
        else if (angle >= 67.5 && angle < 112.5) arrow = '↓';
        else if (angle >= 112.5 && angle < 157.5) arrow = '↙';
        else if (angle >= 157.5 || angle < -157.5) arrow = '←';
        else if (angle >= -157.5 && angle < -112.5) arrow = '↖';
        else if (angle >= -112.5 && angle < -67.5) arrow = '↑';
        else arrow = '↗';

        this.exitArrowEl.textContent = arrow;
    }

    generateMaze() {
        // Initialize maze with all walls
        this.maze = [];
        for (let y = 0; y < this.rows; y++) {
            this.maze[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.maze[y][x] = {
                    visited: false,
                    walls: { top: true, right: true, bottom: true, left: true }
                };
            }
        }

        // Recursive backtracking maze generation
        const stack = [];
        const startX = 1;
        const startY = 1;

        this.maze[startY][startX].visited = true;
        stack.push({ x: startX, y: startY });

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(current.x, current.y);

            if (neighbors.length === 0) {
                stack.pop();
            } else {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                this.removeWall(current, next);
                this.maze[next.y][next.x].visited = true;
                stack.push(next);
            }
        }

        // Ensure exit is reachable (remove walls around exit if needed)
        this.maze[this.exit.y][this.exit.x].visited = true;
    }

    getUnvisitedNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            { dx: 0, dy: -1, wall: 'top', opposite: 'bottom' },
            { dx: 1, dy: 0, wall: 'right', opposite: 'left' },
            { dx: 0, dy: 1, wall: 'bottom', opposite: 'top' },
            { dx: -1, dy: 0, wall: 'left', opposite: 'right' }
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;

            if (nx > 0 && nx < this.cols - 1 && ny > 0 && ny < this.rows - 1) {
                if (!this.maze[ny][nx].visited) {
                    neighbors.push({ x: nx, y: ny, wall: dir.wall, opposite: dir.opposite });
                }
            }
        }

        return neighbors;
    }

    removeWall(current, next) {
        const dx = next.x - current.x;
        const dy = next.y - current.y;

        if (dx === 1) {
            this.maze[current.y][current.x].walls.right = false;
            this.maze[next.y][next.x].walls.left = false;
        } else if (dx === -1) {
            this.maze[current.y][current.x].walls.left = false;
            this.maze[next.y][next.x].walls.right = false;
        } else if (dy === 1) {
            this.maze[current.y][current.x].walls.bottom = false;
            this.maze[next.y][next.x].walls.top = false;
        } else if (dy === -1) {
            this.maze[current.y][current.x].walls.top = false;
            this.maze[next.y][next.x].walls.bottom = false;
        }
    }

    render() {
        this.boardEl.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        this.boardEl.innerHTML = '';

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                const mazeCell = this.maze[y][x];

                // Add wall classes (skip outer walls)
                if (mazeCell.walls.top && y > 0) cell.classList.add('wall-top');
                if (mazeCell.walls.right && x < this.cols - 1) cell.classList.add('wall-right');
                if (mazeCell.walls.bottom && y < this.rows - 1) cell.classList.add('wall-bottom');
                if (mazeCell.walls.left && x > 0) cell.classList.add('wall-left');

                // Calculate distance from player for fog of war
                const distance = this.getDistance(x, y, this.player.x, this.player.y);

                if (distance > this.visibilityRadius) {
                    cell.classList.add('fog');
                } else if (distance === this.visibilityRadius) {
                    cell.classList.add('dim');
                }

                // Mark special cells (only if visible)
                if (distance <= this.visibilityRadius) {
                    if (x === this.player.x && y === this.player.y) {
                        cell.classList.add('player');
                    } else if (x === this.exit.x && y === this.exit.y) {
                        cell.classList.add('exit');
                    } else if (x === 1 && y === 1) {
                        cell.classList.add('start');
                    }
                }

                this.boardEl.appendChild(cell);
            }
        }
    }

    getDistance(x1, y1, x2, y2) {
        // Chebyshev distance (allows diagonal visibility)
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }

    move(dx, dy) {
        if (this.gameOver) return;

        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        // Check bounds
        if (newX < 0 || newX >= this.cols || newY < 0 || newY >= this.rows) {
            return;
        }

        // Check walls
        const currentCell = this.maze[this.player.y][this.player.x];

        if (dx === 1 && currentCell.walls.right) return;
        if (dx === -1 && currentCell.walls.left) return;
        if (dy === 1 && currentCell.walls.bottom) return;
        if (dy === -1 && currentCell.walls.top) return;

        // Move player
        this.player.x = newX;
        this.player.y = newY;
        this.moves++;
        this.movesEl.textContent = this.moves;

        this.render();
        this.updateExitArrow();

        // Check for victory
        if (this.player.x === this.exit.x && this.player.y === this.exit.y) {
            this.victory();
        }
    }

    handleKeydown(e) {
        if (this.gameOver) return;

        const key = e.key;

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                e.preventDefault();
                this.move(0, -1);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                e.preventDefault();
                this.move(0, 1);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                e.preventDefault();
                this.move(-1, 0);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                e.preventDefault();
                this.move(1, 0);
                break;
        }
    }

    setupButtonControls() {
        document.getElementById('btn-up').addEventListener('click', () => this.move(0, -1));
        document.getElementById('btn-down').addEventListener('click', () => this.move(0, 1));
        document.getElementById('btn-left').addEventListener('click', () => this.move(-1, 0));
        document.getElementById('btn-right').addEventListener('click', () => this.move(1, 0));
    }

    victory() {
        this.gameOver = true;

        HjernespilAPI.trackComplete('28');
        HjernespilUI.showWinModal(3);
    }
}

new MazeGame();
