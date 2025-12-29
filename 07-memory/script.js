class Memory {
    constructor() {
        this.emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'];
        this.cols = 6;
        this.rows = 4;
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.isLocked = false;

        this.boardEl = document.getElementById('board');
        this.movesEl = document.getElementById('moves');
        this.pairsEl = document.getElementById('pairs');
        this.newGameBtn = document.getElementById('new-game');
        this.sizeSelect = document.getElementById('size');
        this.victoryOverlay = document.getElementById('victory');
        this.playAgainBtn = document.getElementById('play-again');
        this.finalMovesEl = document.getElementById('final-moves');

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.playAgainBtn.addEventListener('click', () => {
            this.victoryOverlay.classList.remove('show');
            this.newGame();
        });
        this.sizeSelect.addEventListener('change', (e) => {
            this.cols = parseInt(e.target.value);
            this.newGame();
        });

        this.newGame();
    }

    newGame() {
        this.matchedPairs = 0;
        this.moves = 0;
        this.flippedCards = [];
        this.isLocked = false;

        const totalPairs = (this.cols * this.rows) / 2;
        const selectedEmojis = this.shuffle([...this.emojis]).slice(0, totalPairs);
        this.cards = this.shuffle([...selectedEmojis, ...selectedEmojis]);

        this.updateStats();
        this.render();
        HjernespilAPI.trackStart('07');
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    updateStats() {
        const totalPairs = (this.cols * this.rows) / 2;
        this.movesEl.textContent = this.moves;
        this.pairsEl.textContent = `${this.matchedPairs} / ${totalPairs}`;
    }

    render() {
        this.boardEl.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        this.boardEl.innerHTML = '';

        this.cards.forEach((emoji, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.index = index;
            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-front"></div>
                    <div class="card-back">${emoji}</div>
                </div>
            `;

            card.addEventListener('click', () => this.flipCard(index));
            this.boardEl.appendChild(card);
        });
    }

    flipCard(index) {
        if (this.isLocked) return;

        const cardEl = this.boardEl.children[index];
        if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;
        if (this.flippedCards.length === 2) return;

        cardEl.classList.add('flipped');
        this.flippedCards.push({ index, emoji: this.cards[index] });

        if (this.flippedCards.length === 2) {
            this.moves++;
            this.updateStats();
            this.checkMatch();
        }
    }

    checkMatch() {
        const [card1, card2] = this.flippedCards;

        if (card1.emoji === card2.emoji) {
            const cardEl1 = this.boardEl.children[card1.index];
            const cardEl2 = this.boardEl.children[card2.index];
            cardEl1.classList.add('matched');
            cardEl2.classList.add('matched');
            this.matchedPairs++;
            this.flippedCards = [];
            this.updateStats();

            if (this.matchedPairs === (this.cols * this.rows) / 2) {
                setTimeout(() => this.showVictory(), 500);
            }
        } else {
            this.isLocked = true;
            setTimeout(() => {
                const cardEl1 = this.boardEl.children[card1.index];
                const cardEl2 = this.boardEl.children[card2.index];
                cardEl1.classList.remove('flipped');
                cardEl2.classList.remove('flipped');
                this.flippedCards = [];
                this.isLocked = false;
            }, 1000);
        }
    }

    showVictory() {
        this.finalMovesEl.textContent = this.moves;
        this.victoryOverlay.classList.add('show');
        HjernespilAPI.trackComplete('07');
        HjernespilUI.showWinModal(3);
    }
}

new Memory();
