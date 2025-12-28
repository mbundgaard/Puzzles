class Solitaire {
    constructor() {
        // Emoji suits: 🌸🔥 are "red", 🌊🍀 are "black"
        this.suits = ['🌸', '🌊', '🔥', '🍀'];
        this.suitColors = { '🌸': 'red', '🌊': 'black', '🔥': 'red', '🍀': 'black' };
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];
        this.moves = 0;
        this.selectedCard = null;
        this.selectedSource = null;

        this.stockEl = document.getElementById('stock');
        this.wasteEl = document.getElementById('waste');
        this.foundationsEl = document.getElementById('foundations');
        this.tableauEl = document.getElementById('tableau');
        this.movesEl = document.getElementById('moves');
        this.newGameBtn = document.getElementById('new-game');
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

        this.stockEl.addEventListener('click', () => this.drawFromStock());

        this.wasteEl.addEventListener('click', () => {
            if (this.waste.length > 0) {
                this.selectCard(this.waste[this.waste.length - 1], 'waste');
            }
        });

        this.foundationsEl.querySelectorAll('.foundation').forEach((el, i) => {
            el.addEventListener('click', () => this.handleFoundationClick(i));
        });

        this.tableauEl.querySelectorAll('.column').forEach((el, i) => {
            el.addEventListener('click', (e) => this.handleTableauClick(i, e));
        });

        this.newGame();
    }

    newGame() {
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];
        this.moves = 0;
        this.selectedCard = null;
        this.selectedSource = null;

        // Create deck
        const deck = [];
        for (let s = 0; s < 4; s++) {
            for (let r = 0; r < 13; r++) {
                deck.push({ suit: this.suits[s], rank: r, faceUp: false });
            }
        }

        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        // Deal to tableau
        let cardIndex = 0;
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = deck[cardIndex++];
                card.faceUp = (row === col);
                this.tableau[col].push(card);
            }
        }

        // Rest goes to stock
        this.stock = deck.slice(cardIndex);

        this.render();
        HjernespilAPI.trackStart('08');
    }

    drawFromStock() {
        if (this.selectedCard) {
            this.clearSelection();
            return;
        }

        if (this.stock.length === 0) {
            // Reset stock from waste
            this.stock = this.waste.reverse();
            this.stock.forEach(c => c.faceUp = false);
            this.waste = [];
        } else {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
            this.moves++;
        }
        this.render();
    }

    selectCard(card, source, sourceIndex = null, cardIndex = null) {
        if (this.selectedCard === card) {
            this.clearSelection();
            return;
        }

        if (!card.faceUp) return;

        if (this.selectedCard) {
            // Try to move selected card to this location
            if (source === 'tableau') {
                this.tryMoveToTableau(sourceIndex);
            } else if (source === 'foundation') {
                this.clearSelection();
            }
            return;
        }

        this.selectedCard = card;
        this.selectedSource = { type: source, index: sourceIndex, cardIndex };
        this.render();
    }

    clearSelection() {
        this.selectedCard = null;
        this.selectedSource = null;
        this.render();
    }

    handleFoundationClick(foundationIndex) {
        if (this.selectedCard) {
            this.tryMoveToFoundation(foundationIndex);
        } else if (this.foundations[foundationIndex].length > 0) {
            const card = this.foundations[foundationIndex][this.foundations[foundationIndex].length - 1];
            this.selectCard(card, 'foundation', foundationIndex);
        }
    }

    handleTableauClick(colIndex, event) {
        const column = this.tableau[colIndex];

        if (this.selectedCard) {
            this.tryMoveToTableau(colIndex);
            return;
        }

        if (column.length === 0) return;

        // Find which card was clicked
        const rect = event.currentTarget.getBoundingClientRect();
        const clickY = event.clientY - rect.top;
        const cardSpacing = 25;
        let clickedIndex = Math.floor(clickY / cardSpacing);
        clickedIndex = Math.min(clickedIndex, column.length - 1);

        // Find the topmost face-up card at or below click
        while (clickedIndex < column.length && !column[clickedIndex].faceUp) {
            clickedIndex++;
        }

        if (clickedIndex < column.length) {
            this.selectCard(column[clickedIndex], 'tableau', colIndex, clickedIndex);
        }
    }

    tryMoveToFoundation(foundationIndex) {
        if (!this.selectedCard) return;

        const foundation = this.foundations[foundationIndex];
        const card = this.selectedCard;

        // Check if move is valid
        const targetSuit = this.suits[foundationIndex];
        if (card.suit !== targetSuit) {
            this.clearSelection();
            return;
        }

        const expectedRank = foundation.length;
        if (card.rank !== expectedRank) {
            this.clearSelection();
            return;
        }

        // Can only move single cards to foundation
        if (this.selectedSource.type === 'tableau') {
            const col = this.tableau[this.selectedSource.index];
            if (this.selectedSource.cardIndex !== col.length - 1) {
                this.clearSelection();
                return;
            }
        }

        // Move the card
        this.removeSelectedCard();
        foundation.push(card);
        this.moves++;
        this.clearSelection();

        if (this.checkWin()) {
            setTimeout(() => this.showVictory(), 300);
        }
    }

    tryMoveToTableau(colIndex) {
        if (!this.selectedCard) return;

        const column = this.tableau[colIndex];
        const card = this.selectedCard;

        // Check if move is valid
        if (column.length === 0) {
            // Only kings can go on empty columns
            if (card.rank !== 12) {
                this.clearSelection();
                return;
            }
        } else {
            const topCard = column[column.length - 1];
            // Must be opposite color and one rank lower
            if (this.suitColors[card.suit] === this.suitColors[topCard.suit]) {
                this.clearSelection();
                return;
            }
            if (card.rank !== topCard.rank - 1) {
                this.clearSelection();
                return;
            }
        }

        // Move the card(s)
        const cardsToMove = this.getCardsToMove();
        this.removeSelectedCard();
        column.push(...cardsToMove);
        this.moves++;
        this.clearSelection();
    }

    getCardsToMove() {
        if (this.selectedSource.type === 'waste') {
            return [this.selectedCard];
        } else if (this.selectedSource.type === 'foundation') {
            return [this.selectedCard];
        } else if (this.selectedSource.type === 'tableau') {
            const col = this.tableau[this.selectedSource.index];
            return col.slice(this.selectedSource.cardIndex);
        }
        return [this.selectedCard];
    }

    removeSelectedCard() {
        if (this.selectedSource.type === 'waste') {
            this.waste.pop();
        } else if (this.selectedSource.type === 'foundation') {
            this.foundations[this.selectedSource.index].pop();
        } else if (this.selectedSource.type === 'tableau') {
            const col = this.tableau[this.selectedSource.index];
            col.splice(this.selectedSource.cardIndex);
            // Flip the new top card
            if (col.length > 0 && !col[col.length - 1].faceUp) {
                col[col.length - 1].faceUp = true;
            }
        }
    }

    checkWin() {
        return this.foundations.every(f => f.length === 13);
    }

    showVictory() {
        this.finalMovesEl.textContent = this.moves;
        this.victoryOverlay.classList.add('show');
        HjernespilAPI.trackComplete('08');
        HjernespilUI.showWinModal();
    }

    render() {
        this.movesEl.textContent = this.moves;

        // Render stock
        this.stockEl.innerHTML = '';
        if (this.stock.length > 0) {
            this.stockEl.classList.remove('empty');
            const cardEl = this.createCardElement({ faceUp: false }, false);
            cardEl.style.position = 'absolute';
            cardEl.style.top = '0';
            cardEl.style.left = '0';
            this.stockEl.appendChild(cardEl);
        } else {
            this.stockEl.classList.add('empty');
        }

        // Render waste
        this.wasteEl.innerHTML = '';
        if (this.waste.length > 0) {
            const card = this.waste[this.waste.length - 1];
            const cardEl = this.createCardElement(card, card === this.selectedCard);
            cardEl.style.position = 'absolute';
            cardEl.style.top = '0';
            cardEl.style.left = '0';
            this.wasteEl.appendChild(cardEl);
        }

        // Render foundations
        this.foundationsEl.querySelectorAll('.foundation').forEach((el, i) => {
            const cards = el.querySelectorAll('.card');
            cards.forEach(c => c.remove());

            if (this.foundations[i].length > 0) {
                const card = this.foundations[i][this.foundations[i].length - 1];
                const cardEl = this.createCardElement(card, card === this.selectedCard);
                cardEl.style.position = 'absolute';
                cardEl.style.top = '0';
                cardEl.style.left = '0';
                el.appendChild(cardEl);
            }
        });

        // Render tableau
        this.tableauEl.querySelectorAll('.column').forEach((el, colIndex) => {
            el.innerHTML = '';
            const column = this.tableau[colIndex];

            column.forEach((card, cardIndex) => {
                const isSelected = this.selectedCard &&
                    this.selectedSource?.type === 'tableau' &&
                    this.selectedSource?.index === colIndex &&
                    cardIndex >= this.selectedSource?.cardIndex;

                const cardEl = this.createCardElement(card, isSelected);
                cardEl.style.position = 'absolute';
                cardEl.style.top = (cardIndex * 25) + 'px';
                cardEl.style.left = '0';
                cardEl.dataset.index = cardIndex;
                el.appendChild(cardEl);
            });

            // Set min height based on cards
            el.style.height = Math.max(70, column.length * 25 + 70) + 'px';
        });
    }

    createCardElement(card, isSelected) {
        const el = document.createElement('div');
        el.className = 'card';

        if (!card.faceUp) {
            el.classList.add('back');
        } else {
            el.classList.add('face');
            el.classList.add(this.suitColors[card.suit]);

            const rankStr = this.ranks[card.rank];
            el.innerHTML = `
                <div class="card-corner">
                    <span class="card-rank">${rankStr}</span>
                    <span class="card-suit">${card.suit}</span>
                </div>
                <div class="card-center">${card.suit}</div>
            `;
        }

        if (isSelected) {
            el.classList.add('selected');
        }

        return el;
    }
}

new Solitaire();
