// Changelog Modal - Self-contained component
// Changelog entries sorted by close time descending
// Each entry has data-issue attribute for easy comparison with GitHub

(function() {
    'use strict';

    // Changelog entries - sorted by close time descending
    // Add new entries at the TOP of this array
    const CHANGELOG_ENTRIES = [
        { issue: 34, date: 'Dec 31', text: 'Added changelog modal to main page' },
        { issue: 27, date: 'Dec 31', text: 'Added badge system with Created/Updated dates in README' },
        { issue: 33, date: 'Dec 31', text: 'Added language hint to feedback modal' },
        { issue: 29, date: 'Dec 31', text: 'Removed text size limit on feedback inputs' },
        { issue: 23, date: 'Dec 31', text: 'Hidden scrollbars in feedback modals (still scrollable)' },
        { issue: 31, date: 'Dec 31', text: 'Improved word validation in Ordleg (no plural/definite forms)' },
        { issue: 32, date: 'Dec 31', text: 'Fixed repeated points exploit in Ordleg' },
        { issue: 26, date: 'Dec 31', text: 'Added Sænke Slagskibe (Battleships) game' },
        { issue: 20, date: 'Dec 30', text: 'Added version check with auto-update' },
        { issue: 18, date: 'Dec 30', text: 'Clarified feedback instructions in Info modal' },
        { issue: 19, date: 'Dec 30', text: 'Removed vertical scrollbar on main page' },
        { issue: 21, date: 'Dec 30', text: 'Fixed difficulty selection display in Rørføring' },
        { issue: 14, date: 'Dec 30', text: 'Fixed move counter reset in Tårnet i Hanoi' },
        { issue: 11, date: 'Dec 30', text: 'Added difficulty levels to Rørføring' },
        { issue: 9, date: 'Dec 29', text: 'Renamed Kodeknækker to Mastermind' },
        { issue: 8, date: 'Dec 29', text: 'Randomized AI starting position in Fire på Stribe' },
    ];

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        .changelog-modal {
            max-width: 360px;
        }

        .changelog-list {
            text-align: left;
            margin-top: 16px;
            max-height: 400px;
            overflow-y: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .changelog-list::-webkit-scrollbar {
            display: none;
        }

        .changelog-entry {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            background: rgba(255, 255, 255, 0.05);
        }

        .changelog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .changelog-issue {
            font-size: 0.75rem;
            font-weight: 600;
            color: #a5b4fc;
            background: rgba(165, 180, 252, 0.15);
            padding: 2px 8px;
            border-radius: 10px;
        }

        .changelog-date {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.4);
        }

        .changelog-text {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.4;
            margin: 0;
        }
    `;
    document.head.appendChild(style);

    // Generate entries HTML
    function generateEntriesHTML() {
        return CHANGELOG_ENTRIES.map(entry => `
            <div class="changelog-entry" data-issue="${entry.issue}">
                <div class="changelog-header">
                    <span class="changelog-issue">#${entry.issue}</span>
                    <span class="changelog-date">${entry.date}</span>
                </div>
                <p class="changelog-text">${entry.text}</p>
            </div>
        `).join('');
    }

    // Inject modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="changelog-modal">
            <div class="modal changelog-modal">
                <span class="modal-close" id="changelog-close">×</span>
                <div class="modal-emoji">📋</div>
                <h3>What's New</h3>
                <div class="changelog-list">
                    ${generateEntriesHTML()}
                </div>
            </div>
        </div>
    `;

    // Wait for DOM ready
    function init() {
        // Insert modal before closing body tag
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get elements
        const changelogBtn = document.getElementById('changelog-btn');
        const changelogModal = document.getElementById('changelog-modal');
        const changelogClose = document.getElementById('changelog-close');

        if (!changelogBtn || !changelogModal) return;

        // Open modal
        changelogBtn.onclick = () => {
            changelogModal.classList.add('active');
        };

        // Close modal
        changelogClose.onclick = () => {
            changelogModal.classList.remove('active');
        };

        // Close on overlay click
        changelogModal.onclick = (e) => {
            if (e.target === changelogModal) {
                changelogModal.classList.remove('active');
            }
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
