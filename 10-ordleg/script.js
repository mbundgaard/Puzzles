// Word categories will be loaded from JSON files
const WORD_CATEGORIES = {};

// Valid Danish letters
const DANISH_LETTERS = 'abcdefghijklmnopqrstuvwxyzæøå';

// Words that are definite forms or plurals - should be excluded
// These are words where players might be confused because they expect base forms
const EXCLUDED_WORDS = new Set([
    // Definite forms (-en suffix = common gender "the")
    'armen', 'banen', 'bilen', 'faren', 'gaven', 'halen', 'hønen', 'pigen',
    'risen', 'ræven', 'stuen', 'vejen', 'visen', 'ungen', 'pælen', 'filen',
    'rosen', 'basen', 'bøgen', 'dosen', 'enden', 'foden', 'haven', 'huden',
    'køen', 'luen', 'muren', 'nålen', 'posen', 'ruden', 'solen', 'timen',
    // Animal definite forms
    'haren', 'løven', 'musen', 'ørnen', 'selen', 'ulven', 'viben', 'geden',
    'hanen', 'gåsen', 'anden', 'mågen', 'uglen',
    // Definite forms (-et suffix = neuter gender "the")
    'dyret', 'hadet', 'havet', 'huset', 'livet', 'lynet', 'mødet', 'toget',
    'træet', 'higet', 'øjet', 'året', 'arket', 'bedet', 'benet', 'buret',
    'dunet', 'egnet', 'emnet', 'fadet', 'gulvet', 'hjulet', 'hornet',
    // Common plurals (-e suffix)
    'blade', 'borde', 'breve', 'fugle', 'heste', 'hunde', 'kampe', 'lande',
    'skibe', 'skove', 'stene', 'telte', 'træer', 'ugler', 'biler', 'bøger',
    'katte', 'lamme', 'fluer', 'myrer', 'øgler', 'hvale',
    // Common plurals (-er suffix)
    'damer', 'gader', 'huler', 'ideer', 'kager', 'noter', 'roser', 'sider',
    'skyer', 'toner', 'typer', 'unger', 'urter', 'haver', 'haner', 'haser',
    'hajer', 'ilder',
    // Past participles and other declined forms
    'brugt', 'glemt', 'klemt', 'svedt'
]);

// Check if a word looks like a definite or plural form
function isLikelyDeclinedForm(word) {
    word = word.toLowerCase();

    // Check explicit exclusion list first
    if (EXCLUDED_WORDS.has(word)) return true;

    // Skip words that are known valid base forms (whitelist common exceptions)
    const validBaseWords = new Set([
        'under', 'efter', 'moden', 'nøgen', 'åben', 'egen', 'given', 'maven',
        'oven', 'inden', 'siden', 'ballet', 'buffet', 'hotel', 'motel',
        'internet', 'budget', 'toilet', 'piget', 'riget', 'skabet',
        'penge', 'mange', 'længe', 'hygge', 'sange', 'tunge', 'nogle',
        'andre', 'begge', 'femte', 'halve', 'første', 'sidste', 'bedre'
    ]);
    if (validBaseWords.has(word)) return false;

    return false;
}

// Load word list from JSON file
async function loadWordCategory(category) {
    try {
        const response = await fetch(`words/${category}.json`);
        const words = await response.json();
        WORD_CATEGORIES[category] = words
            .filter(word => word.length === 5)
            .filter(word => !isLikelyDeclinedForm(word));
    } catch (error) {
        console.error(`Failed to load ${category} words:`, error);
        WORD_CATEGORIES[category] = [];
    }
}

// Load all word categories
async function loadAllWords() {
    await Promise.all([
        loadWordCategory('kids-general'),
        loadWordCategory('kids-slang'),
        loadWordCategory('animals'),
        loadWordCategory('food'),
        loadWordCategory('mixed')
    ]);
}

class Ordleg {
    constructor() {
        this.maxGuesses = 6;
        this.wordLength = 5;
        this.currentRow = 0;
        this.currentTile = 0;
        this.currentGuess = '';
        this.targetWord = '';
        this.gameOver = false;
        this.keyStates = {};
        this.revealedPositions = [];
        this.wordsLoaded = false;

        this.board = document.getElementById('board');
        this.keyboard = document.getElementById('keyboard');
        this.message = document.getElementById('message');
        this.newGameBtn = document.getElementById('new-game');
        this.difficultySelect = document.getElementById('difficulty');
        this.categorySelect = document.getElementById('category');
        this.guessBtn = document.getElementById('guess-btn');
        this.hintsRow = document.getElementById('hints-row');

        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.difficultySelect.addEventListener('change', () => this.newGame());
        this.categorySelect.addEventListener('change', () => this.newGame());
        this.guessBtn.addEventListener('click', () => this.submitGuess());
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        this.createBoard();
        this.createKeyboard();
        this.init();
    }

    async init() {
        this.showMessage('Indlæser ord...', '');
        await loadAllWords();
        this.wordsLoaded = true;
        this.message.textContent = '';
        this.newGame();
    }

    createBoard() {
        this.board.innerHTML = '';
        for (let i = 0; i < this.maxGuesses; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            for (let j = 0; j < this.wordLength; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                row.appendChild(tile);
            }
            this.board.appendChild(row);
        }
    }

    createKeyboard() {
        const rows = [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'å'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'æ', 'ø'],
            ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'slet']
        ];

        this.keyboard.innerHTML = '';
        rows.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            row.forEach(key => {
                const keyBtn = document.createElement('button');
                keyBtn.className = 'key' + (key.length > 1 ? ' wide' : '');
                keyBtn.textContent = key === 'slet' ? '←' : key;
                keyBtn.dataset.key = key;
                keyBtn.addEventListener('click', () => this.handleKey(key));
                rowDiv.appendChild(keyBtn);
            });
            this.keyboard.appendChild(rowDiv);
        });
    }

    newGame() {
        if (!this.wordsLoaded) return;

        // Get words for selected category
        const category = this.categorySelect.value;
        const wordList = WORD_CATEGORIES[category] || [];

        if (wordList.length === 0) {
            this.showMessage('Ingen ord fundet for denne kategori', 'error');
            return;
        }

        this.targetWord = wordList[Math.floor(Math.random() * wordList.length)].toLowerCase();

        this.currentRow = 0;
        this.currentTile = 0;
        this.currentGuess = '';
        this.gameOver = false;
        this.keyStates = {};
        this.hints = [];
        this.message.textContent = '';
        this.message.className = 'message';

        // Reset board
        const tiles = this.board.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.textContent = '';
            tile.className = 'tile';
        });

        // Reset keyboard
        const keys = this.keyboard.querySelectorAll('.key');
        keys.forEach(key => {
            key.className = 'key' + (key.dataset.key.length > 1 ? ' wide' : '');
        });

        // Set hints based on difficulty (shown separately, user still types all 5)
        const difficulty = this.difficultySelect.value;
        if (difficulty === 'easy') {
            // Show positions 2 and 5
            this.hints = [
                { pos: 2, letter: this.targetWord[1] },
                { pos: 5, letter: this.targetWord[4] }
            ];
        } else if (difficulty === 'medium') {
            // Show position 5
            this.hints = [
                { pos: 5, letter: this.targetWord[4] }
            ];
        }
        // Hard: no hints

        // Display hints
        this.updateHintDisplay();

        HjernespilAPI.trackStart('10');
    }

    updateHintDisplay() {
        this.hintsRow.innerHTML = '';

        // Create 5 hint slots (one for each letter position)
        for (let i = 0; i < this.wordLength; i++) {
            const hintSlot = document.createElement('div');
            hintSlot.className = 'hint-letter';

            // Find if there's a hint for this position (1-indexed in hints)
            const hint = this.hints.find(h => h.pos === i + 1);
            if (hint) {
                hintSlot.textContent = hint.letter;
            }

            this.hintsRow.appendChild(hintSlot);
        }
    }

    handleKeydown(e) {
        if (this.gameOver || !this.wordsLoaded) return;

        if (e.key === 'Enter') {
            this.handleKey('enter');
        } else if (e.key === 'Backspace') {
            this.handleKey('slet');
        } else if (DANISH_LETTERS.includes(e.key.toLowerCase())) {
            this.handleKey(e.key.toLowerCase());
        }
    }

    handleKey(key) {
        if (this.gameOver || !this.wordsLoaded) return;

        if (key === 'enter') {
            this.submitGuess();
        } else if (key === 'slet') {
            this.deleteLetter();
        } else if (this.currentTile < this.wordLength) {
            this.addLetter(key);
        }
    }

    addLetter(letter) {
        if (this.currentTile >= this.wordLength) return;

        const row = this.board.children[this.currentRow];
        const tile = row.children[this.currentTile];
        tile.textContent = letter;
        tile.classList.add('filled');

        this.currentGuess += letter;
        this.currentTile++;
    }

    deleteLetter() {
        if (this.currentTile <= 0) return;

        this.currentTile--;
        const row = this.board.children[this.currentRow];
        const tile = row.children[this.currentTile];
        tile.textContent = '';
        tile.classList.remove('filled');

        this.currentGuess = this.currentGuess.slice(0, -1);
    }

    submitGuess() {
        if (this.gameOver) return;

        if (this.currentGuess.length !== this.wordLength) {
            this.showMessage('Ordet skal være 5 bogstaver', 'error');
            return;
        }

        // Prevent multiple submissions during animation
        this.gameOver = true;

        // Check guess and reveal tiles
        const row = this.board.children[this.currentRow];
        const guess = this.currentGuess.toLowerCase();
        const target = this.targetWord.split('');
        const result = new Array(this.wordLength).fill('absent');

        // First pass: find correct letters
        for (let i = 0; i < this.wordLength; i++) {
            if (guess[i] === target[i]) {
                result[i] = 'correct';
                target[i] = null;
            }
        }

        // Second pass: find present letters
        for (let i = 0; i < this.wordLength; i++) {
            if (result[i] !== 'correct') {
                const idx = target.indexOf(guess[i]);
                if (idx !== -1) {
                    result[i] = 'present';
                    target[idx] = null;
                }
            }
        }

        // Animate tiles
        for (let i = 0; i < this.wordLength; i++) {
            setTimeout(() => {
                const tile = row.children[i];
                tile.classList.add(result[i]);
                this.updateKeyboard(guess[i], result[i]);
            }, i * 100);
        }

        setTimeout(() => {
            if (guess === this.targetWord) {
                const messages = ['Genialt!', 'Fantastisk!', 'Flot!', 'Godt gået!', 'Fint!', 'Puh!'];
                this.showMessage(messages[this.currentRow], 'success');
                // gameOver already set before animation
                HjernespilAPI.trackComplete('10');
                const points = { easy: 1, medium: 3, hard: 5 }[this.difficultySelect.value] || 3;
                HjernespilUI.showWinModal(points);
            } else if (this.currentRow >= this.maxGuesses - 1) {
                this.showMessage(`Ordet var: ${this.targetWord.toUpperCase()}`, 'error');
                // gameOver already set before animation
            } else {
                // Wrong guess but game continues - allow more guesses
                this.gameOver = false;
                this.currentRow++;
                this.currentTile = 0;
                this.currentGuess = '';
            }
        }, this.wordLength * 100 + 300);
    }

    updateKeyboard(letter, state) {
        const priority = { 'correct': 3, 'present': 2, 'absent': 1 };
        const currentState = this.keyStates[letter];

        if (!currentState || priority[state] > priority[currentState]) {
            this.keyStates[letter] = state;
            const key = this.keyboard.querySelector(`[data-key="${letter}"]`);
            if (key) {
                key.classList.remove('correct', 'present', 'absent');
                key.classList.add(state);
            }
        }
    }

    showMessage(text, type) {
        this.message.textContent = text;
        this.message.className = `message ${type}`;
    }
}

// Start game
new Ordleg();
