class Mastermind {
    constructor() {
        this.colors = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];
        this.codeLength = 4;
        this.maxGuesses = 10;
        this.secretCode = [];
        this.currentGuess = [];
        this.currentRow = 0;
        this.selectedColor = null;
        this.gameOver = false;

        this.colorPicker = document.getElementById('color-picker');
        this.boardEl = document.getElementById('board');
        this.status = document.getElementById('status');
        this.guessBtn = document.getElementById('guess-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.newGameBtn = document.getElementById('new-game');

        this.guessBtn.addEventListener('click', () => this.submitGuess());
        this.clearBtn.addEventListener('click', () => this.clearCurrentRow());
        this.newGameBtn.addEventListener('click', () => this.newGame());

        this.createColorPicker();
        this.newGame();
    }

    createColorPicker() {
        this.colorPicker.innerHTML = '';
        this.colors.forEach((color, index) => {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.style.backgroundColor = color;
            btn.addEventListener('click', () => this.selectColor(index));
            this.colorPicker.appendChild(btn);
        });
    }

    selectColor(index) {
        this.selectedColor = index;
        const btns = this.colorPicker.querySelectorAll('.color-btn');
        btns.forEach((btn, i) => {
            btn.classList.toggle('selected', i === index);
        });
    }

    newGame() {
        // Generate secret code
        this.secretCode = [];
        for (let i = 0; i < this.codeLength; i++) {
            this.secretCode.push(Math.floor(Math.random() * this.colors.length));
        }

        this.currentGuess = Array(this.codeLength).fill(null);
        this.currentRow = 0;
        this.gameOver = false;
        this.selectedColor = null;

        this.status.textContent = 'Gæt den hemmelige kode';
        this.status.className = 'status';
        this.guessBtn.disabled = false;
        this.clearBtn.disabled = false;

        // Reset color picker
        const btns = this.colorPicker.querySelectorAll('.color-btn');
        btns.forEach(btn => btn.classList.remove('selected'));

        this.render();
        HjernespilAPI.trackStart('14');
    }

    render() {
        this.boardEl.innerHTML = '';

        // Secret code row
        const secretRow = document.createElement('div');
        secretRow.className = 'row secret' + (this.gameOver ? ' revealed' : '');
        secretRow.innerHTML = '<div class="row-number">?</div>';

        const secretPegs = document.createElement('div');
        secretPegs.className = 'pegs';

        for (let i = 0; i < this.codeLength; i++) {
            const slot = document.createElement('div');
            slot.className = 'peg-slot' + (this.gameOver ? ' revealed' : ' hidden');
            if (this.gameOver) {
                slot.style.backgroundColor = this.colors[this.secretCode[i]];
            }
            secretPegs.appendChild(slot);
        }

        secretRow.appendChild(secretPegs);
        this.boardEl.appendChild(secretRow);

        // Guess rows
        for (let row = 0; row < this.maxGuesses; row++) {
            const rowEl = document.createElement('div');
            rowEl.className = 'row';

            if (row === this.currentRow && !this.gameOver) {
                rowEl.classList.add('active');
            } else if (row < this.currentRow) {
                rowEl.classList.add('completed');
            }

            const rowNum = document.createElement('div');
            rowNum.className = 'row-number';
            rowNum.textContent = row + 1;
            rowEl.appendChild(rowNum);

            const pegs = document.createElement('div');
            pegs.className = 'pegs';

            for (let col = 0; col < this.codeLength; col++) {
                const slot = document.createElement('div');
                slot.className = 'peg-slot';

                // Get the color for this slot
                const guessData = this.getGuessData(row);
                if (guessData && guessData.colors[col] !== null) {
                    slot.style.backgroundColor = this.colors[guessData.colors[col]];
                    slot.classList.add('filled');
                } else if (row === this.currentRow && this.currentGuess[col] !== null) {
                    slot.style.backgroundColor = this.colors[this.currentGuess[col]];
                    slot.classList.add('filled');
                }

                if (row === this.currentRow && !this.gameOver) {
                    slot.addEventListener('click', () => this.placeColor(col));
                }

                pegs.appendChild(slot);
            }

            rowEl.appendChild(pegs);

            // Hints
            const hints = document.createElement('div');
            hints.className = 'hints';

            const guessData = this.getGuessData(row);
            if (guessData) {
                for (let i = 0; i < this.codeLength; i++) {
                    const hint = document.createElement('div');
                    hint.className = 'hint';
                    if (i < guessData.black) {
                        hint.classList.add('black');
                    } else if (i < guessData.black + guessData.white) {
                        hint.classList.add('white');
                    }
                    hints.appendChild(hint);
                }
            } else {
                for (let i = 0; i < this.codeLength; i++) {
                    const hint = document.createElement('div');
                    hint.className = 'hint';
                    hints.appendChild(hint);
                }
            }

            rowEl.appendChild(hints);
            this.boardEl.appendChild(rowEl);
        }
    }

    guessHistory = [];

    getGuessData(row) {
        return this.guessHistory[row] || null;
    }

    placeColor(col) {
        if (this.gameOver || this.selectedColor === null) return;

        this.currentGuess[col] = this.selectedColor;
        this.render();
    }

    clearCurrentRow() {
        if (this.gameOver) return;
        this.currentGuess = Array(this.codeLength).fill(null);
        this.render();
    }

    submitGuess() {
        if (this.gameOver) return;

        // Check if all slots are filled
        if (this.currentGuess.includes(null)) {
            this.status.textContent = 'Udfyld alle 4 felter først';
            return;
        }

        // Calculate hints
        const result = this.checkGuess(this.currentGuess);

        // Store guess
        this.guessHistory[this.currentRow] = {
            colors: [...this.currentGuess],
            black: result.black,
            white: result.white
        };

        // Check for win
        if (result.black === this.codeLength) {
            this.gameOver = true;
            this.status.textContent = `Tillykke! Du knækkede koden på ${this.currentRow + 1} forsøg!`;
            this.status.className = 'status winner';
            this.guessBtn.disabled = true;
            this.clearBtn.disabled = true;
            HjernespilAPI.trackComplete('14');
            HjernespilUI.showWinModal(3);
            this.render();
            return;
        }

        // Move to next row
        this.currentRow++;

        if (this.currentRow >= this.maxGuesses) {
            this.gameOver = true;
            this.status.textContent = 'Desværre! Du løb tør for forsøg.';
            this.status.className = 'status loser';
            this.guessBtn.disabled = true;
            this.clearBtn.disabled = true;
        } else {
            this.currentGuess = Array(this.codeLength).fill(null);
            this.status.textContent = `Forsøg ${this.currentRow + 1} af ${this.maxGuesses}`;
        }

        this.render();
    }

    checkGuess(guess) {
        let black = 0;
        let white = 0;

        const secretCopy = [...this.secretCode];
        const guessCopy = [...guess];

        // First pass: find exact matches (black)
        for (let i = 0; i < this.codeLength; i++) {
            if (guessCopy[i] === secretCopy[i]) {
                black++;
                secretCopy[i] = null;
                guessCopy[i] = null;
            }
        }

        // Second pass: find color matches (white)
        for (let i = 0; i < this.codeLength; i++) {
            if (guessCopy[i] !== null) {
                const idx = secretCopy.indexOf(guessCopy[i]);
                if (idx !== -1) {
                    white++;
                    secretCopy[idx] = null;
                }
            }
        }

        return { black, white };
    }
}

// Start game
new Mastermind();
