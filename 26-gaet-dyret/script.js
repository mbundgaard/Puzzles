class AnimalGuessingGame {
    constructor() {
        this.API_BASE = 'https://puzzlesapi.azurewebsites.net/api/game/26';
        this.MAX_GUESSES = 20;
        this.POINTS_INTERVALS = [
            { max: 4, points: 5 },
            { max: 8, points: 4 },
            { max: 12, points: 3 },
            { max: 16, points: 2 },
            { max: 20, points: 1 }
        ];

        this.animal = null;
        this.category = null;
        this.guessCount = 0;
        this.history = [];
        this.isLoading = false;

        // Elements
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.categoryLabel = document.getElementById('category-label');
        this.guessCounter = document.getElementById('guess-counter');
        this.answerHistory = document.getElementById('answer-history');
        this.questionInput = document.getElementById('question-input');
        this.guessInput = document.getElementById('guess-input');
        this.askBtn = document.getElementById('ask-btn');
        this.guessBtn = document.getElementById('guess-btn');
        this.loseOverlay = document.getElementById('lose-overlay');
        this.revealAnimal = document.getElementById('reveal-animal');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.categoryBtns = document.querySelectorAll('.category-btn');

        this.init();
    }

    init() {
        // Category buttons
        this.categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.startGame(btn.dataset.category);
            });
        });

        // Ask button
        this.askBtn.addEventListener('click', () => this.askQuestion());
        this.questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.askQuestion();
        });

        // Guess button
        this.guessBtn.addEventListener('click', () => this.makeGuess());
        this.guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.makeGuess();
        });

        // Play again
        this.playAgainBtn.addEventListener('click', () => {
            this.loseOverlay.classList.remove('show');
            this.showStartScreen();
        });
    }

    showStartScreen() {
        this.startScreen.classList.remove('hidden');
        this.gameScreen.classList.add('hidden');
        this.animal = null;
        this.category = null;
        this.guessCount = 0;
        this.history = [];
    }

    async startGame(category) {
        this.setLoading(true);

        try {
            const response = await fetch(`${this.API_BASE}/pick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category })
            });

            if (!response.ok) {
                throw new Error('Failed to pick animal');
            }

            const data = await response.json();
            this.animal = data.animal.toLowerCase();
            this.category = data.category;
            this.guessCount = 0;
            this.history = [];

            this.startScreen.classList.add('hidden');
            this.gameScreen.classList.remove('hidden');

            this.categoryLabel.textContent = this.capitalizeFirst(this.category);
            this.updateCounter();
            this.renderHistory();
            this.questionInput.value = '';
            this.guessInput.value = '';
            this.questionInput.focus();

            HjernespilAPI.sessionEvent('newGame');
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Kunne ikke starte spillet. Prøv igen.');
        } finally {
            this.setLoading(false);
        }
    }

    async askQuestion() {
        const question = this.questionInput.value.trim();
        if (!question || this.isLoading || this.guessCount >= this.MAX_GUESSES) return;

        this.setLoading(true);
        this.guessCount++;
        this.updateCounter();

        try {
            const response = await fetch(`${this.API_BASE}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ animal: this.animal, question })
            });

            if (!response.ok) {
                throw new Error('Failed to ask question');
            }

            const data = await response.json();
            this.history.push({
                type: 'question',
                text: question,
                answer: data.answer
            });

            this.renderHistory();
            this.questionInput.value = '';

            if (this.guessCount >= this.MAX_GUESSES) {
                this.showLoss();
            }
        } catch (error) {
            console.error('Error asking question:', error);
            this.guessCount--; // Revert count on error
            this.updateCounter();
            alert('Kunne ikke stille spørgsmål. Prøv igen.');
        } finally {
            this.setLoading(false);
            this.questionInput.focus();
        }
    }

    makeGuess() {
        const guess = this.guessInput.value.trim().toLowerCase();
        if (!guess || this.isLoading || this.guessCount >= this.MAX_GUESSES) return;

        this.guessCount++;
        this.updateCounter();

        const isCorrect = this.checkGuess(guess);

        this.history.push({
            type: 'guess',
            text: guess,
            answer: isCorrect ? 'Rigtigt!' : 'Forkert'
        });

        this.renderHistory();
        this.guessInput.value = '';

        if (isCorrect) {
            this.showWin();
        } else if (this.guessCount >= this.MAX_GUESSES) {
            this.showLoss();
        } else {
            this.questionInput.focus();
        }
    }

    checkGuess(guess) {
        // Normalize both strings for comparison
        const normalizedGuess = this.normalizeString(guess);
        const normalizedAnimal = this.normalizeString(this.animal);

        // Direct match
        if (normalizedGuess === normalizedAnimal) return true;

        // Check if guess contains the animal or vice versa
        // This handles cases like "en delfin" vs "delfin"
        if (normalizedGuess.includes(normalizedAnimal) || normalizedAnimal.includes(normalizedGuess)) {
            // Only if the shorter one is at least 3 characters
            const shorter = normalizedGuess.length < normalizedAnimal.length ? normalizedGuess : normalizedAnimal;
            if (shorter.length >= 3) return true;
        }

        return false;
    }

    normalizeString(str) {
        return str
            .toLowerCase()
            .replace(/^(en |et |the |a )/, '') // Remove articles
            .trim();
    }

    calculatePoints() {
        for (const interval of this.POINTS_INTERVALS) {
            if (this.guessCount <= interval.max) {
                return interval.points;
            }
        }
        return 1;
    }

    showWin() {
        const points = this.calculatePoints();
        HjernespilAPI.sessionEvent('win');
        HjernespilUI.showWinModal(points);
    }

    showLoss() {
        this.revealAnimal.textContent = this.capitalizeFirst(this.animal);
        this.loseOverlay.classList.add('show');
    }

    updateCounter() {
        this.guessCounter.textContent = `Forsøg: ${this.guessCount}/${this.MAX_GUESSES}`;
    }

    renderHistory() {
        if (this.history.length === 0) {
            this.answerHistory.innerHTML = '<div class="empty-history">Stil et spørgsmål eller gæt dyret</div>';
            return;
        }

        this.answerHistory.innerHTML = this.history.map(item => {
            const isGuess = item.type === 'guess';
            const answerClass = item.answer.toLowerCase().replace('!', '');

            return `
                <div class="history-item${isGuess ? ' guess' : ''}">
                    <span class="history-question">${isGuess ? 'Gæt: ' : ''}${this.escapeHtml(item.text)}</span>
                    <span class="history-answer ${answerClass}">${item.answer}</span>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        this.answerHistory.scrollTop = this.answerHistory.scrollHeight;
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.askBtn.disabled = loading;
        this.guessBtn.disabled = loading;
        this.questionInput.disabled = loading;
        this.guessInput.disabled = loading;

        if (loading) {
            this.gameScreen.classList.add('loading');
        } else {
            this.gameScreen.classList.remove('loading');
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

new AnimalGuessingGame();
