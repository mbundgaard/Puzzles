class TowerOfHanoi {
    constructor() {
        this.numDisks = 4;
        this.pegs = [[], [], []];
        this.moves = 0;
        this.selectedPeg = null;
        this.gameWon = false;

        this.movesEl = document.getElementById('moves');
        this.minimumEl = document.getElementById('minimum');
        this.newGameBtn = document.getElementById('new-game');
        this.pegElements = document.querySelectorAll('.peg');
        this.diskButtons = document.querySelectorAll('.disk-btn');

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());

        // Disk count selector
        this.diskButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.diskButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.numDisks = parseInt(btn.dataset.disks);
                this.newGame();
            });
        });

        // Peg click handlers
        this.pegElements.forEach(peg => {
            peg.addEventListener('click', () => {
                if (this.gameWon) return;
                const pegIndex = parseInt(peg.dataset.peg);
                this.handlePegClick(pegIndex);
            });
        });

        this.newGame();
    }

    newGame() {
        // Reset state
        this.pegs = [[], [], []];
        this.moves = 0;
        this.selectedPeg = null;
        this.gameWon = false;

        // Initialize disks on first peg (largest to smallest)
        for (let i = this.numDisks; i >= 1; i--) {
            this.pegs[0].push(i);
        }

        // Update minimum moves display (2^n - 1)
        const minMoves = Math.pow(2, this.numDisks) - 1;
        this.minimumEl.textContent = minMoves;

        this.updateDisplay();
        this.clearSelection();

        HjernespilAPI.trackStart('22');
    }

    handlePegClick(pegIndex) {
        if (this.selectedPeg === null) {
            // Select peg if it has disks
            if (this.pegs[pegIndex].length > 0) {
                this.selectedPeg = pegIndex;
                this.updateSelection();
            }
        } else if (this.selectedPeg === pegIndex) {
            // Deselect if clicking same peg
            this.clearSelection();
        } else {
            // Try to move disk
            this.tryMove(this.selectedPeg, pegIndex);
        }
    }

    tryMove(fromPeg, toPeg) {
        const fromStack = this.pegs[fromPeg];
        const toStack = this.pegs[toPeg];

        if (fromStack.length === 0) {
            this.clearSelection();
            return;
        }

        const disk = fromStack[fromStack.length - 1];
        const topDisk = toStack.length > 0 ? toStack[toStack.length - 1] : Infinity;

        if (disk < topDisk) {
            // Valid move
            fromStack.pop();
            toStack.push(disk);
            this.moves++;
            this.movesEl.textContent = this.moves;
            this.clearSelection();
            this.updateDisplay();
            this.checkWin();
        } else {
            // Invalid move - flash red
            this.showInvalidMove(toPeg);
        }
    }

    showInvalidMove(pegIndex) {
        const peg = this.pegElements[pegIndex];
        peg.classList.add('invalid-target');
        setTimeout(() => {
            peg.classList.remove('invalid-target');
        }, 300);
    }

    updateSelection() {
        this.pegElements.forEach((peg, index) => {
            peg.classList.remove('selected', 'valid-target');

            if (index === this.selectedPeg) {
                peg.classList.add('selected');
                // Mark top disk as selected
                const diskContainer = peg.querySelector('.disks');
                const topDisk = diskContainer.lastElementChild;
                if (topDisk) {
                    topDisk.classList.add('selected');
                }
            } else {
                // Show valid targets
                const selectedDisk = this.pegs[this.selectedPeg][this.pegs[this.selectedPeg].length - 1];
                const topDisk = this.pegs[index].length > 0
                    ? this.pegs[index][this.pegs[index].length - 1]
                    : Infinity;

                if (selectedDisk < topDisk) {
                    peg.classList.add('valid-target');
                }
            }
        });
    }

    clearSelection() {
        this.selectedPeg = null;
        this.pegElements.forEach(peg => {
            peg.classList.remove('selected', 'valid-target');
        });
        document.querySelectorAll('.disk').forEach(disk => {
            disk.classList.remove('selected');
        });
    }

    updateDisplay() {
        // Clear all peg displays
        for (let i = 0; i < 3; i++) {
            const container = document.getElementById(`peg-${i}`);
            container.innerHTML = '';

            // Add disks
            this.pegs[i].forEach(diskSize => {
                const disk = document.createElement('div');
                disk.className = `disk disk-${diskSize}`;
                container.appendChild(disk);
            });
        }
    }

    checkWin() {
        // Win if all disks are on the last peg
        if (this.pegs[2].length === this.numDisks) {
            this.gameWon = true;
            document.querySelector('.game-area').classList.add('won');

            // Calculate points based on efficiency
            const minMoves = Math.pow(2, this.numDisks) - 1;
            let points = 1;
            if (this.moves === minMoves) {
                points = 3; // Perfect solution
            } else if (this.moves <= minMoves * 1.5) {
                points = 2; // Good solution
            }

            setTimeout(() => {
                document.querySelector('.game-area').classList.remove('won');
            }, 3000);

            HjernespilAPI.trackComplete('22');
            HjernespilUI.showWinModal(points);
        }
    }
}

new TowerOfHanoi();
