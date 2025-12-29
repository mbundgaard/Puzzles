class NineMensMorris {
    constructor() {
        this.boardEl = document.getElementById('board');
        this.pointsEl = document.getElementById('points');
        this.statusEl = document.getElementById('status');
        this.phaseEl = document.getElementById('phase');
        this.playerPiecesEl = document.getElementById('player-pieces');
        this.aiPiecesEl = document.getElementById('ai-pieces');
        this.playerHandEl = document.getElementById('player-hand');
        this.aiHandEl = document.getElementById('ai-hand');
        this.difficultySelect = document.getElementById('difficulty');
        this.newGameBtn = document.getElementById('new-game');
        this.victoryOverlay = document.getElementById('victory');
        this.victoryTitle = document.getElementById('victory-title');
        this.victoryMessage = document.getElementById('victory-message');
        this.playAgainBtn = document.getElementById('play-again');

        this.PLAYER = 1;
        this.AI = 2;
        this.EMPTY = 0;

        // Board positions (24 points)
        // Outer square: 0-7, Middle square: 8-15, Inner square: 16-23
        this.positions = [
            { x: 10, y: 10 },   // 0: top-left outer
            { x: 150, y: 10 },  // 1: top-center outer
            { x: 290, y: 10 },  // 2: top-right outer
            { x: 57, y: 57 },   // 3: top-left middle
            { x: 150, y: 57 },  // 4: top-center middle
            { x: 243, y: 57 },  // 5: top-right middle
            { x: 104, y: 104 }, // 6: top-left inner
            { x: 150, y: 104 }, // 7: top-center inner
            { x: 196, y: 104 }, // 8: top-right inner
            { x: 10, y: 150 },  // 9: middle-left outer
            { x: 57, y: 150 },  // 10: middle-left middle
            { x: 104, y: 150 }, // 11: middle-left inner
            { x: 196, y: 150 }, // 12: middle-right inner
            { x: 243, y: 150 }, // 13: middle-right middle
            { x: 290, y: 150 }, // 14: middle-right outer
            { x: 104, y: 196 }, // 15: bottom-left inner
            { x: 150, y: 196 }, // 16: bottom-center inner
            { x: 196, y: 196 }, // 17: bottom-right inner
            { x: 57, y: 243 },  // 18: bottom-left middle
            { x: 150, y: 243 }, // 19: bottom-center middle
            { x: 243, y: 243 }, // 20: bottom-right middle
            { x: 10, y: 290 },  // 21: bottom-left outer
            { x: 150, y: 290 }, // 22: bottom-center outer
            { x: 290, y: 290 }  // 23: bottom-right outer
        ];

        // Adjacent connections
        this.adjacency = {
            0: [1, 9],
            1: [0, 2, 4],
            2: [1, 14],
            3: [4, 10],
            4: [1, 3, 5, 7],
            5: [4, 13],
            6: [7, 11],
            7: [4, 6, 8],
            8: [7, 12],
            9: [0, 10, 21],
            10: [3, 9, 11, 18],
            11: [6, 10, 15],
            12: [8, 13, 17],
            13: [5, 12, 14, 20],
            14: [2, 13, 23],
            15: [11, 16],
            16: [15, 17, 19],
            17: [12, 16],
            18: [10, 19],
            19: [16, 18, 20, 22],
            20: [13, 19],
            21: [9, 22],
            22: [19, 21, 23],
            23: [14, 22]
        };

        // Mills (all possible three-in-a-row combinations)
        this.mills = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [15, 16, 17], [18, 19, 20], [21, 22, 23],
            [0, 9, 21], [3, 10, 18], [6, 11, 15],
            [8, 12, 17], [5, 13, 20], [2, 14, 23],
            [1, 4, 7], [16, 19, 22],
            [9, 10, 11], [12, 13, 14]
        ];

        this.difficulties = {
            easy: 2,
            medium: 3,
            hard: 4
        };

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.playAgainBtn.addEventListener('click', () => {
            this.victoryOverlay.classList.remove('show');
            this.newGame();
        });

        this.newGame();
    }

    newGame() {
        this.board = new Array(24).fill(this.EMPTY);
        this.playerHand = 9;
        this.aiHand = 9;
        this.selectedPiece = null;
        this.validMoves = [];
        this.isPlayerTurn = true;
        this.phase = 1; // 1: placing, 2: moving
        this.removeMode = false;
        this.removablePieces = [];

        this.updateStats();
        this.render();
        this.setStatus('Din tur - placer en brik');
        this.updatePhase();
        HjernespilAPI.trackStart('19');
    }

    updateStats() {
        const playerOnBoard = this.board.filter(p => p === this.PLAYER).length;
        const aiOnBoard = this.board.filter(p => p === this.AI).length;

        this.playerPiecesEl.textContent = playerOnBoard;
        this.aiPiecesEl.textContent = aiOnBoard;
        this.playerHandEl.textContent = this.playerHand;
        this.aiHandEl.textContent = this.aiHand;
    }

    updatePhase() {
        if (this.playerHand === 0 && this.aiHand === 0) {
            this.phase = 2;
            this.phaseEl.textContent = 'Fase 2: Flytning';
        } else {
            this.phase = 1;
            this.phaseEl.textContent = 'Fase 1: Placering';
        }
    }

    setStatus(text, className = '') {
        this.statusEl.textContent = text;
        this.statusEl.className = 'status';
        if (className) this.statusEl.classList.add(className);
    }

    getPlayerPieceCount(player, boardState = this.board) {
        return boardState.filter(p => p === player).length;
    }

    canFly(player, boardState = this.board) {
        return this.getPlayerPieceCount(player, boardState) === 3 &&
               (player === this.PLAYER ? this.playerHand === 0 : this.aiHand === 0);
    }

    getAdjacentMoves(pos, boardState = this.board) {
        return this.adjacency[pos].filter(adj => boardState[adj] === this.EMPTY);
    }

    getAllMoves(player, boardState = this.board, hand = null) {
        const moves = [];
        const playerHand = hand !== null ? hand : (player === this.PLAYER ? this.playerHand : this.aiHand);

        if (playerHand > 0) {
            // Phase 1: Can place on any empty spot
            for (let i = 0; i < 24; i++) {
                if (boardState[i] === this.EMPTY) {
                    moves.push({ type: 'place', to: i });
                }
            }
        } else {
            // Phase 2: Move pieces
            const canFlyNow = this.canFly(player, boardState);

            for (let i = 0; i < 24; i++) {
                if (boardState[i] === player) {
                    if (canFlyNow) {
                        // Can move to any empty spot
                        for (let j = 0; j < 24; j++) {
                            if (boardState[j] === this.EMPTY) {
                                moves.push({ type: 'move', from: i, to: j });
                            }
                        }
                    } else {
                        // Can only move to adjacent empty spots
                        const adjacent = this.getAdjacentMoves(i, boardState);
                        for (const adj of adjacent) {
                            moves.push({ type: 'move', from: i, to: adj });
                        }
                    }
                }
            }
        }

        return moves;
    }

    checkMill(pos, player, boardState = this.board) {
        for (const mill of this.mills) {
            if (mill.includes(pos)) {
                if (mill.every(p => boardState[p] === player)) {
                    return mill;
                }
            }
        }
        return null;
    }

    isInMill(pos, boardState = this.board) {
        const player = boardState[pos];
        if (player === this.EMPTY) return false;

        for (const mill of this.mills) {
            if (mill.includes(pos) && mill.every(p => boardState[p] === player)) {
                return true;
            }
        }
        return false;
    }

    getRemovablePieces(opponent, boardState = this.board) {
        const removable = [];
        const nonMillPieces = [];

        for (let i = 0; i < 24; i++) {
            if (boardState[i] === opponent) {
                if (!this.isInMill(i, boardState)) {
                    nonMillPieces.push(i);
                }
                removable.push(i);
            }
        }

        // If there are pieces not in mills, can only remove those
        return nonMillPieces.length > 0 ? nonMillPieces : removable;
    }

    handleClick(pos) {
        if (!this.isPlayerTurn) return;

        if (this.removeMode) {
            // Remove opponent's piece
            if (this.removablePieces.includes(pos)) {
                this.board[pos] = this.EMPTY;
                this.removeMode = false;
                this.removablePieces = [];
                this.updateStats();

                if (this.checkGameOver()) return;

                this.isPlayerTurn = false;
                this.updatePhase();
                this.render();
                this.setStatus('AI tænker...', 'thinking');
                setTimeout(() => this.aiMove(), 500);
            }
            return;
        }

        if (this.phase === 1) {
            // Placing phase
            if (this.playerHand > 0 && this.board[pos] === this.EMPTY) {
                this.board[pos] = this.PLAYER;
                this.playerHand--;
                this.updateStats();

                const mill = this.checkMill(pos, this.PLAYER);
                if (mill) {
                    this.highlightMill(mill);
                    this.enterRemoveMode();
                    return;
                }

                if (this.checkGameOver()) return;

                this.isPlayerTurn = false;
                this.updatePhase();
                this.render();
                this.setStatus('AI tænker...', 'thinking');
                setTimeout(() => this.aiMove(), 500);
            }
        } else {
            // Moving phase
            if (this.selectedPiece === null) {
                // Select a piece
                if (this.board[pos] === this.PLAYER) {
                    const moves = this.canFly(this.PLAYER)
                        ? [...Array(24).keys()].filter(i => this.board[i] === this.EMPTY)
                        : this.getAdjacentMoves(pos);

                    if (moves.length > 0) {
                        this.selectedPiece = pos;
                        this.validMoves = moves;
                        this.render();
                    }
                }
            } else {
                // Move the piece
                if (this.validMoves.includes(pos)) {
                    this.board[pos] = this.PLAYER;
                    this.board[this.selectedPiece] = this.EMPTY;
                    this.selectedPiece = null;
                    this.validMoves = [];

                    const mill = this.checkMill(pos, this.PLAYER);
                    if (mill) {
                        this.highlightMill(mill);
                        this.enterRemoveMode();
                        return;
                    }

                    if (this.checkGameOver()) return;

                    this.isPlayerTurn = false;
                    this.render();
                    this.setStatus('AI tænker...', 'thinking');
                    setTimeout(() => this.aiMove(), 500);
                } else if (this.board[pos] === this.PLAYER) {
                    // Select different piece
                    const moves = this.canFly(this.PLAYER)
                        ? [...Array(24).keys()].filter(i => this.board[i] === this.EMPTY)
                        : this.getAdjacentMoves(pos);

                    if (moves.length > 0) {
                        this.selectedPiece = pos;
                        this.validMoves = moves;
                    } else {
                        this.selectedPiece = null;
                        this.validMoves = [];
                    }
                    this.render();
                } else {
                    // Deselect
                    this.selectedPiece = null;
                    this.validMoves = [];
                    this.render();
                }
            }
        }
    }

    enterRemoveMode() {
        this.removablePieces = this.getRemovablePieces(this.AI);
        if (this.removablePieces.length === 0) {
            // No pieces to remove, continue
            this.isPlayerTurn = false;
            this.updatePhase();
            this.render();
            this.setStatus('AI tænker...', 'thinking');
            setTimeout(() => this.aiMove(), 500);
            return;
        }

        this.removeMode = true;
        this.render();
        this.setStatus('Fjern en modstanderbrik!', 'remove-mode');
    }

    highlightMill(mill) {
        // Visual feedback for mill
        setTimeout(() => {
            mill.forEach(pos => {
                const point = this.pointsEl.children[pos];
                if (point) point.classList.add('mill-highlight');
            });
        }, 100);
    }

    checkGameOver() {
        const playerPieces = this.getPlayerPieceCount(this.PLAYER);
        const aiPieces = this.getPlayerPieceCount(this.AI);

        // Check piece count (only after placing phase)
        if (this.playerHand === 0 && this.aiHand === 0) {
            if (playerPieces < 3) {
                this.showVictory(false);
                return true;
            }
            if (aiPieces < 3) {
                this.showVictory(true);
                return true;
            }

            // Check if current player can move
            const currentPlayer = this.isPlayerTurn ? this.PLAYER : this.AI;
            const moves = this.getAllMoves(currentPlayer);
            if (moves.length === 0) {
                this.showVictory(!this.isPlayerTurn);
                return true;
            }
        }

        return false;
    }

    showVictory(playerWon) {
        if (playerWon) {
            this.victoryTitle.textContent = 'Tillykke!';
            this.victoryTitle.className = '';
            this.victoryMessage.textContent = 'Du vandt over computeren!';
            this.setStatus('Du vandt!', 'winner');
            HjernespilAPI.trackComplete('19');
            HjernespilUI.showWinModal(3);
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
        const result = this.minimax(
            [...this.board],
            this.aiHand,
            this.playerHand,
            depth,
            -Infinity,
            Infinity,
            true
        );

        if (result.move) {
            this.executeAIMove(result.move);
        } else {
            // AI has no moves
            this.showVictory(true);
        }
    }

    executeAIMove(move) {
        if (move.type === 'place') {
            this.board[move.to] = this.AI;
            this.aiHand--;
        } else {
            this.board[move.to] = this.AI;
            this.board[move.from] = this.EMPTY;
        }

        this.updateStats();

        const mill = this.checkMill(move.to, this.AI);
        if (mill) {
            this.highlightMill(mill);

            // AI removes a piece
            const removable = this.getRemovablePieces(this.PLAYER);
            if (removable.length > 0) {
                // Choose best piece to remove
                const toRemove = this.choosePieceToRemove(removable);
                setTimeout(() => {
                    this.board[toRemove] = this.EMPTY;
                    this.updateStats();

                    if (this.checkGameOver()) return;

                    this.isPlayerTurn = true;
                    this.updatePhase();
                    this.render();
                    this.setStatus(this.phase === 1 ? 'Din tur - placer en brik' : 'Din tur - flyt en brik');
                }, 400);
                return;
            }
        }

        if (this.checkGameOver()) return;

        this.isPlayerTurn = true;
        this.updatePhase();
        this.render();
        this.setStatus(this.phase === 1 ? 'Din tur - placer en brik' : 'Din tur - flyt en brik');
    }

    choosePieceToRemove(removable) {
        // Prefer pieces that would form mills
        let bestPiece = removable[0];
        let bestScore = -Infinity;

        for (const pos of removable) {
            let score = 0;

            // Check if this piece is part of a potential mill
            for (const mill of this.mills) {
                if (mill.includes(pos)) {
                    const playerCount = mill.filter(p => this.board[p] === this.PLAYER).length;
                    if (playerCount === 2) score += 10; // Block potential mill
                    if (playerCount === 1) score += 3;
                }
            }

            // Prefer pieces with fewer adjacent empty spaces (harder to reconnect)
            const adjEmpty = this.adjacency[pos].filter(a => this.board[a] === this.EMPTY).length;
            score += (4 - adjEmpty);

            if (score > bestScore) {
                bestScore = score;
                bestPiece = pos;
            }
        }

        return bestPiece;
    }

    minimax(boardState, aiHand, playerHand, depth, alpha, beta, isMaximizing) {
        const aiPieces = boardState.filter(p => p === this.AI).length;
        const playerPieces = boardState.filter(p => p === this.PLAYER).length;

        // Terminal conditions
        if (depth === 0) {
            return { score: this.evaluateBoard(boardState, aiHand, playerHand), move: null };
        }

        if (aiHand === 0 && playerHand === 0) {
            if (aiPieces < 3) return { score: -1000, move: null };
            if (playerPieces < 3) return { score: 1000, move: null };
        }

        const currentPlayer = isMaximizing ? this.AI : this.PLAYER;
        const currentHand = isMaximizing ? aiHand : playerHand;
        const moves = this.getAllMovesForBoard(currentPlayer, boardState, currentHand);

        if (moves.length === 0) {
            return { score: isMaximizing ? -1000 : 1000, move: null };
        }

        let bestMove = moves[0];

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const move of moves) {
                const { newBoard, newAiHand, newPlayerHand } = this.simulateMove(
                    boardState, move, aiHand, playerHand, this.AI
                );
                const result = this.minimax(newBoard, newAiHand, newPlayerHand, depth - 1, alpha, beta, false);
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
            for (const move of moves) {
                const { newBoard, newAiHand, newPlayerHand } = this.simulateMove(
                    boardState, move, aiHand, playerHand, this.PLAYER
                );
                const result = this.minimax(newBoard, newAiHand, newPlayerHand, depth - 1, alpha, beta, true);
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

    getAllMovesForBoard(player, boardState, hand) {
        const moves = [];

        if (hand > 0) {
            for (let i = 0; i < 24; i++) {
                if (boardState[i] === this.EMPTY) {
                    moves.push({ type: 'place', to: i });
                }
            }
        } else {
            const pieceCount = boardState.filter(p => p === player).length;
            const canFlyNow = pieceCount === 3;

            for (let i = 0; i < 24; i++) {
                if (boardState[i] === player) {
                    if (canFlyNow) {
                        for (let j = 0; j < 24; j++) {
                            if (boardState[j] === this.EMPTY) {
                                moves.push({ type: 'move', from: i, to: j });
                            }
                        }
                    } else {
                        const adjacent = this.adjacency[i].filter(adj => boardState[adj] === this.EMPTY);
                        for (const adj of adjacent) {
                            moves.push({ type: 'move', from: i, to: adj });
                        }
                    }
                }
            }
        }

        return moves;
    }

    simulateMove(boardState, move, aiHand, playerHand, player) {
        const newBoard = [...boardState];
        let newAiHand = aiHand;
        let newPlayerHand = playerHand;

        if (move.type === 'place') {
            newBoard[move.to] = player;
            if (player === this.AI) newAiHand--;
            else newPlayerHand--;
        } else {
            newBoard[move.to] = player;
            newBoard[move.from] = this.EMPTY;
        }

        // Check for mill and simulate removal
        const mill = this.checkMill(move.to, player, newBoard);
        if (mill) {
            const opponent = player === this.AI ? this.PLAYER : this.AI;
            const removable = this.getRemovablePieces(opponent, newBoard);
            if (removable.length > 0) {
                // Remove a random piece for simulation
                newBoard[removable[0]] = this.EMPTY;
            }
        }

        return { newBoard, newAiHand, newPlayerHand };
    }

    evaluateBoard(boardState, aiHand, playerHand) {
        let score = 0;

        const aiPieces = boardState.filter(p => p === this.AI).length + aiHand;
        const playerPieces = boardState.filter(p => p === this.PLAYER).length + playerHand;

        score += (aiPieces - playerPieces) * 10;

        // Count potential mills
        for (const mill of this.mills) {
            const aiCount = mill.filter(p => boardState[p] === this.AI).length;
            const playerCount = mill.filter(p => boardState[p] === this.PLAYER).length;
            const emptyCount = mill.filter(p => boardState[p] === this.EMPTY).length;

            if (aiCount === 3) score += 50;
            else if (aiCount === 2 && emptyCount === 1) score += 10;
            else if (aiCount === 1 && emptyCount === 2) score += 2;

            if (playerCount === 3) score -= 50;
            else if (playerCount === 2 && emptyCount === 1) score -= 10;
            else if (playerCount === 1 && emptyCount === 2) score -= 2;
        }

        // Mobility
        const aiMoves = this.getAllMovesForBoard(this.AI, boardState, aiHand).length;
        const playerMoves = this.getAllMovesForBoard(this.PLAYER, boardState, playerHand).length;
        score += (aiMoves - playerMoves);

        return score;
    }

    render() {
        this.pointsEl.innerHTML = '';

        for (let i = 0; i < 24; i++) {
            const pos = this.positions[i];
            const point = document.createElement('div');
            point.className = 'point';
            point.style.left = pos.x + 'px';
            point.style.top = pos.y + 'px';

            if (this.validMoves.includes(i)) {
                point.classList.add('valid-move');
            }

            if (this.removablePieces.includes(i)) {
                point.classList.add('can-remove');
            }

            if (this.board[i] !== this.EMPTY) {
                const piece = document.createElement('div');
                piece.className = 'piece';
                piece.classList.add(this.board[i] === this.PLAYER ? 'player' : 'ai');

                if (this.selectedPiece === i) {
                    piece.classList.add('selected');
                }

                if (this.removeMode && this.removablePieces.includes(i)) {
                    piece.classList.add('can-remove');
                }

                if (this.isInMill(i)) {
                    piece.classList.add('in-mill');
                }

                point.appendChild(piece);
            }

            point.addEventListener('click', () => this.handleClick(i));
            this.pointsEl.appendChild(point);
        }
    }
}

new NineMensMorris();
