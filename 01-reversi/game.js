/**
 * Reversi Game with Minimax AI
 */

const BLACK = 1;  // Human
const WHITE = 2;  // AI
const EMPTY = 0;

const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0], [1, 1]
];

// Position weights for evaluation (8x8 board, scaled for other sizes)
const POSITION_WEIGHTS_8 = [
    [100, -20,  10,   5,   5,  10, -20, 100],
    [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
    [ 10,  -2,   5,   1,   1,   5,  -2,  10],
    [  5,  -2,   1,   0,   0,   1,  -2,   5],
    [  5,  -2,   1,   0,   0,   1,  -2,   5],
    [ 10,  -2,   5,   1,   1,   5,  -2,  10],
    [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
    [100, -20,  10,   5,   5,  10, -20, 100]
];

class ReversiGame {
    constructor(size = 8) {
        this.size = size;
        this.board = [];
        this.currentPlayer = BLACK;
        this.gameOver = false;
        this.positionWeights = this.generatePositionWeights();
        this.initBoard();
    }

    generatePositionWeights() {
        // Scale the 8x8 weights for different board sizes
        const weights = [];
        for (let i = 0; i < this.size; i++) {
            weights[i] = [];
            for (let j = 0; j < this.size; j++) {
                // Map position to 8x8 grid
                const mappedI = Math.floor(i * 8 / this.size);
                const mappedJ = Math.floor(j * 8 / this.size);
                weights[i][j] = POSITION_WEIGHTS_8[mappedI][mappedJ];
            }
        }
        // Ensure corners are highly valued
        weights[0][0] = 100;
        weights[0][this.size - 1] = 100;
        weights[this.size - 1][0] = 100;
        weights[this.size - 1][this.size - 1] = 100;
        return weights;
    }

    initBoard() {
        this.board = [];
        for (let i = 0; i < this.size; i++) {
            this.board[i] = [];
            for (let j = 0; j < this.size; j++) {
                this.board[i][j] = EMPTY;
            }
        }
        // Set up initial pieces in the center
        const mid = this.size / 2;
        this.board[mid - 1][mid - 1] = WHITE;
        this.board[mid - 1][mid] = BLACK;
        this.board[mid][mid - 1] = BLACK;
        this.board[mid][mid] = WHITE;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    getFlippedPieces(row, col, player, board = this.board) {
        if (board[row][col] !== EMPTY) return [];

        const opponent = player === BLACK ? WHITE : BLACK;
        const allFlipped = [];

        for (const [dr, dc] of DIRECTIONS) {
            const flipped = [];
            let r = row + dr;
            let c = col + dc;

            // Move in direction while finding opponent pieces
            while (this.isValidPosition(r, c) && board[r][c] === opponent) {
                flipped.push([r, c]);
                r += dr;
                c += dc;
            }

            // Check if we ended on our own piece (valid capture)
            if (flipped.length > 0 && this.isValidPosition(r, c) && board[r][c] === player) {
                allFlipped.push(...flipped);
            }
        }

        return allFlipped;
    }

    isValidMove(row, col, player, board = this.board) {
        return this.getFlippedPieces(row, col, player, board).length > 0;
    }

    getValidMoves(player, board = this.board) {
        const moves = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.isValidMove(i, j, player, board)) {
                    moves.push([i, j]);
                }
            }
        }
        return moves;
    }

    makeMove(row, col, player, board = this.board) {
        const flipped = this.getFlippedPieces(row, col, player, board);
        if (flipped.length === 0) return null;

        board[row][col] = player;
        for (const [r, c] of flipped) {
            board[r][c] = player;
        }
        return flipped;
    }

    copyBoard(board) {
        return board.map(row => [...row]);
    }

    countPieces(board = this.board) {
        let black = 0, white = 0;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (board[i][j] === BLACK) black++;
                else if (board[i][j] === WHITE) white++;
            }
        }
        return { black, white };
    }

    // Evaluation function for the AI
    evaluate(board, player) {
        const opponent = player === BLACK ? WHITE : BLACK;
        let score = 0;

        // Piece count
        const pieces = this.countPieces(board);
        const pieceScore = player === WHITE ?
            pieces.white - pieces.black :
            pieces.black - pieces.white;

        // Position-based score
        let positionScore = 0;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (board[i][j] === player) {
                    positionScore += this.positionWeights[i][j];
                } else if (board[i][j] === opponent) {
                    positionScore -= this.positionWeights[i][j];
                }
            }
        }

        // Mobility (number of valid moves)
        const myMoves = this.getValidMoves(player, board).length;
        const oppMoves = this.getValidMoves(opponent, board).length;
        const mobilityScore = myMoves - oppMoves;

        // Corner occupancy
        const corners = [
            [0, 0], [0, this.size - 1],
            [this.size - 1, 0], [this.size - 1, this.size - 1]
        ];
        let cornerScore = 0;
        for (const [r, c] of corners) {
            if (board[r][c] === player) cornerScore += 25;
            else if (board[r][c] === opponent) cornerScore -= 25;
        }

        // Combine scores with weights
        score = pieceScore * 1 + positionScore * 2 + mobilityScore * 5 + cornerScore * 10;
        return score;
    }

    // Minimax with alpha-beta pruning
    minimax(board, depth, alpha, beta, maximizingPlayer, player) {
        const opponent = player === BLACK ? WHITE : BLACK;
        const moves = this.getValidMoves(maximizingPlayer ? player : opponent, board);

        // Terminal conditions
        if (depth === 0) {
            return { score: this.evaluate(board, player) };
        }

        const oppMoves = this.getValidMoves(maximizingPlayer ? opponent : player, board);

        if (moves.length === 0 && oppMoves.length === 0) {
            // Game over
            const pieces = this.countPieces(board);
            const diff = player === WHITE ?
                pieces.white - pieces.black :
                pieces.black - pieces.white;
            return { score: diff * 1000 };
        }

        if (moves.length === 0) {
            // Pass turn
            return this.minimax(board, depth - 1, alpha, beta, !maximizingPlayer, player);
        }

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            let bestMove = moves[0];

            for (const [row, col] of moves) {
                const newBoard = this.copyBoard(board);
                this.makeMove(row, col, player, newBoard);
                const result = this.minimax(newBoard, depth - 1, alpha, beta, false, player);

                if (result.score > maxEval) {
                    maxEval = result.score;
                    bestMove = [row, col];
                }
                alpha = Math.max(alpha, result.score);
                if (beta <= alpha) break;
            }
            return { score: maxEval, move: bestMove };
        } else {
            let minEval = Infinity;
            let bestMove = moves[0];

            for (const [row, col] of moves) {
                const newBoard = this.copyBoard(board);
                this.makeMove(row, col, opponent, newBoard);
                const result = this.minimax(newBoard, depth - 1, alpha, beta, true, player);

                if (result.score < minEval) {
                    minEval = result.score;
                    bestMove = [row, col];
                }
                beta = Math.min(beta, result.score);
                if (beta <= alpha) break;
            }
            return { score: minEval, move: bestMove };
        }
    }

    getBestMove(player) {
        // Adjust depth based on board size and game phase
        const emptyCount = this.size * this.size -
            this.countPieces().black - this.countPieces().white;

        let depth;
        if (this.size === 6) {
            depth = emptyCount < 10 ? 8 : 6;
        } else if (this.size === 8) {
            depth = emptyCount < 12 ? 6 : 5;
        } else {
            depth = emptyCount < 15 ? 5 : 4;
        }

        const result = this.minimax(
            this.copyBoard(this.board),
            depth,
            -Infinity,
            Infinity,
            true,
            player
        );
        return result.move;
    }
}

// UI Controller
class GameUI {
    constructor() {
        this.game = null;
        this.boardElement = document.getElementById('board');
        this.statusElement = document.getElementById('status');
        this.blackScoreElement = document.getElementById('black-score');
        this.whiteScoreElement = document.getElementById('white-score');
        this.boardSizeSelect = document.getElementById('board-size');
        this.newGameButton = document.getElementById('new-game');

        this.setupEventListeners();
        this.startNewGame();
    }

    setupEventListeners() {
        this.newGameButton.addEventListener('click', () => this.startNewGame());
        this.boardSizeSelect.addEventListener('change', () => this.startNewGame());
    }

    startNewGame() {
        const size = parseInt(this.boardSizeSelect.value);
        this.game = new ReversiGame(size);
        this.renderBoard();
        this.updateStatus();
        this.updateScores();
        HjernespilAPI.sessionEvent('newGame');
    }

    renderBoard() {
        const size = this.game.size;
        this.boardElement.innerHTML = '';
        this.boardElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        this.boardElement.className = `board size-${size}`;

        const validMoves = this.game.getValidMoves(this.game.currentPlayer);

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;

                // Check if this is a valid move for current player
                const isValidMove = validMoves.some(([r, c]) => r === i && c === j);
                if (isValidMove && this.game.currentPlayer === BLACK && !this.game.gameOver) {
                    cell.classList.add('valid-move');
                }

                // Add piece if present
                if (this.game.board[i][j] !== EMPTY) {
                    const piece = document.createElement('div');
                    piece.className = `piece ${this.game.board[i][j] === BLACK ? 'black' : 'white'}`;
                    cell.appendChild(piece);
                }

                cell.addEventListener('click', () => this.handleCellClick(i, j));
                this.boardElement.appendChild(cell);
            }
        }
    }

    async handleCellClick(row, col) {
        // Only allow clicks during human turn
        if (this.game.currentPlayer !== BLACK || this.game.gameOver) return;

        // Check if valid move
        if (!this.game.isValidMove(row, col, BLACK)) return;

        // Make the move
        const flipped = this.game.makeMove(row, col, BLACK);
        await this.animateMove(row, col, BLACK, flipped);

        // Switch to AI turn
        this.game.currentPlayer = WHITE;
        this.updateScores();

        // Check for game over or pass
        await this.handleTurnSwitch();
    }

    async handleTurnSwitch() {
        while (!this.game.gameOver) {
            const currentMoves = this.game.getValidMoves(this.game.currentPlayer);
            const opponent = this.game.currentPlayer === BLACK ? WHITE : BLACK;
            const opponentMoves = this.game.getValidMoves(opponent);

            if (currentMoves.length === 0 && opponentMoves.length === 0) {
                // Game over
                this.game.gameOver = true;
                this.renderBoard();
                this.updateStatus();
                return;
            }

            if (currentMoves.length === 0) {
                // Current player must pass
                this.setStatus(`${this.game.currentPlayer === BLACK ? 'Du' : 'AI'} må passe - ingen gyldige træk`);
                await this.delay(1000);
                this.game.currentPlayer = opponent;
                continue;
            }

            if (this.game.currentPlayer === WHITE) {
                // AI's turn
                await this.aiTurn();
                this.game.currentPlayer = BLACK;
            } else {
                // Human's turn - wait for click
                this.renderBoard();
                this.updateStatus();
                return;
            }
        }
    }

    async aiTurn() {
        this.setStatus('AI tænker...', true);
        this.renderBoard();

        // Small delay to show thinking state
        await this.delay(500);

        const move = this.game.getBestMove(WHITE);
        if (move) {
            const [row, col] = move;
            const flipped = this.game.makeMove(row, col, WHITE);
            await this.animateMove(row, col, WHITE, flipped);
            this.updateScores();
        }
    }

    async animateMove(row, col, player, flipped) {
        this.renderBoard();

        // Animate flipping pieces
        await this.delay(100);

        for (const [r, c] of flipped) {
            const index = r * this.game.size + c;
            const cell = this.boardElement.children[index];
            const piece = cell.querySelector('.piece');
            if (piece) {
                piece.classList.add('flipping');
            }
        }

        await this.delay(400);
        this.renderBoard();
    }

    updateScores() {
        const pieces = this.game.countPieces();
        this.blackScoreElement.textContent = pieces.black;
        this.whiteScoreElement.textContent = pieces.white;
    }

    updateStatus() {
        if (this.game.gameOver) {
            const pieces = this.game.countPieces();
            let message;
            if (pieces.black > pieces.white) {
                message = `Du vandt! ${pieces.black} - ${pieces.white}`;
                HjernespilAPI.sessionEvent('win');
                HjernespilUI.showWinModal(3);
            } else if (pieces.white > pieces.black) {
                message = `AI vandt! ${pieces.white} - ${pieces.black}`;
            } else {
                message = `Uafgjort! ${pieces.black} - ${pieces.white}`;
            }
            this.statusElement.textContent = message;
            this.statusElement.classList.add('game-over');
            this.statusElement.classList.remove('thinking');
        } else {
            this.statusElement.classList.remove('game-over');
            if (this.game.currentPlayer === BLACK) {
                this.setStatus('Din tur');
            } else {
                this.setStatus('AI tænker...', true);
            }
        }
    }

    setStatus(message, thinking = false) {
        this.statusElement.textContent = message;
        this.statusElement.classList.toggle('thinking', thinking);
        this.statusElement.classList.remove('game-over');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GameUI();
});
