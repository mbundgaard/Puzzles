class AnimalGuessingGame {
    constructor() {
        this.API_BASE = 'https://puzzlesapi.azurewebsites.net/api/game/26';
        this.MAX_GUESSES = 20;

        // Points intervals per difficulty (max points scales with difficulty)
        this.DIFFICULTY_CONFIG = {
            easy: {
                maxPoints: 2,
                intervals: [
                    { max: 10, points: 2 },
                    { max: 20, points: 1 }
                ]
            },
            medium: {
                maxPoints: 3,
                intervals: [
                    { max: 6, points: 3 },
                    { max: 13, points: 2 },
                    { max: 20, points: 1 }
                ]
            },
            hard: {
                maxPoints: 5,
                intervals: [
                    { max: 4, points: 5 },
                    { max: 8, points: 4 },
                    { max: 12, points: 3 },
                    { max: 16, points: 2 },
                    { max: 20, points: 1 }
                ]
            }
        };

        this.animal = null;
        this.category = null;
        this.difficulty = null;
        this.guessCount = 0;
        this.history = [];
        this.isLoading = false;

        // Elements
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.categoryStep = document.getElementById('category-step');
        this.difficultyStep = document.getElementById('difficulty-step');
        this.categoryLabel = document.getElementById('category-label');
        this.guessCounter = document.getElementById('guess-counter');
        this.pointsIndicator = document.getElementById('points-indicator');
        this.answerHistory = document.getElementById('answer-history');
        this.gameInput = document.getElementById('game-input');
        this.askBtn = document.getElementById('ask-btn');
        this.guessBtn = document.getElementById('guess-btn');
        this.loseOverlay = document.getElementById('lose-overlay');
        this.revealAnimal = document.getElementById('reveal-animal');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.categoryBtns = document.querySelectorAll('.category-btn');
        this.difficultyBtns = document.querySelectorAll('.difficulty-btn');
        this.backToCategoryBtn = document.getElementById('back-to-category');

        this.init();
    }

    init() {
        // Category buttons - show difficulty selection
        this.categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.category = btn.dataset.category;
                this.showDifficultyStep();
            });
        });

        // Difficulty buttons - start game
        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.startGame(btn.dataset.difficulty);
            });
        });

        // Back to category
        this.backToCategoryBtn.addEventListener('click', () => {
            this.showCategoryStep();
        });

        // Ask button
        this.askBtn.addEventListener('click', () => this.askQuestion());

        // Guess button
        this.guessBtn.addEventListener('click', () => this.makeGuess());

        // Play again
        this.playAgainBtn.addEventListener('click', () => {
            this.loseOverlay.classList.remove('show');
            this.showStartScreen();
        });
    }

    showCategoryStep() {
        this.categoryStep.classList.remove('hidden');
        this.difficultyStep.classList.add('hidden');
    }

    showDifficultyStep() {
        this.categoryStep.classList.add('hidden');
        this.difficultyStep.classList.remove('hidden');
    }

    showStartScreen() {
        this.startScreen.classList.remove('hidden');
        this.gameScreen.classList.add('hidden');
        this.showCategoryStep();
        this.animal = null;
        this.category = null;
        this.difficulty = null;
        this.guessCount = 0;
        this.history = [];
    }

    async startGame(difficulty) {
        this.difficulty = difficulty;
        this.setLoading(true);

        try {
            const response = await fetch(`${this.API_BASE}/pick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: this.category,
                    difficulty: this.difficulty
                })
            });

            if (!response.ok) {
                throw new Error('Failed to pick animal');
            }

            const data = await response.json();
            this.animal = data.animal.toLowerCase();
            this.guessCount = 0;
            this.history = [];

            this.startScreen.classList.add('hidden');
            this.gameScreen.classList.remove('hidden');

            this.categoryLabel.textContent = this.capitalizeFirst(this.category);
            this.updateCounter();
            this.renderHistory();
            this.gameInput.value = '';
            this.gameInput.focus();

            HjernespilAPI.sessionEvent('newGame');
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Kunne ikke starte spillet. Prøv igen.');
        } finally {
            this.setLoading(false);
        }
    }

    async askQuestion() {
        const question = this.gameInput.value.trim();
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
            this.gameInput.value = '';

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
        }
    }

    makeGuess() {
        const guess = this.gameInput.value.trim().toLowerCase();
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
        this.gameInput.value = '';

        if (isCorrect) {
            this.showWin();
        } else if (this.guessCount >= this.MAX_GUESSES) {
            this.showLoss();
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
        const config = this.DIFFICULTY_CONFIG[this.difficulty];
        for (const interval of config.intervals) {
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
        this.guessCounter.textContent = `${this.guessCount}/${this.MAX_GUESSES}`;
        const points = this.calculatePoints();
        this.pointsIndicator.textContent = `${points} point`;
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
        this.gameInput.disabled = loading;

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
