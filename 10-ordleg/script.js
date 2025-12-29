// Danish 5-letter words
const WORDS = [
    'abort', 'adler', 'alder', 'andre', 'angst', 'antal', 'april', 'armen',
    'bager', 'banen', 'basis', 'bedre', 'befri', 'begge', 'begiv', 'behov',
    'beløb', 'betal', 'bevæg', 'bidra', 'bilen', 'bingo', 'bitre', 'blade',
    'blank', 'blege', 'blidt', 'blind', 'blitz', 'blokk', 'blund', 'blues',
    'blyge', 'bogus', 'bolig', 'bombe', 'bonus', 'borde', 'borne', 'bragt',
    'brand', 'brask', 'bravo', 'breve', 'briks', 'brise', 'brugt', 'bruge',
    'brysk', 'bukse', 'buler', 'bunde', 'burde', 'butik', 'bydel', 'bygge',
    'bytte', 'cello', 'celle', 'cider', 'cigar', 'cirka', 'citér', 'civil',
    'dagny', 'dalek', 'daler', 'damer', 'danne', 'dansk', 'dativ', 'debut',
    'dejli', 'delta', 'demon', 'depot', 'dette', 'diger', 'digte', 'disco',
    'ditto', 'dogme', 'doven', 'draht', 'dragt', 'drama', 'dreng', 'drift',
    'drink', 'droit', 'dræbe', 'drøft', 'dufte', 'dulgt', 'dumme', 'dunke',
    'dvale', 'dybde', 'dyner', 'dyret', 'efter', 'eigen', 'eksen', 'elite',
    'ellers', 'elske', 'emner', 'endog', 'enhed', 'enkel', 'enlig', 'enten',
    'essay', 'etage', 'fabel', 'facon', 'fader', 'fakta', 'falde', 'falsk',
    'fange', 'farce', 'faren', 'farve', 'fatal', 'fauna', 'favne', 'fejle',
    'femte', 'ferie', 'fiber', 'figur', 'filen', 'finke', 'firma', 'fiske',
    'fjeld', 'fjern', 'fjord', 'fjols', 'flade', 'flamm', 'flest', 'flink',
    'flirt', 'flora', 'flyde', 'flygt', 'fløde', 'fodre', 'fokus', 'folie',
    'forel', 'forme', 'forny', 'forud', 'forum', 'fotos', 'fragt', 'frank',
    'freds', 'frisk', 'frost', 'frugt', 'fugle', 'fugte', 'fulde', 'fyrre',
    'fælde', 'færge', 'gader', 'gafle', 'galge', 'gange', 'gaven', 'gerne',
    'gifte', 'gilde', 'giraf', 'givet', 'glans', 'glemt', 'globe', 'gnave',
    'gnist', 'godse', 'godte', 'gople', 'grene', 'grine', 'grisk', 'grube',
    'gryde', 'gråde', 'grøft', 'gulve', 'gummi', 'gynge', 'gæste', 'gøgle',
    'hacke', 'hadet', 'halen', 'halte', 'halve', 'hamle', 'hamre', 'hands',
    'harem', 'harme', 'harpe', 'haspe', 'haste', 'havet', 'heden', 'hegne',
    'hejse', 'hekse', 'helle', 'helst', 'hente', 'herre', 'heste', 'hidse',
    'higet', 'himle', 'hinke', 'hirse', 'hjælp', 'hobby', 'holde', 'hoppe',
    'horde', 'hotel', 'hoved', 'huffe', 'hugge', 'huler', 'humle', 'humor',
    'hunde', 'hurra', 'huske', 'hveps', 'hvide', 'hvile', 'hvori', 'hygge',
    'hykle', 'hylde', 'hyrde', 'hytte', 'hæfte', 'hælde', 'hænde', 'hærge',
    'hævde', 'højde', 'hønen', 'høres', 'høste', 'ideel', 'ideer', 'igler',
    'iltre', 'imøde', 'indre', 'indse', 'intet', 'ironi', 'items', 'ivrig',
    'jager', 'jakke', 'jamme', 'japan', 'jeans', 'jesus', 'jorde', 'joule',
    'jubel', 'juice', 'jumpe', 'junge', 'juvel', 'kabel', 'kager', 'kakao',
    'kalde', 'kamin', 'kampe', 'kanal', 'kande', 'kanin', 'kante', 'kappe',
    'kapre', 'karat', 'karma', 'karre', 'kaste', 'kedel', 'kegle', 'kende',
    'kerne', 'kikke', 'kilde', 'klage', 'klang', 'klaps', 'klare', 'klase',
    'klemm', 'klemt', 'klint', 'kloak', 'klods', 'klone', 'kløer', 'kløft',
    'knage', 'knald', 'knibe', 'knirk', 'knive', 'knold', 'knude', 'knuge',
    'koble', 'koger', 'kogge', 'kogle', 'kokes', 'kolik', 'komet', 'komme',
    'konto', 'konus', 'koral', 'koste', 'kraft', 'krans', 'krebs', 'kridt',
    'krise', 'krone', 'krudt', 'kruse', 'kudsk', 'kugle', 'kulde', 'kumme',
    'kunde', 'kunne', 'kunst', 'kupon', 'kurre', 'kurve', 'kvaje', 'kvart',
    'kvide', 'kvikt', 'kvote', 'kysse', 'kæmpe', 'kærte', 'køber', 'kølig',
    'køres', 'ladet', 'lager', 'lagre', 'lampe', 'lange', 'laser', 'lavet',
    'leder', 'ledet', 'legat', 'lejre', 'lemme', 'lette', 'lever', 'lidet',
    'ligne', 'lilje', 'limit', 'linde', 'liner', 'linje', 'liste', 'liter',
    'livet', 'lodge', 'logik', 'lomme', 'loppe', 'lotto', 'lover', 'lufte',
    'lunde', 'lunge', 'lunte', 'lygte', 'lykke', 'lynet', 'lyrik', 'lyske',
    'lyste', 'lytte', 'læber', 'læder', 'læger', 'lægte', 'lække', 'længe',
    'lærke', 'læser', 'løfte', 'løjer', 'lønne', 'løser', 'mafia', 'mager',
    'magte', 'major', 'malke', 'mange', 'mappe', 'march', 'marin', 'maske',
    'masse', 'matte', 'medal', 'medie', 'mejse', 'melde', 'melon', 'mener',
    'messe', 'metal', 'meter', 'micro', 'midja', 'midte', 'milde', 'minut',
    'miste', 'model', 'moden', 'modig', 'modul', 'mogul', 'mokka', 'ommer',
    'moral', 'morde', 'motor', 'motto', 'mudre', 'multi', 'mumle', 'murer',
    'musik', 'mynte', 'mødet', 'mødes', 'mølle', 'mønst', 'mørke', 'måned',
    'måtte', 'nabel', 'nagle', 'naive', 'nakke', 'narre', 'natur', 'navle',
    'negle', 'neste', 'netto', 'niece', 'nippe', 'nitte', 'niveau', 'nodal',
    'nogen', 'noget', 'nogle', 'norme', 'notar', 'noter', 'nudge', 'nuppe',
    'nyder', 'nytår', 'nøgen', 'nøgle', 'nåede', 'ocean', 'odder', 'offer',
    'okker', 'oktan', 'olive', 'oncle', 'opera', 'optog', 'orden', 'orgel',
    'orgie', 'orkid', 'otter', 'ovale', 'palet', 'palme', 'panda', 'pande',
    'panel', 'panik', 'parat', 'parti', 'parts', 'passe', 'pasta', 'pedal',
    'pejle', 'pelse', 'penge', 'perle', 'petit', 'piano', 'pigen', 'pikke',
    'pille', 'pilot', 'pinde', 'pines', 'pinse', 'pirat', 'piske', 'pivot',
    'pixel', 'pizza', 'pjece', 'plade', 'plads', 'plane', 'plast', 'pleje',
    'pligt', 'plump', 'plums', 'polar', 'polet', 'polsk', 'porer', 'poste',
    'potts', 'prale', 'prent', 'prile', 'prins', 'prisme', 'prøve', 'pulje',
    'punkt', 'puppe', 'purer', 'pusle', 'puste', 'putte', 'pynte', 'pælen',
    'pølse', 'påske', 'rager', 'rails', 'ramle', 'ramme', 'rampe', 'ranke',
    'rappe', 'rasle', 'raste', 'ratio', 'reale', 'regel', 'regne', 'rejse',
    'rense', 'rente', 'repos', 'revne', 'ribbe', 'ridse', 'rigel', 'rille',
    'rinds', 'ringe', 'risen', 'rival', 'rodet', 'rodne', 'rolle', 'roman',
    'rombe', 'roser', 'rosin', 'rough', 'route', 'rubin', 'rugge', 'rugte',
    'ruine', 'rulle', 'rumle', 'runde', 'runge', 'ruske', 'russe', 'ruste',
    'rydde', 'ryger', 'rygte', 'rykke', 'rynke', 'ryste', 'ræven', 'rødme',
    'røget', 'røgte', 'røres', 'råden', 'sabel', 'safir', 'sagte', 'sakse',
    'salat', 'saldo', 'salme', 'salon', 'salte', 'salve', 'samba', 'samle',
    'samme', 'sande', 'sange', 'sanse', 'satan', 'sauce', 'scene', 'segle',
    'sejle', 'sekst', 'seler', 'sende', 'serie', 'serve', 'serum', 'sexet',
    'shore', 'sidde', 'sider', 'siede', 'sigte', 'sikre', 'silke', 'simre',
    'sinke', 'sirup', 'sjusk', 'skabe', 'skade', 'skaft', 'skala', 'skalk',
    'skank', 'skare', 'skarp', 'skema', 'skibe', 'skide', 'skifte', 'skilt',
    'skind', 'skive', 'skjul', 'skole', 'skove', 'skrab', 'skrig', 'skrin',
    'skrue', 'skruk', 'skræk', 'skråt', 'skudt', 'skuet', 'skunk', 'skyde',
    'skyer', 'skylde', 'slags', 'slank', 'slave', 'slibe', 'slide', 'slippe',
    'sluge', 'slukke', 'slumre', 'smadr', 'smage', 'smask', 'smelts', 'smide',
    'smile', 'smuds', 'smule', 'smyge', 'snack', 'snarr', 'snavs', 'snige',
    'snore', 'sober', 'sofa', 'solid', 'solve', 'sonde', 'sorge', 'sorte',
    'spare', 'spand', 'spids', 'spild', 'spil', 'spion', 'spire', 'splid',
    'sport', 'spray', 'spænd', 'spøge', 'stald', 'stamm', 'stand', 'stang',
    'start', 'stave', 'stedt', 'stege', 'stegt', 'stemm', 'stene', 'stift',
    'stigs', 'stikk', 'stile', 'stive', 'stjal', 'stock', 'stole', 'stolpe',
    'storm', 'stovte', 'straf', 'stram', 'streg', 'streng', 'strid', 'strik',
    'strip', 'strøm', 'stubbe', 'stude', 'stuen', 'stump', 'stund', 'stunt',
    'style', 'styrt', 'stærk', 'støbe', 'støde', 'støje', 'støtte', 'succes',
    'suger', 'suite', 'sukke', 'summe', 'super', 'suppe', 'surfe', 'surge',
    'svagt', 'svale', 'svamp', 'svane', 'svare', 'svedt', 'svigt', 'sving',
    'svømme', 'sylte', 'synge', 'synke', 'syrer', 'sæben', 'sælge', 'sænke',
    'sæson', 'sætte', 'søger', 'sømme', 'sønne', 'søren', 'søvne', 'tabel',
    'taber', 'tabt', 'tacos', 'tager', 'takke', 'takte', 'talent', 'taler',
    'talte', 'tamme', 'tands', 'tanke', 'tante', 'tapre', 'taske', 'taste',
    'teint', 'tekst', 'telte', 'temme', 'tempo', 'teori', 'terps', 'teste',
    'tiger', 'tigge', 'tikke', 'tilde', 'timer', 'tindr', 'tinge', 'tisse',
    'titel', 'tjald', 'tjene', 'toast', 'toget', 'tolke', 'tomme', 'toner',
    'toppe', 'torne', 'total', 'totem', 'totur', 'trafik', 'trappe', 'trend',
    'trist', 'trone', 'tropp', 'trues', 'trumf', 'trunk', 'trust', 'trykke',
    'træde', 'træer', 'træet', 'træls', 'træne', 'tråde', 'tuber', 'tuder',
    'tulip', 'tumle', 'tuner', 'tunge', 'tunis', 'turde', 'tusch', 'tusind',
    'tvang', 'tvivl', 'tyded', 'tyder', 'tynde', 'typer', 'typis', 'tyrke',
    'tyske', 'tælle', 'tænde', 'tænke', 'tærsk', 'tømme', 'tørke', 'tørre',
    'tårne', 'udart', 'udbed', 'udbud', 'udelt', 'udfør', 'udgav', 'udkom',
    'udlæg', 'udnyt', 'udret', 'udsat', 'udsyn', 'udøve', 'ufine', 'ugift',
    'ugler', 'uheld', 'uklar', 'ultra', 'under', 'ungen', 'unger', 'union',
    'units', 'urent', 'urter', 'usagt', 'usund', 'uvant', 'uvejr', 'uvorn',
    'vabel', 'vaden', 'vafle', 'vager', 'vagle', 'vagts', 'vakle', 'valen',
    'valid', 'valse', 'vandt', 'vaner', 'vange', 'vante', 'varme', 'varte',
    'vasal', 'vaske', 'vejen', 'vende', 'vendt', 'venne', 'verfe', 'verse',
    'viber', 'video', 'vifte', 'viger', 'vikar', 'vikle', 'vilde', 'vilje',
    'villa', 'vildt', 'vimse', 'vinde', 'vinyl', 'vippe', 'virke', 'virus',
    'visen', 'viser', 'visir', 'visse', 'vist', 'vital', 'vivat', 'vodka',
    'vogte', 'volde', 'volte', 'vover', 'vragt', 'vrede', 'vride', 'vrøvl',
    'vulst', 'vække', 'vægte', 'vælde', 'vælge', 'vælte', 'værdi', 'værge',
    'værne', 'værst', 'væsen', 'væske', 'vøffe', 'yacht', 'ydede', 'ydere',
    'yding', 'ydmyg', 'yogis', 'zebra', 'zoner', 'zoome', 'åbent', 'åbner',
    'ånder', 'årets', 'årlig'
];

// Valid Danish letters
const DANISH_LETTERS = 'abcdefghijklmnopqrstuvwxyzæøå';

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
        this.revealedPositions = []; // Positions that are pre-revealed as hints

        this.board = document.getElementById('board');
        this.keyboard = document.getElementById('keyboard');
        this.message = document.getElementById('message');
        this.newGameBtn = document.getElementById('new-game');
        this.difficultySelect = document.getElementById('difficulty');
        this.guessBtn = document.getElementById('guess-btn');
        this.hintsRow = document.getElementById('hints-row');

        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.difficultySelect.addEventListener('change', () => this.newGame());
        this.guessBtn.addEventListener('click', () => this.submitGuess());
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        this.createBoard();
        this.createKeyboard();
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
        this.targetWord = WORDS[Math.floor(Math.random() * WORDS.length)].toLowerCase();
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
        if (this.gameOver) return;

        if (e.key === 'Enter') {
            this.handleKey('enter');
        } else if (e.key === 'Backspace') {
            this.handleKey('slet');
        } else if (DANISH_LETTERS.includes(e.key.toLowerCase())) {
            this.handleKey(e.key.toLowerCase());
        }
    }

    handleKey(key) {
        if (this.gameOver) return;

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
        if (this.currentGuess.length !== this.wordLength) {
            this.showMessage('Ordet skal være 5 bogstaver', 'error');
            return;
        }

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
                this.gameOver = true;
                HjernespilAPI.trackComplete('10');
                HjernespilUI.showWinModal();
            } else if (this.currentRow >= this.maxGuesses - 1) {
                this.showMessage(`Ordet var: ${this.targetWord.toUpperCase()}`, 'error');
                this.gameOver = true;
            } else {
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
