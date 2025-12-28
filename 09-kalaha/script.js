// Check if should show rotate notice
function checkRotateNotice() {
    const rotateNotice = document.getElementById('rotate-notice');
    const dismissBtn = document.getElementById('dismiss-rotate');

    // Only show on mobile devices in portrait mode
    const isMobile = window.innerWidth <= 768 && 'ontouchstart' in window;
    const isPortrait = window.innerHeight > window.innerWidth;
    const dismissed = sessionStorage.getItem('kalaha-rotate-dismissed');

    if (isMobile && isPortrait && !dismissed) {
        rotateNotice.classList.add('show');
    } else {
        rotateNotice.classList.remove('show');
    }

    dismissBtn.addEventListener('click', () => {
        rotateNotice.classList.remove('show');
        sessionStorage.setItem('kalaha-rotate-dismissed', 'true');
    });

    // Auto-hide when rotated to landscape
    window.addEventListener('resize', () => {
        if (window.innerWidth > window.innerHeight) {
            rotateNotice.classList.remove('show');
            sessionStorage.setItem('kalaha-rotate-dismissed', 'true');
        }
    });
}

checkRotateNotice();

class Kalaha {
    constructor() {
        // Board layout:
        // Pits 0-5: Player's pits (left to right)
        // Pit 6: Player's store
        // Pits 7-12: AI's pits (right to left from AI's view)
        // Pit 13: AI's store
        this.pits = [];
        this.isPlayerTurn = true;
        this.gameOver = false;

        this.statusEl = document.getElementById('status');
        this.playerStoreEl = document.getElementById('store-player').querySelector('.store-count');
        this.aiStoreEl = document.getElementById('store-ai').querySelector('.store-count');
        this.playerPitsEl = document.getElementById('player-pits');
        this.aiPitsEl = document.getElementById('ai-pits');
        this.newGameBtn = document.getElementById('new-game');
        this.gameOverOverlay = document.getElementById('game-over');
        this.playAgainBtn = document.getElementById('play-again');
        this.resultTitle = document.getElementById('result-title');
        this.resultText = document.getElementById('result-text');

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.playAgainBtn.addEventListener('click', () => {
            this.gameOverOverlay.classList.remove('show');
            this.newGame();
        });

        this.playerPitsEl.querySelectorAll('.pit').forEach(pit => {
            pit.addEventListener('click', () => {
                if (this.gameOver || !this.isPlayerTurn) return;
                const pitIndex = parseInt(pit.dataset.pit);
                if (this.pits[pitIndex] > 0) {
                    this.makeMove(pitIndex);
                }
            });
        });

        this.newGame();
    }

    newGame() {
        // Initialize: 4 stones in each pit, 0 in stores
        this.pits = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
        this.isPlayerTurn = true;
        this.gameOver = false;
        this.updateStatus('Din tur');
        this.render();
        HjernespilAPI.trackStart('09');
    }

    makeMove(pitIndex) {
        const isPlayer = pitIndex < 6;
        let stones = this.pits[pitIndex];
        this.pits[pitIndex] = 0;

        let currentPit = pitIndex;

        // Relay sowing: continue until landing in empty pit or store
        while (true) {
            // Distribute current stones
            while (stones > 0) {
                currentPit = (currentPit + 1) % 14;

                // Skip opponent's store
                if (isPlayer && currentPit === 13) continue;
                if (!isPlayer && currentPit === 6) continue;

                this.pits[currentPit]++;
                stones--;
            }

            // Check if we landed in a store (ends this sowing round)
            if (currentPit === 6 || currentPit === 13) {
                break;
            }

            // Check if we landed in an empty pit (turn ends)
            if (this.pits[currentPit] === 1) {
                // We just added one stone, so it was empty before
                break;
            }

            // Landed in non-empty pit: pick up stones and continue
            stones = this.pits[currentPit];
            this.pits[currentPit] = 0;
        }

        // Check for capture (only if landed in own empty pit, not store)
        if (isPlayer && currentPit >= 0 && currentPit < 6 && this.pits[currentPit] === 1) {
            const oppositePit = 12 - currentPit;
            if (this.pits[oppositePit] > 0) {
                this.pits[6] += this.pits[currentPit] + this.pits[oppositePit];
                this.pits[currentPit] = 0;
                this.pits[oppositePit] = 0;
            }
        } else if (!isPlayer && currentPit >= 7 && currentPit < 13 && this.pits[currentPit] === 1) {
            const oppositePit = 12 - currentPit;
            if (this.pits[oppositePit] > 0) {
                this.pits[13] += this.pits[currentPit] + this.pits[oppositePit];
                this.pits[currentPit] = 0;
                this.pits[oppositePit] = 0;
            }
        }

        this.render();
        this.highlightPit(currentPit);

        // Check if game is over
        if (this.checkGameOver()) {
            this.endGame();
            return;
        }

        // Check for extra turn (landing in own store)
        const landedInOwnStore = (isPlayer && currentPit === 6) || (!isPlayer && currentPit === 13);

        if (!landedInOwnStore) {
            this.isPlayerTurn = !this.isPlayerTurn;
        }

        if (this.isPlayerTurn) {
            this.updateStatus('Din tur');
            // Check if player has valid moves
            if (!this.hasValidMoves(true)) {
                this.isPlayerTurn = false;
                this.updateStatus('AI tænker...', true);
                setTimeout(() => this.aiMove(), 800);
            }
        } else {
            this.updateStatus('AI tænker...', true);
            setTimeout(() => this.aiMove(), 800);
        }
    }

    aiMove() {
        if (this.gameOver) return;

        // Check if AI has valid moves
        if (!this.hasValidMoves(false)) {
            this.isPlayerTurn = true;
            this.updateStatus('Din tur');
            return;
        }

        // Simple AI: prioritize moves that end in store, then captures, then most stones
        let bestMove = -1;
        let bestScore = -1;

        for (let i = 7; i < 13; i++) {
            if (this.pits[i] === 0) continue;

            const score = this.evaluateMove(i);
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }

        if (bestMove !== -1) {
            this.makeMove(bestMove);
        }
    }

    evaluateMove(pitIndex) {
        // Simulate the move with relay sowing
        let tempPits = [...this.pits];
        let stones = tempPits[pitIndex];
        tempPits[pitIndex] = 0;
        let current = pitIndex;
        let stonesCollected = 0;

        // Relay sowing simulation
        while (true) {
            while (stones > 0) {
                current = (current + 1) % 14;
                if (current === 6) continue; // Skip player's store
                tempPits[current]++;
                stones--;
            }

            // Landed in store
            if (current === 13) {
                stonesCollected++;
                break;
            }

            // Landed in empty pit
            if (tempPits[current] === 1) {
                break;
            }

            // Continue relay
            stones = tempPits[current];
            tempPits[current] = 0;
        }

        let score = 0;

        // Bonus for landing in own store (extra turn)
        if (current === 13) {
            score += 100;
        }

        // Calculate stones gained in store
        score += (tempPits[13] - this.pits[13]) * 15;

        // Bonus for capture
        if (current >= 7 && current < 13 && tempPits[current] === 1) {
            const opposite = 12 - current;
            if (tempPits[opposite] > 0) {
                score += tempPits[opposite] * 10;
            }
        }

        return score;
    }

    hasValidMoves(isPlayer) {
        if (isPlayer) {
            for (let i = 0; i < 6; i++) {
                if (this.pits[i] > 0) return true;
            }
        } else {
            for (let i = 7; i < 13; i++) {
                if (this.pits[i] > 0) return true;
            }
        }
        return false;
    }

    checkGameOver() {
        const playerEmpty = this.pits.slice(0, 6).every(p => p === 0);
        const aiEmpty = this.pits.slice(7, 13).every(p => p === 0);
        return playerEmpty || aiEmpty;
    }

    endGame() {
        this.gameOver = true;

        // Collect remaining stones
        for (let i = 0; i < 6; i++) {
            this.pits[6] += this.pits[i];
            this.pits[i] = 0;
        }
        for (let i = 7; i < 13; i++) {
            this.pits[13] += this.pits[i];
            this.pits[i] = 0;
        }

        this.render();

        const playerScore = this.pits[6];
        const aiScore = this.pits[13];

        if (playerScore > aiScore) {
            this.resultTitle.textContent = 'Du vandt! 🎉';
            this.resultTitle.className = 'win';
            HjernespilAPI.trackComplete('09');
        } else if (aiScore > playerScore) {
            this.resultTitle.textContent = 'AI vandt!';
            this.resultTitle.className = 'lose';
        } else {
            this.resultTitle.textContent = 'Uafgjort!';
            this.resultTitle.className = 'draw';
        }

        this.resultText.textContent = `Du: ${playerScore} - AI: ${aiScore}`;
        this.updateStatus('Spil slut');

        setTimeout(() => {
            this.gameOverOverlay.classList.add('show');
        }, 500);
    }

    updateStatus(text, thinking = false) {
        this.statusEl.textContent = text;
        this.statusEl.classList.toggle('thinking', thinking);
    }

    highlightPit(pitIndex) {
        const allPits = document.querySelectorAll('.pit');
        allPits.forEach(p => p.classList.remove('last-drop'));

        if (pitIndex === 6 || pitIndex === 13) return;

        let pitEl;
        if (pitIndex < 6) {
            pitEl = this.playerPitsEl.querySelector(`[data-pit="${pitIndex}"]`);
        } else {
            pitEl = this.aiPitsEl.querySelector(`[data-pit="${pitIndex}"]`);
        }
        if (pitEl) {
            pitEl.classList.add('last-drop');
        }
    }

    render() {
        // Update stores
        this.playerStoreEl.textContent = this.pits[6];
        this.aiStoreEl.textContent = this.pits[13];

        // Update player pits
        this.playerPitsEl.querySelectorAll('.pit').forEach(pit => {
            const index = parseInt(pit.dataset.pit);
            const stones = this.pits[index];
            pit.textContent = stones;
            pit.classList.toggle('empty', stones === 0);
            pit.classList.toggle('disabled', !this.isPlayerTurn || this.gameOver);
        });

        // Update AI pits
        this.aiPitsEl.querySelectorAll('.pit').forEach(pit => {
            const index = parseInt(pit.dataset.pit);
            const stones = this.pits[index];
            pit.textContent = stones;
            pit.classList.toggle('empty', stones === 0);
        });
    }
}

new Kalaha();
