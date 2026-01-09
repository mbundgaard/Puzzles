class SnakeGame {
    constructor() {
        this.difficulties = {
            easy: { size: 15, speed: 200, target: 10, points: 2 },
            medium: { size: 12, speed: 150, target: 15, points: 3 },
            hard: { size: 10, speed: 100, target: 20, points: 4 }
        };

        this.boardEl = document.getElementById('board');
        this.scoreEl = document.getElementById('score');
        this.targetEl = document.getElementById('target');
        this.startScreen = document.getElementById('start-screen');
        this.controlsEl = document.getElementById('controls');
        this.gameOverOverlay = document.getElementById('game-over');
        this.finalScoreEl = document.getElementById('final-score');
        this.retryBtn = document.getElementById('retry');
        this.diffBtns = document.querySelectorAll('.diff-btn');

        this.snake = [];
        this.food = null;
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.gameLoop = null;
        this.gameRunning = false;
        this.score = 0;
        this.difficulty = 'medium';

        this.init();
    }

    init() {
        this.diffBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.difficulty = btn.dataset.difficulty;
                this.startGame();
            });
        });

        this.retryBtn.addEventListener('click', () => {
            this.gameOverOverlay.classList.remove('show');
            this.showStartScreen();
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Arrow button controls
        this.setupButtonControls();

        this.showStartScreen();
    }

    showStartScreen() {
        this.startScreen.classList.remove('hidden');
        this.controlsEl.classList.remove('visible');
        // Render empty board for background
        const config = this.difficulties.medium;
        this.size = config.size;
        this.renderBoard();
    }

    startGame() {
        const config = this.difficulties[this.difficulty];
        this.size = config.size;
        this.speed = config.speed;
        this.target = config.target;
        this.points = config.points;

        this.targetEl.textContent = this.target;
        this.score = 0;
        this.scoreEl.textContent = this.score;

        // Initialize snake in center
        const centerX = Math.floor(this.size / 2);
        const centerY = Math.floor(this.size / 2);
        this.snake = [
            { x: centerX, y: centerY },
            { x: centerX - 1, y: centerY },
            { x: centerX - 2, y: centerY }
        ];

        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };

        this.startScreen.classList.add('hidden');
        this.controlsEl.classList.add('visible');
        this.renderBoard();
        this.placeFood();

        this.gameRunning = true;
        this.gameLoop = setInterval(() => this.update(), this.speed);

        HjernespilAPI.sessionEvent('newGame');
    }

    renderBoard() {
        this.boardEl.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
        this.boardEl.innerHTML = '';

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                this.boardEl.appendChild(cell);
            }
        }
    }

    placeFood() {
        let x, y;
        do {
            x = Math.floor(Math.random() * this.size);
            y = Math.floor(Math.random() * this.size);
        } while (this.snake.some(seg => seg.x === x && seg.y === y));

        this.food = { x, y };
        this.render();
    }

    update() {
        if (!this.gameRunning) return;

        // Apply next direction
        this.direction = { ...this.nextDirection };

        // Calculate new head position
        const head = this.snake[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };

        // Check wall collision
        if (newHead.x < 0 || newHead.x >= this.size ||
            newHead.y < 0 || newHead.y >= this.size) {
            this.gameOver();
            return;
        }

        // Check self collision
        if (this.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
            this.gameOver();
            return;
        }

        // Add new head
        this.snake.unshift(newHead);

        // Check food collision
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score++;
            this.scoreEl.textContent = this.score;

            if (this.score >= this.target) {
                this.victory();
                return;
            }

            this.placeFood();
        } else {
            // Remove tail if no food eaten
            this.snake.pop();
        }

        this.render();
    }

    render() {
        // Clear all cells
        const cells = this.boardEl.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.className = 'cell';
        });

        // Render snake
        this.snake.forEach((seg, index) => {
            const cell = this.boardEl.querySelector(`[data-x="${seg.x}"][data-y="${seg.y}"]`);
            if (cell) {
                if (index === 0) {
                    cell.classList.add('snake-head');
                } else {
                    cell.classList.add('snake');
                }
            }
        });

        // Render food
        if (this.food) {
            const foodCell = this.boardEl.querySelector(`[data-x="${this.food.x}"][data-y="${this.food.y}"]`);
            if (foodCell) {
                foodCell.classList.add('food');
            }
        }
    }

    handleKeydown(e) {
        if (!this.gameRunning) return;

        const key = e.key;

        if (key === 'ArrowUp' && this.direction.y !== 1) {
            this.nextDirection = { x: 0, y: -1 };
            e.preventDefault();
        } else if (key === 'ArrowDown' && this.direction.y !== -1) {
            this.nextDirection = { x: 0, y: 1 };
            e.preventDefault();
        } else if (key === 'ArrowLeft' && this.direction.x !== 1) {
            this.nextDirection = { x: -1, y: 0 };
            e.preventDefault();
        } else if (key === 'ArrowRight' && this.direction.x !== -1) {
            this.nextDirection = { x: 1, y: 0 };
            e.preventDefault();
        }
    }

    setupButtonControls() {
        const btnUp = document.getElementById('btn-up');
        const btnDown = document.getElementById('btn-down');
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');

        btnUp.addEventListener('click', () => {
            if (this.gameRunning && this.direction.y !== 1) {
                this.nextDirection = { x: 0, y: -1 };
            }
        });

        btnDown.addEventListener('click', () => {
            if (this.gameRunning && this.direction.y !== -1) {
                this.nextDirection = { x: 0, y: 1 };
            }
        });

        btnLeft.addEventListener('click', () => {
            if (this.gameRunning && this.direction.x !== 1) {
                this.nextDirection = { x: -1, y: 0 };
            }
        });

        btnRight.addEventListener('click', () => {
            if (this.gameRunning && this.direction.x !== -1) {
                this.nextDirection = { x: 1, y: 0 };
            }
        });
    }

    gameOver() {
        this.gameRunning = false;
        clearInterval(this.gameLoop);

        this.finalScoreEl.textContent = this.score;
        setTimeout(() => {
            this.gameOverOverlay.classList.add('show');
        }, 200);
    }

    victory() {
        this.gameRunning = false;
        clearInterval(this.gameLoop);

        HjernespilAPI.sessionEvent('win');
        HjernespilUI.showWinModal(this.points);
    }
}

new SnakeGame();
