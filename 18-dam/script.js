class Checkers {
    constructor() {
        this.boardEl = document.getElementById('board');
        this.statusEl = document.getElementById('status');
        this.playerPiecesEl = document.getElementById('player-pieces');
        this.aiPiecesEl = document.getElementById('ai-pieces');
        this.difficultySelect = document.getElementById('difficulty');
        this.newGameBtn = document.getElementById('new-game');
        this.victoryOverlay = document.getElementById('victory');
        this.victoryTitle = document.getElementById('victory-title');
        this.victoryMessage = document.getElementById('victory-message');
        this.playAgainBtn = document.getElementById('play-again');

        // Player = 1 (dark, bottom), AI = 2 (light, top)
        // Kings = 3 (player king), 4 (AI king)
        this.EMPTY = 0;
        this.PLAYER = 1;
        this.AI = 2;
        this.PLAYER_KING = 3;
        this.AI_KING = 4;

        this.board = [];
        this.selectedPiece = null;
        this.validMoves = [];
        this.isPlayerTurn = true;
        this.mustCapture = [];
        this.multiJumpPiece = null;

        this.difficulties = {
            easy: 2,
            medium: 4,
            hard: 6
        };

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.playAgainBtn.addEventListener('click', () => {
            this.victoryOverlay.classList.remove('show');
            this.newGame();
        });
        this.difficultySelect.addEventListener('change', () => this.newGame());

        this.newGame();
    }

    newGame() {
        this.board = [];
        for (let row = 0; row < 8; row++) {
            this.board[row] = [];
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    if (row < 3) {
                        this.board[row][col] = this.AI;
                    } else if (row > 4) {
                        this.board[row][col] = this.PLAYER;
                    } else {
                        this.board[row][col] = this.EMPTY;
                    }
                } else {
                    this.board[row][col] = this.EMPTY;
                }
            }
        }

        this.selectedPiece = null;
        this.validMoves = [];
        this.isPlayerTurn = true;
        this.multiJumpPiece = null;
        this.updateMustCapture();
        this.updateStats();
        this.render();
        this.setStatus('Din tur');
        HjernespilAPI.trackStart('18');
    }

    isPlayerPiece(piece) {
        return piece === this.PLAYER || piece === this.PLAYER_KING;
    }

    isAIPiece(piece) {
        return piece === this.AI || piece === this.AI_KING;
    }

    isKing(piece) {
        return piece === this.PLAYER_KING || piece === this.AI_KING;
    }

    getValidMoves(row, col, boardState = this.board) {
        const piece = boardState[row][col];
        if (piece === this.EMPTY) return { moves: [], captures: [] };

        const isPlayer = this.isPlayerPiece(piece);
        const isKing = this.isKing(piece);
        const moves = [];
        const captures = [];

        const directions = [];
        if (isPlayer || isKing) {
            directions.push([-1, -1], [-1, 1]); // Up
        }
        if (!isPlayer || isKing) {
            directions.push([1, -1], [1, 1]); // Down
        }

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;

            if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = boardState[newRow][newCol];

                if (target === this.EMPTY) {
                    moves.push({ row: newRow, col: newCol });
                } else if ((isPlayer && this.isAIPiece(target)) || (!isPlayer && this.isPlayerPiece(target))) {
                    // Can capture
                    const jumpRow = newRow + dr;
                    const jumpCol = newCol + dc;

                    if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
                        if (boardState[jumpRow][jumpCol] === this.EMPTY) {
                            captures.push({
                                row: jumpRow,
                                col: jumpCol,
                                capturedRow: newRow,
                                capturedCol: newCol
                            });
                        }
                    }
                }
            }
        }

        return { moves, captures };
    }

    getAllCaptures(isPlayer, boardState = this.board) {
        const allCaptures = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row][col];
                if ((isPlayer && this.isPlayerPiece(piece)) || (!isPlayer && this.isAIPiece(piece))) {
                    const { captures } = this.getValidMoves(row, col, boardState);
                    if (captures.length > 0) {
                        allCaptures.push({ row, col, captures });
                    }
                }
            }
        }
        return allCaptures;
    }

    updateMustCapture() {
        this.mustCapture = [];
        if (!this.isPlayerTurn) return;

        const allCaptures = this.getAllCaptures(true);
        this.mustCapture = allCaptures.map(c => ({ row: c.row, col: c.col }));
    }

    updateStats() {
        let playerCount = 0;
        let aiCount = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isPlayerPiece(this.board[row][col])) playerCount++;
                if (this.isAIPiece(this.board[row][col])) aiCount++;
            }
        }

        this.playerPiecesEl.textContent = playerCount;
        this.aiPiecesEl.textContent = aiCount;
    }

    setStatus(text, className = '') {
        this.statusEl.textContent = text;
        this.statusEl.className = 'status';
        if (className) this.statusEl.classList.add(className);
    }

    handleClick(row, col) {
        if (!this.isPlayerTurn) return;

        const piece = this.board[row][col];

        // If we're in multi-jump, only allow continuing with same piece
        if (this.multiJumpPiece) {
            if (row === this.multiJumpPiece.row && col === this.multiJumpPiece.col) {
                // Reselect same piece
                return;
            }

            // Check if clicking valid capture destination
            const move = this.validMoves.find(m => m.row === row && m.col === col);
            if (move && move.capturedRow !== undefined) {
                this.executeMove(this.multiJumpPiece.row, this.multiJumpPiece.col, move);
                return;
            }
            return;
        }

        // If clicking on player's piece
        if (this.isPlayerPiece(piece)) {
            // If must capture, only allow selecting pieces that can capture
            if (this.mustCapture.length > 0) {
                const canCapture = this.mustCapture.some(c => c.row === row && c.col === col);
                if (!canCapture) {
                    return; // Can't select this piece
                }
            }

            this.selectedPiece = { row, col };
            const { moves, captures } = this.getValidMoves(row, col);

            // If forced capture, only show captures
            if (this.mustCapture.length > 0) {
                this.validMoves = captures;
            } else {
                this.validMoves = [...moves, ...captures];
            }
            this.render();
            return;
        }

        // If piece is selected and clicking on valid move
        if (this.selectedPiece) {
            const move = this.validMoves.find(m => m.row === row && m.col === col);
            if (move) {
                this.executeMove(this.selectedPiece.row, this.selectedPiece.col, move);
            }
        }
    }

    executeMove(fromRow, fromCol, move) {
        const piece = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = this.EMPTY;

        // Check for king promotion
        let newPiece = piece;
        if (piece === this.PLAYER && move.row === 0) {
            newPiece = this.PLAYER_KING;
        } else if (piece === this.AI && move.row === 7) {
            newPiece = this.AI_KING;
        }

        this.board[move.row][move.col] = newPiece;

        // Handle capture
        if (move.capturedRow !== undefined) {
            this.board[move.capturedRow][move.capturedCol] = this.EMPTY;
            this.updateStats();

            // Check for multi-jump
            const { captures } = this.getValidMoves(move.row, move.col);
            if (captures.length > 0 && newPiece === piece) { // No multi-jump after promotion
                this.multiJumpPiece = { row: move.row, col: move.col };
                this.selectedPiece = this.multiJumpPiece;
                this.validMoves = captures;
                this.render();
                return;
            }
        }

        this.selectedPiece = null;
        this.validMoves = [];
        this.multiJumpPiece = null;

        // Check for game over
        if (this.checkGameOver()) return;

        // Switch turn
        this.isPlayerTurn = !this.isPlayerTurn;

        if (!this.isPlayerTurn) {
            this.render();
            this.setStatus('AI tænker...', 'thinking');
            setTimeout(() => this.aiMove(), 500);
        } else {
            this.updateMustCapture();
            this.render();
            this.setStatus('Din tur');
        }
    }

    checkGameOver() {
        let playerPieces = 0;
        let aiPieces = 0;
        let playerCanMove = false;
        let aiCanMove = false;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (this.isPlayerPiece(piece)) {
                    playerPieces++;
                    const { moves, captures } = this.getValidMoves(row, col);
                    if (moves.length > 0 || captures.length > 0) playerCanMove = true;
                }
                if (this.isAIPiece(piece)) {
                    aiPieces++;
                    const { moves, captures } = this.getValidMoves(row, col);
                    if (moves.length > 0 || captures.length > 0) aiCanMove = true;
                }
            }
        }

        if (playerPieces === 0 || !playerCanMove) {
            this.showVictory(false);
            return true;
        }

        if (aiPieces === 0 || !aiCanMove) {
            this.showVictory(true);
            return true;
        }

        return false;
    }

    showVictory(playerWon) {
        if (playerWon) {
            this.victoryTitle.textContent = 'Tillykke!';
            this.victoryTitle.className = '';
            this.victoryMessage.textContent = 'Du vandt over computeren!';
            this.setStatus('Du vandt!', 'winner');
            HjernespilAPI.trackComplete('18');
            HjernespilUI.showWinModal();
        } else {
            this.victoryTitle.textContent = 'Spil slut';
            this.victoryTitle.className = 'loser';
            this.victoryMessage.textContent = 'Computeren vandt denne gang.';
            this.setStatus('Du tabte', 'loser');
        }

        setTimeout(() => {
            this.victoryOverlay.classList.add('show');
        }, 300);
    }

    aiMove() {
        const depth = this.difficulties[this.difficultySelect.value];
        const bestMove = this.minimax(this.board, depth, -Infinity, Infinity, false);

        if (bestMove.move) {
            this.executeAIMove(bestMove.move);
        } else {
            // AI has no moves
            this.showVictory(true);
        }
    }

    executeAIMove(move) {
        const piece = this.board[move.fromRow][move.fromCol];
        this.board[move.fromRow][move.fromCol] = this.EMPTY;

        let newPiece = piece;
        if (piece === this.AI && move.toRow === 7) {
            newPiece = this.AI_KING;
        }

        this.board[move.toRow][move.toCol] = newPiece;

        if (move.captures && move.captures.length > 0) {
            for (const cap of move.captures) {
                this.board[cap.row][cap.col] = this.EMPTY;
            }
            this.updateStats();
        }

        if (this.checkGameOver()) return;

        this.isPlayerTurn = true;
        this.updateMustCapture();
        this.render();
        this.setStatus('Din tur');
    }

    minimax(boardState, depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return { score: this.evaluateBoard(boardState), move: null };
        }

        const isAI = !isMaximizing;
        const allMoves = this.getAllMovesForSide(isAI, boardState);

        if (allMoves.length === 0) {
            // No moves available
            return { score: isAI ? -1000 : 1000, move: null };
        }

        let bestMove = null;

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const move of allMoves) {
                const newBoard = this.simulateMove(boardState, move);
                const result = this.minimax(newBoard, depth - 1, alpha, beta, false);
                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, result.score);
                if (beta <= alpha) break;
            }
            return { score: maxScore, move: bestMove };
        } else {
            let minScore = Infinity;
            for (const move of allMoves) {
                const newBoard = this.simulateMove(boardState, move);
                const result = this.minimax(newBoard, depth - 1, alpha, beta, true);
                if (result.score < minScore) {
                    minScore = result.score;
                    bestMove = move;
                }
                beta = Math.min(beta, result.score);
                if (beta <= alpha) break;
            }
            return { score: minScore, move: bestMove };
        }
    }

    getAllMovesForSide(isAI, boardState) {
        const moves = [];
        const captures = this.getAllCaptures(!isAI, boardState);

        // If captures available, must capture
        if (captures.length > 0) {
            for (const piece of captures) {
                for (const cap of piece.captures) {
                    // Check for multi-jumps
                    const multiJumps = this.getMultiJumps(piece.row, piece.col, cap, boardState, isAI);
                    moves.push(...multiJumps);
                }
            }
            return moves;
        }

        // No captures, get regular moves
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row][col];
                if ((isAI && this.isAIPiece(piece)) || (!isAI && this.isPlayerPiece(piece))) {
                    const { moves: pieceMoves } = this.getValidMoves(row, col, boardState);
                    for (const m of pieceMoves) {
                        moves.push({
                            fromRow: row,
                            fromCol: col,
                            toRow: m.row,
                            toCol: m.col,
                            captures: []
                        });
                    }
                }
            }
        }

        return moves;
    }

    getMultiJumps(fromRow, fromCol, firstCapture, boardState, isAI) {
        const results = [];
        const piece = boardState[fromRow][fromCol];

        const explore = (row, col, captures, currentBoard) => {
            const newBoard = this.cloneBoard(currentBoard);
            const lastCap = captures[captures.length - 1];

            newBoard[row][col] = this.EMPTY;
            newBoard[lastCap.row][lastCap.col] = this.EMPTY;
            newBoard[lastCap.toRow][lastCap.toCol] = piece;

            // Check for more captures from new position
            const { captures: moreCaps } = this.getValidMoves(lastCap.toRow, lastCap.toCol, newBoard);

            if (moreCaps.length === 0) {
                results.push({
                    fromRow,
                    fromCol,
                    toRow: lastCap.toRow,
                    toCol: lastCap.toCol,
                    captures: captures.map(c => ({ row: c.row, col: c.col }))
                });
            } else {
                for (const cap of moreCaps) {
                    explore(lastCap.toRow, lastCap.toCol, [...captures, {
                        row: cap.capturedRow,
                        col: cap.capturedCol,
                        toRow: cap.row,
                        toCol: cap.col
                    }], newBoard);
                }
            }
        };

        explore(fromRow, fromCol, [{
            row: firstCapture.capturedRow,
            col: firstCapture.capturedCol,
            toRow: firstCapture.row,
            toCol: firstCapture.col
        }], boardState);

        return results;
    }

    simulateMove(boardState, move) {
        const newBoard = this.cloneBoard(boardState);
        const piece = newBoard[move.fromRow][move.fromCol];

        newBoard[move.fromRow][move.fromCol] = this.EMPTY;

        let newPiece = piece;
        if (piece === this.PLAYER && move.toRow === 0) {
            newPiece = this.PLAYER_KING;
        } else if (piece === this.AI && move.toRow === 7) {
            newPiece = this.AI_KING;
        }

        newBoard[move.toRow][move.toCol] = newPiece;

        if (move.captures) {
            for (const cap of move.captures) {
                newBoard[cap.row][cap.col] = this.EMPTY;
            }
        }

        return newBoard;
    }

    cloneBoard(boardState) {
        return boardState.map(row => [...row]);
    }

    evaluateBoard(boardState) {
        let score = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = boardState[row][col];
                if (piece === this.PLAYER) {
                    score -= 10 + (7 - row); // Bonus for advancement
                } else if (piece === this.PLAYER_KING) {
                    score -= 25;
                } else if (piece === this.AI) {
                    score += 10 + row; // Bonus for advancement
                } else if (piece === this.AI_KING) {
                    score += 25;
                }
            }
        }

        return score;
    }

    render() {
        this.boardEl.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');

                // Check if this cell is a valid move
                const isValidMove = this.validMoves.some(m => m.row === row && m.col === col);
                const isCapture = this.validMoves.some(m => m.row === row && m.col === col && m.capturedRow !== undefined);

                if (isCapture) {
                    cell.classList.add('valid-capture');
                } else if (isValidMove) {
                    cell.classList.add('valid-move');
                }

                // Check if this piece must capture
                if (this.mustCapture.some(c => c.row === row && c.col === col)) {
                    cell.classList.add('must-capture');
                }

                const piece = this.board[row][col];
                if (piece !== this.EMPTY) {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = 'piece';

                    if (this.isPlayerPiece(piece)) {
                        pieceEl.classList.add('dark-piece');
                    } else {
                        pieceEl.classList.add('light-piece');
                    }

                    if (this.isKing(piece)) {
                        pieceEl.classList.add('king');
                    }

                    if (this.selectedPiece && this.selectedPiece.row === row && this.selectedPiece.col === col) {
                        pieceEl.classList.add('selected');
                    }

                    cell.appendChild(pieceEl);
                }

                cell.addEventListener('click', () => this.handleClick(row, col));
                this.boardEl.appendChild(cell);
            }
        }
    }
}

new Checkers();
