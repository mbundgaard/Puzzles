class Bridges {
    constructor() {
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        this.difficultySelect = document.getElementById('difficulty');
        this.newGameBtn = document.getElementById('new-game');
        this.victoryOverlay = document.getElementById('victory');
        this.playAgainBtn = document.getElementById('play-again');

        this.cellSize = 50;
        this.islandRadius = 18;
        this.islands = [];
        this.bridges = [];
        this.selectedIsland = null;

        this.difficulties = {
            easy: { size: 5, islands: 6 },
            medium: { size: 7, islands: 10 },
            hard: { size: 9, islands: 15 }
        };

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.playAgainBtn.addEventListener('click', () => {
            this.victoryOverlay.classList.remove('show');
            this.newGame();
        });
        this.difficultySelect.addEventListener('change', () => this.newGame());

        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleClick(e.touches[0]);
        }, { passive: false });

        this.newGame();
    }

    newGame() {
        const diff = this.difficulties[this.difficultySelect.value];
        this.gridSize = diff.size;
        this.targetIslands = diff.islands;

        this.canvas.width = this.gridSize * this.cellSize;
        this.canvas.height = this.gridSize * this.cellSize;

        this.generatePuzzle();
        this.bridges = [];
        this.selectedIsland = null;
        this.render();
        HjernespilAPI.trackStart('15');
    }

    generatePuzzle() {
        let attempts = 0;
        while (attempts < 100) {
            attempts++;
            if (this.tryGeneratePuzzle()) {
                return;
            }
        }
        // Fallback to simple puzzle
        this.generateSimplePuzzle();
    }

    tryGeneratePuzzle() {
        this.islands = [];
        const solutionBridges = [];

        // Place islands randomly
        const positions = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                positions.push({ x, y });
            }
        }
        this.shuffle(positions);

        // Place first island
        const first = positions.pop();
        this.islands.push({ x: first.x, y: first.y, required: 0 });

        // Try to add more islands connected by bridges
        let placed = 1;
        let failures = 0;

        while (placed < this.targetIslands && failures < 50) {
            const fromIsland = this.islands[Math.floor(Math.random() * this.islands.length)];
            const direction = Math.floor(Math.random() * 4);
            const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
            const [dx, dy] = dirs[direction];

            // Find a valid distance
            const minDist = 2;
            const maxDist = Math.min(4, this.gridSize - 1);
            const dist = minDist + Math.floor(Math.random() * (maxDist - minDist + 1));

            const newX = fromIsland.x + dx * dist;
            const newY = fromIsland.y + dy * dist;

            if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
                failures++;
                continue;
            }

            // Check if position is free
            if (this.islands.some(i => i.x === newX && i.y === newY)) {
                failures++;
                continue;
            }

            // Check if bridge would cross existing bridge or island
            if (this.wouldCross(fromIsland.x, fromIsland.y, newX, newY, solutionBridges)) {
                failures++;
                continue;
            }

            // Add island and bridge
            const newIsland = { x: newX, y: newY, required: 0 };
            this.islands.push(newIsland);

            const bridgeCount = Math.random() < 0.3 ? 2 : 1;
            solutionBridges.push({
                from: this.islands.indexOf(fromIsland),
                to: this.islands.length - 1,
                count: bridgeCount
            });

            fromIsland.required += bridgeCount;
            newIsland.required += bridgeCount;

            placed++;
            failures = 0;
        }

        // Add some extra bridges between existing islands
        for (let i = 0; i < this.islands.length; i++) {
            for (let j = i + 1; j < this.islands.length; j++) {
                if (Math.random() > 0.3) continue;

                const a = this.islands[i];
                const b = this.islands[j];

                // Must be aligned
                if (a.x !== b.x && a.y !== b.y) continue;

                // Check for existing bridge
                if (solutionBridges.some(br =>
                    (br.from === i && br.to === j) || (br.from === j && br.to === i)
                )) continue;

                // Check crossing
                if (this.wouldCross(a.x, a.y, b.x, b.y, solutionBridges)) continue;

                // Check for islands in between
                if (this.hasIslandBetween(a, b)) continue;

                const bridgeCount = Math.random() < 0.3 ? 2 : 1;
                solutionBridges.push({ from: i, to: j, count: bridgeCount });
                a.required += bridgeCount;
                b.required += bridgeCount;
            }
        }

        // Validate: all islands should have 1-8 bridges
        if (this.islands.some(i => i.required < 1 || i.required > 8)) {
            return false;
        }

        // Check connectivity
        if (!this.isConnected(solutionBridges)) {
            return false;
        }

        return this.islands.length >= this.targetIslands * 0.7;
    }

    generateSimplePuzzle() {
        // Fallback: create a simple line of islands
        this.islands = [];
        const count = Math.min(this.targetIslands, this.gridSize);

        for (let i = 0; i < count; i++) {
            this.islands.push({
                x: i,
                y: Math.floor(this.gridSize / 2),
                required: i === 0 || i === count - 1 ? 1 : 2
            });
        }
    }

    wouldCross(x1, y1, x2, y2, existingBridges) {
        for (const bridge of existingBridges) {
            const a = this.islands[bridge.from];
            const b = this.islands[bridge.to];

            if (this.bridgesCross(x1, y1, x2, y2, a.x, a.y, b.x, b.y)) {
                return true;
            }
        }

        // Check if crosses any island (except endpoints)
        for (const island of this.islands) {
            if ((island.x === x1 && island.y === y1) || (island.x === x2 && island.y === y2)) {
                continue;
            }
            if (this.pointOnLine(island.x, island.y, x1, y1, x2, y2)) {
                return true;
            }
        }

        return false;
    }

    bridgesCross(x1, y1, x2, y2, x3, y3, x4, y4) {
        // Check if two line segments cross (not at endpoints)
        const h1 = x1 === x2; // First is vertical
        const h2 = x3 === x4; // Second is vertical

        if (h1 === h2) return false; // Parallel

        if (h1) {
            // First vertical, second horizontal
            const minX = Math.min(x3, x4);
            const maxX = Math.max(x3, x4);
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            return x1 > minX && x1 < maxX && y3 > minY && y3 < maxY;
        } else {
            // First horizontal, second vertical
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const minY = Math.min(y3, y4);
            const maxY = Math.max(y3, y4);
            return x3 > minX && x3 < maxX && y1 > minY && y1 < maxY;
        }
    }

    pointOnLine(px, py, x1, y1, x2, y2) {
        if (x1 === x2) {
            // Vertical line
            return px === x1 && py > Math.min(y1, y2) && py < Math.max(y1, y2);
        } else if (y1 === y2) {
            // Horizontal line
            return py === y1 && px > Math.min(x1, x2) && px < Math.max(x1, x2);
        }
        return false;
    }

    hasIslandBetween(a, b) {
        for (const island of this.islands) {
            if (island === a || island === b) continue;
            if (this.pointOnLine(island.x, island.y, a.x, a.y, b.x, b.y)) {
                return true;
            }
        }
        return false;
    }

    isConnected(bridgeList) {
        if (this.islands.length === 0) return true;

        const visited = new Set([0]);
        const queue = [0];

        while (queue.length > 0) {
            const current = queue.shift();
            for (const bridge of bridgeList) {
                let neighbor = -1;
                if (bridge.from === current) neighbor = bridge.to;
                if (bridge.to === current) neighbor = bridge.from;

                if (neighbor !== -1 && !visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        return visited.size === this.islands.length;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.cellSize;
        const y = (e.clientY - rect.top) / this.cellSize;

        // Find clicked island
        const clicked = this.islands.findIndex(island => {
            const dx = island.x + 0.5 - x;
            const dy = island.y + 0.5 - y;
            return Math.sqrt(dx * dx + dy * dy) < 0.5;
        });

        if (clicked === -1) {
            this.selectedIsland = null;
            this.render();
            return;
        }

        if (this.selectedIsland === null) {
            this.selectedIsland = clicked;
            this.render();
            return;
        }

        if (this.selectedIsland === clicked) {
            this.selectedIsland = null;
            this.render();
            return;
        }

        // Try to add/modify bridge
        this.toggleBridge(this.selectedIsland, clicked);
        this.selectedIsland = null;
        this.render();

        if (this.checkVictory()) {
            setTimeout(() => {
                this.victoryOverlay.classList.add('show');
                HjernespilAPI.trackComplete('15');
                HjernespilUI.showWinModal();
            }, 300);
        }
    }

    toggleBridge(from, to) {
        const a = this.islands[from];
        const b = this.islands[to];

        // Must be aligned
        if (a.x !== b.x && a.y !== b.y) return;

        // Check for islands in between
        if (this.hasIslandBetween(a, b)) return;

        // Find existing bridge
        const existingIdx = this.bridges.findIndex(br =>
            (br.from === from && br.to === to) || (br.from === to && br.to === from)
        );

        if (existingIdx !== -1) {
            const bridge = this.bridges[existingIdx];
            if (bridge.count === 1) {
                // Check if second bridge would cross
                if (!this.wouldNewBridgeCross(from, to, 2)) {
                    bridge.count = 2;
                } else {
                    this.bridges.splice(existingIdx, 1);
                }
            } else {
                this.bridges.splice(existingIdx, 1);
            }
        } else {
            // Check if new bridge would cross existing
            if (!this.wouldNewBridgeCross(from, to, 1)) {
                this.bridges.push({ from, to, count: 1 });
            }
        }
    }

    wouldNewBridgeCross(from, to, count) {
        const a = this.islands[from];
        const b = this.islands[to];

        for (const bridge of this.bridges) {
            if ((bridge.from === from && bridge.to === to) ||
                (bridge.from === to && bridge.to === from)) {
                continue;
            }

            const c = this.islands[bridge.from];
            const d = this.islands[bridge.to];

            if (this.bridgesCross(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y)) {
                return true;
            }
        }

        return false;
    }

    getBridgeCount(islandIndex) {
        let count = 0;
        for (const bridge of this.bridges) {
            if (bridge.from === islandIndex || bridge.to === islandIndex) {
                count += bridge.count;
            }
        }
        return count;
    }

    checkVictory() {
        // Check all islands have correct bridge count
        for (let i = 0; i < this.islands.length; i++) {
            if (this.getBridgeCount(i) !== this.islands[i].required) {
                return false;
            }
        }

        // Check connectivity
        return this.isConnected(this.bridges);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid dots
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.ctx.beginPath();
                this.ctx.arc(
                    x * this.cellSize + this.cellSize / 2,
                    y * this.cellSize + this.cellSize / 2,
                    2, 0, Math.PI * 2
                );
                this.ctx.fill();
            }
        }

        // Draw bridges
        for (const bridge of this.bridges) {
            const a = this.islands[bridge.from];
            const b = this.islands[bridge.to];

            const x1 = a.x * this.cellSize + this.cellSize / 2;
            const y1 = a.y * this.cellSize + this.cellSize / 2;
            const x2 = b.x * this.cellSize + this.cellSize / 2;
            const y2 = b.y * this.cellSize + this.cellSize / 2;

            this.ctx.strokeStyle = '#67e8f9';
            this.ctx.lineWidth = 3;

            if (bridge.count === 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            } else {
                // Double bridge
                const offset = 4;
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len * offset;
                const ny = dx / len * offset;

                this.ctx.beginPath();
                this.ctx.moveTo(x1 + nx, y1 + ny);
                this.ctx.lineTo(x2 + nx, y2 + ny);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(x1 - nx, y1 - ny);
                this.ctx.lineTo(x2 - nx, y2 - ny);
                this.ctx.stroke();
            }
        }

        // Draw islands
        for (let i = 0; i < this.islands.length; i++) {
            const island = this.islands[i];
            const x = island.x * this.cellSize + this.cellSize / 2;
            const y = island.y * this.cellSize + this.cellSize / 2;

            const bridgeCount = this.getBridgeCount(i);
            const isCorrect = bridgeCount === island.required;
            const isOver = bridgeCount > island.required;
            const isSelected = i === this.selectedIsland;

            // Island circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.islandRadius, 0, Math.PI * 2);

            if (isSelected) {
                this.ctx.fillStyle = '#fbbf24';
            } else if (isOver) {
                this.ctx.fillStyle = '#ef4444';
            } else if (isCorrect) {
                this.ctx.fillStyle = '#4ade80';
            } else {
                this.ctx.fillStyle = '#1e293b';
            }
            this.ctx.fill();

            this.ctx.strokeStyle = isSelected ? '#fbbf24' : 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Number
            this.ctx.fillStyle = isSelected ? '#000' : '#fff';
            this.ctx.font = 'bold 16px Poppins';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(island.required.toString(), x, y);
        }
    }
}

new Bridges();
