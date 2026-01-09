// Maskeværk - Knitting Pattern Puzzle

const COLS = 10;
const ROWS = 6;
const API_BASE = 'https://puzzlesapi.azurewebsites.net/api';

// Colors
const COLORS = {
    L: { name: 'Lys', hex: '#f5e6d3' },
    M: { name: 'Mørk', hex: '#b35941' }
};

// Stitch types (K = knit, P = purl) combined with colors (L = light, M = dark)
const STITCHES = {
    KL: { type: 'K', color: 'L', name: 'Ret lys' },
    KM: { type: 'K', color: 'M', name: 'Ret mørk' },
    PL: { type: 'P', color: 'L', name: 'Vrang lys' },
    PM: { type: 'P', color: 'M', name: 'Vrang mørk' }
};

// Game state
let solution = [];
let playerGrid = [];
let selectedCell = null;
let selectedStitch = null;
let gameWon = false;
let isLoading = false;

// DOM elements
const boardGrid = document.getElementById('board-grid');
const recipeText = document.getElementById('recipe-text');
const pickerOptions = document.getElementById('picker-options');
const checkBtn = document.getElementById('check-btn');
const newBtn = document.getElementById('new-btn');
const messageEl = document.getElementById('message');

// SVG for stitches
function createKnitSVG(colorHex) {
    return `<svg viewBox="0 0 40 40">
        <path d="M8 12 L20 28 L32 12" stroke="${colorHex}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`;
}

function createPurlSVG(colorHex) {
    return `<svg viewBox="0 0 40 40">
        <ellipse cx="20" cy="20" rx="14" ry="8" fill="${colorHex}" opacity="0.9"/>
    </svg>`;
}

function getStitchSVG(stitchKey) {
    const stitch = STITCHES[stitchKey];
    const colorHex = COLORS[stitch.color].hex;
    return stitch.type === 'K' ? createKnitSVG(colorHex) : createPurlSVG(colorHex);
}

// Render the board
function renderBoard() {
    boardGrid.innerHTML = '';
    boardGrid.style.gridTemplateColumns = `repeat(${COLS}, 32px)`;

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('button');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            const stitch = playerGrid[row][col];
            if (stitch) {
                cell.innerHTML = getStitchSVG(stitch);
            } else {
                cell.classList.add('empty');
            }

            if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
                cell.classList.add('selected');
            }

            cell.addEventListener('click', () => selectCell(row, col));
            boardGrid.appendChild(cell);
        }
    }
}

// Render stitch picker
function renderPicker() {
    pickerOptions.innerHTML = '';

    Object.entries(STITCHES).forEach(([key, stitch]) => {
        const btn = document.createElement('button');
        btn.className = 'picker-btn';
        if (selectedStitch === key) btn.classList.add('selected');

        const preview = document.createElement('div');
        preview.className = 'stitch-preview';
        preview.innerHTML = getStitchSVG(key);

        const name = document.createElement('div');
        name.className = 'stitch-name';
        name.textContent = stitch.name;

        btn.appendChild(preview);
        btn.appendChild(name);

        btn.addEventListener('click', () => selectStitch(key));
        pickerOptions.appendChild(btn);
    });
}

// Select a cell
function selectCell(row, col) {
    if (gameWon || isLoading) return;

    // If a stitch is selected, place it
    if (selectedStitch) {
        playerGrid[row][col] = selectedStitch;
        renderBoard();
        hideMessage();
    } else {
        // Toggle cell selection
        if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
            selectedCell = null;
        } else {
            selectedCell = { row, col };
        }
        renderBoard();
    }
}

// Select a stitch type
function selectStitch(stitch) {
    if (gameWon || isLoading) return;

    if (selectedStitch === stitch) {
        selectedStitch = null;
    } else {
        selectedStitch = stitch;
    }

    // If a cell is selected, place the stitch
    if (selectedCell && selectedStitch) {
        playerGrid[selectedCell.row][selectedCell.col] = selectedStitch;
        selectedCell = null;
        renderBoard();
        hideMessage();
    }

    renderPicker();
}

// Check the solution
function checkSolution() {
    if (isLoading || solution.length === 0) return;

    let allFilled = true;
    let allCorrect = true;

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (!playerGrid[row][col]) {
                allFilled = false;
            } else if (playerGrid[row][col] !== solution[row][col]) {
                allCorrect = false;
            }
        }
    }

    if (!allFilled) {
        showMessage('Udfyld alle felter først!', 'error');
        return;
    }

    // Show correct/wrong highlighting
    const cells = boardGrid.querySelectorAll('.cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        cell.classList.remove('correct', 'wrong');
        if (playerGrid[row][col] === solution[row][col]) {
            cell.classList.add('correct');
        } else {
            cell.classList.add('wrong');
        }
    });

    if (allCorrect) {
        gameWon = true;
        showMessage('Perfekt! Mønsteret er korrekt!', 'success');
        HjernespilAPI.trackComplete('29');
        HjernespilUI.showWinModal(3);
    } else {
        const wrongCount = countWrong();
        showMessage(`${wrongCount} forkerte masker. Prøv igen!`, 'error');
    }
}

function countWrong() {
    let count = 0;
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (playerGrid[row][col] && playerGrid[row][col] !== solution[row][col]) {
                count++;
            }
        }
    }
    return count;
}

// Show/hide messages
function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `message show ${type}`;
}

function hideMessage() {
    messageEl.className = 'message';
}

// Fetch pattern from AI API
async function fetchAIPattern() {
    const response = await fetch(`${API_BASE}/game/29/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Validate response
    if (!data.name || !data.recipe || !data.solution) {
        throw new Error('Invalid response format');
    }

    if (data.solution.length !== ROWS) {
        throw new Error('Invalid row count');
    }

    for (let row = 0; row < ROWS; row++) {
        if (data.solution[row].length !== COLS) {
            throw new Error('Invalid column count');
        }
    }

    return data;
}

// Generate a new pattern
async function newGame() {
    if (isLoading) return;

    isLoading = true;
    newBtn.disabled = true;
    checkBtn.disabled = true;
    recipeText.innerHTML = '<em>Genererer mønster...</em>';

    // Reset player grid
    playerGrid = [];
    for (let row = 0; row < ROWS; row++) {
        playerGrid[row] = [];
        for (let col = 0; col < COLS; col++) {
            playerGrid[row][col] = null;
        }
    }

    // Reset state
    selectedCell = null;
    selectedStitch = null;
    gameWon = false;
    solution = [];
    hideMessage();
    renderBoard();
    renderPicker();

    try {
        const pattern = await fetchAIPattern();

        // Set solution
        solution = pattern.solution;

        // Update UI
        recipeText.innerHTML = `<strong>${pattern.name}:</strong> ${pattern.recipe}`;

        // Track start
        HjernespilAPI.trackStart('29');
    } catch (error) {
        console.error('Failed to fetch pattern:', error);
        recipeText.innerHTML = '<em>Kunne ikke hente mønster. Prøv igen.</em>';
        showMessage('Fejl ved hentning af mønster', 'error');
    }

    isLoading = false;
    newBtn.disabled = false;
    checkBtn.disabled = false;
}

// Initialize
checkBtn.addEventListener('click', checkSolution);
newBtn.addEventListener('click', newGame);

newGame();
