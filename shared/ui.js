/**
 * Hjernespil Shared UI Components
 * Injects common UI elements (feedback button, etc.) into game pages.
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
            /* Feedback Button - works on both light and dark backgrounds */
            .hjernespil-feedback-btn {
                position: absolute;
                top: 12px;
                left: 12px;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(128, 128, 128, 0.3);
                border: none;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                z-index: 100;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            .hjernespil-feedback-btn:active {
                transform: scale(0.9);
                background: rgba(128, 128, 128, 0.5);
            }

            .hjernespil-feedback-btn svg {
                width: 20px;
                height: 20px;
            }

            /* Feedback Modal Overlay */
            .hjernespil-modal-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
                z-index: 1000;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .hjernespil-modal-overlay.active {
                display: flex;
            }

            /* Feedback Modal */
            .hjernespil-modal {
                background: linear-gradient(145deg, #1e1e3f 0%, #0f0f23 100%);
                border-radius: 24px;
                padding: 24px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
                max-width: 320px;
                width: 100%;
                position: relative;
                animation: hjernespilModalPop 0.3s ease;
                font-family: 'Poppins', sans-serif;
            }

            @keyframes hjernespilModalPop {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }

            .hjernespil-modal-close {
                position: absolute;
                top: 12px;
                right: 16px;
                font-size: 1.5rem;
                color: rgba(255, 255, 255, 0.5);
                cursor: pointer;
                background: none;
                border: none;
                padding: 0;
                line-height: 1;
            }

            .hjernespil-modal-close:active {
                color: #fff;
            }

            .hjernespil-modal h3 {
                color: #fff;
                margin-bottom: 20px;
                font-size: 1.1rem;
                font-weight: 700;
            }

            /* Star Rating */
            .hjernespil-stars {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-bottom: 16px;
            }

            .hjernespil-star {
                font-size: 2rem;
                cursor: pointer;
                transition: transform 0.15s ease;
                filter: grayscale(1) opacity(0.4);
            }

            .hjernespil-star:active {
                transform: scale(1.2);
            }

            .hjernespil-star.active {
                filter: none;
            }

            .hjernespil-star.hover {
                filter: grayscale(0.5) opacity(0.7);
            }

            /* Text Input */
            .hjernespil-textarea {
                width: 100%;
                min-height: 80px;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.05);
                color: #fff;
                font-family: 'Poppins', sans-serif;
                font-size: 0.9rem;
                resize: none;
                margin-bottom: 12px;
            }

            .hjernespil-textarea::placeholder {
                color: rgba(255, 255, 255, 0.4);
            }

            .hjernespil-textarea:focus {
                outline: none;
                border-color: rgba(139, 92, 246, 0.5);
            }

            /* Nickname Input */
            .hjernespil-nickname {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.05);
                color: #fff;
                font-family: 'Poppins', sans-serif;
                font-size: 0.9rem;
                margin-bottom: 12px;
            }

            .hjernespil-nickname::placeholder {
                color: rgba(255, 255, 255, 0.4);
            }

            .hjernespil-nickname:focus {
                outline: none;
                border-color: rgba(139, 92, 246, 0.5);
            }

            /* Submit Button */
            .hjernespil-submit-btn {
                width: 100%;
                padding: 12px 24px;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                border: none;
                border-radius: 25px;
                color: white;
                font-family: 'Poppins', sans-serif;
                font-size: 0.95rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s ease, opacity 0.2s ease;
            }

            .hjernespil-submit-btn:active {
                transform: scale(0.95);
            }

            .hjernespil-submit-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            /* Success Message */
            .hjernespil-success {
                color: #22c55e;
                font-size: 0.95rem;
                font-weight: 600;
                padding: 20px;
            }

            .hjernespil-success-icon {
                font-size: 3rem;
                margin-bottom: 12px;
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

    // Create feedback button
    function createFeedbackButton() {
        const btn = document.createElement('button');
        btn.className = 'hjernespil-feedback-btn';
        btn.setAttribute('aria-label', 'Giv feedback');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <path d="M12 8v4"/>
                <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
            </svg>
        `;
        return btn;
    }

    // Create feedback modal
    function createFeedbackModal(gameNumber) {
        const overlay = document.createElement('div');
        overlay.className = 'hjernespil-modal-overlay';
        overlay.innerHTML = `
            <div class="hjernespil-modal">
                <button class="hjernespil-modal-close">×</button>
                <div class="hjernespil-modal-content">
                    <h3>Hvad synes du?</h3>
                    <div class="hjernespil-stars">
                        <span class="hjernespil-star" data-rating="1">⭐</span>
                        <span class="hjernespil-star" data-rating="2">⭐</span>
                        <span class="hjernespil-star" data-rating="3">⭐</span>
                        <span class="hjernespil-star" data-rating="4">⭐</span>
                        <span class="hjernespil-star" data-rating="5">⭐</span>
                    </div>
                    <textarea class="hjernespil-textarea" placeholder="Kommentar (valgfrit)..." maxlength="500"></textarea>
                    <input type="text" class="hjernespil-nickname" placeholder="Dit navn (valgfrit)" maxlength="20">
                    <button class="hjernespil-submit-btn" disabled>Send feedback</button>
                </div>
            </div>
        `;

        // Get elements
        const modal = overlay.querySelector('.hjernespil-modal');
        const closeBtn = overlay.querySelector('.hjernespil-modal-close');
        const content = overlay.querySelector('.hjernespil-modal-content');
        const stars = overlay.querySelectorAll('.hjernespil-star');
        const textarea = overlay.querySelector('.hjernespil-textarea');
        const submitBtn = overlay.querySelector('.hjernespil-submit-btn');

        let selectedRating = 0;

        // Close modal
        const closeModal = () => {
            overlay.classList.remove('active');
            // Reset after animation
            setTimeout(() => {
                selectedRating = 0;
                stars.forEach(s => s.classList.remove('active'));
                textarea.value = '';
                submitBtn.disabled = true;
                // Reset content if showing success
                if (content.querySelector('.hjernespil-success')) {
                    content.innerHTML = `
                        <h3>Hvad synes du?</h3>
                        <div class="hjernespil-stars">
                            <span class="hjernespil-star" data-rating="1">⭐</span>
                            <span class="hjernespil-star" data-rating="2">⭐</span>
                            <span class="hjernespil-star" data-rating="3">⭐</span>
                            <span class="hjernespil-star" data-rating="4">⭐</span>
                            <span class="hjernespil-star" data-rating="5">⭐</span>
                        </div>
                        <textarea class="hjernespil-textarea" placeholder="Kommentar (valgfrit)..." maxlength="500"></textarea>
                        <input type="text" class="hjernespil-nickname" placeholder="Dit navn (valgfrit)" maxlength="20">
                        <button class="hjernespil-submit-btn" disabled>Send feedback</button>
                    `;
                    initStarListeners();
                }
            }, 300);
        };

        closeBtn.onclick = closeModal;
        overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

        // Star rating logic
        function initStarListeners() {
            const currentStars = overlay.querySelectorAll('.hjernespil-star');
            const currentSubmitBtn = overlay.querySelector('.hjernespil-submit-btn');
            const currentTextarea = overlay.querySelector('.hjernespil-textarea');
            const currentNickname = overlay.querySelector('.hjernespil-nickname');

            currentStars.forEach(star => {
                star.onclick = () => {
                    selectedRating = parseInt(star.dataset.rating);
                    currentStars.forEach((s, i) => {
                        s.classList.toggle('active', i < selectedRating);
                    });
                    currentSubmitBtn.disabled = false;
                };

                star.onmouseenter = () => {
                    const hoverRating = parseInt(star.dataset.rating);
                    currentStars.forEach((s, i) => {
                        if (i < hoverRating && !s.classList.contains('active')) {
                            s.classList.add('hover');
                        }
                    });
                };

                star.onmouseleave = () => {
                    currentStars.forEach(s => s.classList.remove('hover'));
                };
            });

            // Submit feedback
            if (currentSubmitBtn) {
                currentSubmitBtn.onclick = async () => {
                    if (selectedRating === 0) return;

                    currentSubmitBtn.disabled = true;
                    currentSubmitBtn.textContent = 'Sender...';

                    try {
                        const result = await HjernespilAPI.submitFeedback(gameNumber, {
                            rating: selectedRating,
                            text: currentTextarea.value.trim() || null,
                            nickname: currentNickname.value.trim() || null
                        });

                        if (result.success) {
                            content.innerHTML = `
                                <div class="hjernespil-success">
                                    <div class="hjernespil-success-icon">🎉</div>
                                    Tak for din feedback!
                                </div>
                            `;
                            setTimeout(closeModal, 1500);
                        } else {
                            currentSubmitBtn.textContent = 'Prøv igen';
                            currentSubmitBtn.disabled = false;
                        }
                    } catch (error) {
                        currentSubmitBtn.textContent = 'Prøv igen';
                        currentSubmitBtn.disabled = false;
                    }
                };
            }
        }

        initStarListeners();

        return { overlay, open: () => overlay.classList.add('active') };
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

    // Initialize UI
    function init() {
        const gameNumber = getGameNumber();
        if (!gameNumber) {
            console.warn('HjernespilUI: Could not detect game number from URL');
            return;
        }

        // Find container (supports both .game-container and .container)
        const container = document.querySelector('.game-container') || document.querySelector('.container');
        if (!container) {
            console.warn('HjernespilUI: No container found');
            return;
        }

        // Inject styles
        injectStyles();

        // Create and add feedback button
        const feedbackBtn = createFeedbackButton();
        container.insertBefore(feedbackBtn, container.firstChild);

        // Create and add modal
        const { overlay, open } = createFeedbackModal(gameNumber);
        document.body.appendChild(overlay);

        // Connect button to modal
        feedbackBtn.onclick = open;

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
