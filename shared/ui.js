/**
 * Hjernespil Shared UI Components
 * Provides win modal for game pages.
 * Include after api.js: <script src="../shared/ui.js"></script>
 */

const HjernespilUI = (() => {
    // Detect game number from URL path
    function getGameNumber() {
        const match = window.location.pathname.match(/\/(\d{2})-/);
        return match ? match[1] : null;
    }

    // Inject CSS styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes hjernespilModalPop {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }

            /* Win Modal */
            .hjernespil-win-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 1000;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .hjernespil-win-overlay.active {
                display: flex;
            }

            .hjernespil-win-modal {
                background: linear-gradient(145deg, #1e1e3f 0%, #0f0f23 100%);
                border-radius: 20px;
                padding: 25px;
                max-width: 350px;
                width: 100%;
                text-align: center;
                animation: hjernespilModalPop 0.3s ease;
                font-family: 'Poppins', sans-serif;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .hjernespil-win-modal h2 {
                font-size: 1.8rem;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 5px;
            }

            .hjernespil-win-points {
                font-size: 1.5rem;
                font-weight: 700;
                color: #fbbf24;
                margin-bottom: 5px;
            }

            .hjernespil-win-message {
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 20px;
            }

            .hjernespil-nickname-section {
                margin-bottom: 20px;
            }

            .hjernespil-nickname-section label {
                display: block;
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 8px;
            }

            .hjernespil-nickname-section input {
                width: 100%;
                padding: 12px 15px;
                font-size: 1rem;
                font-family: 'Poppins', sans-serif;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                color: white;
                margin-bottom: 10px;
            }

            .hjernespil-nickname-section input:focus {
                outline: none;
                border-color: #22c55e;
            }

            .hjernespil-nickname-section input::placeholder {
                color: rgba(255, 255, 255, 0.4);
            }

            .hjernespil-nickname-section .hjernespil-win-btn {
                width: 100%;
            }

            .hjernespil-nickname-section.submitted {
                display: none;
            }

            .hjernespil-win-btn {
                padding: 12px 30px;
                font-size: 1rem;
                font-weight: 600;
                font-family: 'Poppins', sans-serif;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: white;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .hjernespil-win-btn:active {
                transform: scale(0.95);
            }

            .hjernespil-win-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

        `;
        document.head.appendChild(style);
    }

    // Win modal state
    let winModal = null;
    let winModalGameNumber = null;
    let winModalPoints = 1;

    // Create win modal
    function createWinModal(gameNumber) {
        const overlay = document.createElement('div');
        overlay.className = 'hjernespil-win-overlay';
        overlay.innerHTML = `
            <div class="hjernespil-win-modal">
                <h2>Tillykke!</h2>
                <p class="hjernespil-win-points"></p>
                <p class="hjernespil-win-message">Du klarede det!</p>

                <div class="hjernespil-nickname-section">
                    <label>Dit navn til ranglisten:</label>
                    <input type="text" class="hjernespil-win-nickname" placeholder="Indtast navn" maxlength="20">
                    <button class="hjernespil-win-btn hjernespil-submit-score">Gem Score</button>
                </div>
            </div>
        `;

        const nicknameInput = overlay.querySelector('.hjernespil-win-nickname');
        const submitBtn = overlay.querySelector('.hjernespil-submit-score');
        const pointsDisplay = overlay.querySelector('.hjernespil-win-points');

        // Pre-fill nickname
        const savedNickname = HjernespilAPI.getNickname();
        if (savedNickname) {
            nicknameInput.value = savedNickname;
        }

        // Submit score
        submitBtn.onclick = async () => {
            const nickname = nicknameInput.value.trim();

            if (!HjernespilAPI.isValidNickname(nickname)) {
                alert('Navnet skal være 2-20 tegn');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Gemmer...';

            HjernespilAPI.setNickname(nickname);
            const result = await HjernespilAPI.recordWin(gameNumber, nickname, winModalPoints);

            if (result.success) {
                overlay.classList.remove('active');
            } else {
                alert(result.error || 'Kunne ikke gemme score');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Gem Score';
            }
        };

        document.body.appendChild(overlay);

        return {
            overlay,
            pointsDisplay,
            nicknameInput,
            submitBtn,
            open: (points) => {
                // Update points display
                winModalPoints = points;
                pointsDisplay.textContent = `+${points} point`;

                // Reset state
                const savedName = HjernespilAPI.getNickname();
                if (savedName) {
                    nicknameInput.value = savedName;
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Gem Score';
                overlay.classList.add('active');
            }
        };
    }

    // Show win modal (public API)
    // @param {number} points - Points awarded (1-5), defaults to 1
    // @param {string} [gameNumberOverride] - Optional game number override
    function showWinModal(points = 1, gameNumberOverride = null) {
        const gameNumber = gameNumberOverride || getGameNumber();
        if (!gameNumber) {
            console.warn('HjernespilUI: Could not detect game number');
            return;
        }

        // Create modal if needed (or if game number changed)
        if (!winModal || winModalGameNumber !== gameNumber) {
            if (winModal) {
                winModal.overlay.remove();
            }
            winModal = createWinModal(gameNumber);
            winModalGameNumber = gameNumber;
        }

        winModal.open(points);
    }

    // Initialize UI (injects styles for win modal)
    function init() {
        const gameNumber = getGameNumber();
        if (!gameNumber) {
            console.warn('HjernespilUI: Could not detect game number from URL');
            return;
        }

        // Inject styles for win modal
        injectStyles();

        console.log(`HjernespilUI initialized for game ${gameNumber}`);
    }

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init,
        getGameNumber,
        showWinModal
    };
})();
