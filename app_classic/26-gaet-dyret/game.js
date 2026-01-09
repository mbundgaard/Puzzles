class AnimalGame {
    constructor() {
        this.API_BASE = 'https://puzzlesapi.azurewebsites.net/api/game/26';
        this.MAX_GUESSES = 20;

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
        this.guessCount = 0;
        this.history = [];
        this.hints = [];
        this.isLoading = false;
        this.HINT_COST = 5;

        // Get params from URL
        const params = new URLSearchParams(window.location.search);
        this.category = params.get('category') || 'pattedyr';
        this.difficulty = params.get('difficulty') || 'hard';

        // Elements
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
        this.hintBtn = document.getElementById('hint-btn');
        this.hintsSection = document.getElementById('hints-section');

        this.init();
    }

    init() {
        this.askBtn.addEventListener('click', () => this.askQuestion());
        this.guessBtn.addEventListener('click', () => this.makeGuess());
        this.hintBtn.addEventListener('click', () => this.getHint());
        this.playAgainBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        this.startGame();
    }

    async startGame() {
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

            if (!response.ok) throw new Error('Failed to pick animal');

            const data = await response.json();
            this.animal = data.animal.toLowerCase();
            this.guessCount = 0;
            this.history = [];
            this.hints = [];

            this.categoryLabel.textContent = this.capitalizeFirst(this.category);
            this.updateCounter();
            this.renderHistory();
            this.renderHints();
            this.updateHintButton();

            HjernespilAPI.sessionEvent('newGame');
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Kunne ikke starte spillet. Prøv igen.');
            window.location.href = 'index.html';
        } finally {
            this.setLoading(false);
            this.gameInput.focus();
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

            if (!response.ok) throw new Error('Failed to ask question');

            const data = await response.json();
            this.history.push({
                type: 'question',
                text: question,
                answer: data.answer
            });

            this.renderHistory();
            this.gameInput.value = '';
            this.updateHintButton();

            if (this.guessCount >= this.MAX_GUESSES) {
                this.showLoss();
            }
        } catch (error) {
            console.error('Error asking question:', error);
            this.guessCount--;
            this.updateCounter();
            this.updateHintButton();
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
        this.updateHintButton();

        if (isCorrect) {
            this.showWin();
        } else if (this.guessCount >= this.MAX_GUESSES) {
            this.showLoss();
        }
    }

    checkGuess(guess) {
        const normalizedGuess = this.normalizeString(guess);
        const normalizedAnimal = this.normalizeString(this.animal);

        if (normalizedGuess === normalizedAnimal) return true;

        if (normalizedGuess.includes(normalizedAnimal) || normalizedAnimal.includes(normalizedGuess)) {
            const shorter = normalizedGuess.length < normalizedAnimal.length ? normalizedGuess : normalizedAnimal;
            if (shorter.length >= 3) return true;
        }

        return false;
    }

    normalizeString(str) {
        return str.toLowerCase().replace(/^(en |et |the |a )/, '').trim();
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
            this.answerHistory.innerHTML = '';
            return;
        }

        const item = this.history[this.history.length - 1];
        const isGuess = item.type === 'guess';
        const answerClass = item.answer.toLowerCase().replace('!', '');

        this.answerHistory.innerHTML = `
            <div class="history-item${isGuess ? ' guess' : ''}">
                <span class="history-question">${isGuess ? 'Gæt: ' : ''}${this.escapeHtml(item.text)}</span>
                <span class="history-answer ${answerClass}">${item.answer}</span>
            </div>
        `;
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.askBtn.disabled = loading;
        this.guessBtn.disabled = loading;
        this.gameInput.disabled = loading;
        this.updateHintButton();

        if (loading) {
            document.querySelector('.game-screen').classList.add('loading');
        } else {
            document.querySelector('.game-screen').classList.remove('loading');
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

    async getHint() {
        if (this.isLoading || !this.canGetHint()) return;

        this.setLoading(true);
        this.guessCount += this.HINT_COST;
        this.updateCounter();

        try {
            const response = await fetch(`${this.API_BASE}/hint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    animal: this.animal,
                    previousHints: this.hints
                })
            });

            if (!response.ok) throw new Error('Failed to get hint');

            const data = await response.json();
            this.hints.push(data.hint);
            this.renderHints();
            this.updateHintButton();

            if (this.guessCount >= this.MAX_GUESSES) {
                this.showLoss();
            }
        } catch (error) {
            console.error('Error getting hint:', error);
            this.guessCount -= this.HINT_COST;
            this.updateCounter();
            alert('Kunne ikke hente hint. Prøv igen.');
        } finally {
            this.setLoading(false);
        }
    }

    canGetHint() {
        const remaining = this.MAX_GUESSES - this.guessCount;
        return remaining > this.HINT_COST;
    }

    renderHints() {
        if (this.hints.length === 0) {
            this.hintsSection.classList.remove('has-hints');
            this.hintsSection.innerHTML = '';
            return;
        }

        this.hintsSection.classList.add('has-hints');
        this.hintsSection.innerHTML = this.hints.map(hint => `
            <div class="hint-item">
                <span class="hint-icon">💡</span>
                <span>${this.escapeHtml(hint)}</span>
            </div>
        `).join('');
    }

    updateHintButton() {
        const canHint = this.canGetHint();
        this.hintBtn.disabled = !canHint || this.isLoading;

        const remaining = this.MAX_GUESSES - this.guessCount;
        if (remaining <= this.HINT_COST) {
            this.hintBtn.querySelector('.hint-text').textContent = 'Ikke nok forsøg';
        } else {
            this.hintBtn.querySelector('.hint-text').textContent = `Få hint (-${this.HINT_COST} forsøg)`;
        }
    }
}

new AnimalGame();
