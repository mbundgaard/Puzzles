// Changelog Modal - Self-contained component
// Changelog entries sorted by closedAt timestamp descending
// Each entry has data-issue attribute for easy comparison with GitHub

(function() {
    'use strict';

    const STORAGE_KEY = 'changelog_last_viewed';

    // Changelog entries - sorted by closedAt descending
    // Add new entries at the TOP of this array with ISO timestamp from GitHub
    const CHANGELOG_ENTRIES = [
        { issue: 35, closedAt: '2025-12-31T13:45:00Z', text: 'Added notification dot to changelog button' },
        { issue: 34, closedAt: '2025-12-31T11:27:29Z', text: 'Added changelog modal to main page' },
        { issue: 27, closedAt: '2025-12-31T10:51:48Z', text: 'Added badge system with Created/Updated dates in README' },
        { issue: 33, closedAt: '2025-12-31T10:08:37Z', text: 'Added language hint to feedback modal' },
        { issue: 29, closedAt: '2025-12-31T10:08:31Z', text: 'Removed text size limit on feedback inputs' },
        { issue: 23, closedAt: '2025-12-31T10:08:25Z', text: 'Hidden scrollbars in feedback modals (still scrollable)' },
        { issue: 31, closedAt: '2025-12-31T09:59:13Z', text: 'Improved word validation in Ordleg (no plural/definite forms)' },
        { issue: 32, closedAt: '2025-12-31T09:59:06Z', text: 'Fixed repeated points exploit in Ordleg' },
        { issue: 26, closedAt: '2025-12-31T09:01:03Z', text: 'Added Sænke Slagskibe (Battleships) game' },
        { issue: 20, closedAt: '2025-12-30T23:34:29Z', text: 'Added version check with auto-update' },
        { issue: 18, closedAt: '2025-12-30T22:55:15Z', text: 'Clarified feedback instructions in Info modal' },
        { issue: 19, closedAt: '2025-12-30T22:49:03Z', text: 'Removed vertical scrollbar on main page' },
        { issue: 21, closedAt: '2025-12-30T22:44:59Z', text: 'Fixed difficulty selection display in Rørføring' },
        { issue: 14, closedAt: '2025-12-30T13:47:32Z', text: 'Fixed move counter reset in Tårnet i Hanoi' },
        { issue: 11, closedAt: '2025-12-30T00:15:18Z', text: 'Added difficulty levels to Rørføring' },
        { issue: 9, closedAt: '2025-12-29T23:46:04Z', text: 'Renamed Kodeknækker to Mastermind' },
        { issue: 8, closedAt: '2025-12-29T23:41:37Z', text: 'Randomized AI starting position in Fire på Stribe' },
    ];

    // Format date from ISO timestamp
    function formatDate(isoString) {
        return new Date(isoString).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    }

    // Get newest entry's timestamp
    function getNewestTimestamp() {
        return CHANGELOG_ENTRIES.length > 0 ? CHANGELOG_ENTRIES[0].closedAt : null;
    }

    // Check if there are unseen updates
    function hasUnseenUpdates() {
        const lastViewed = localStorage.getItem(STORAGE_KEY);
        const newest = getNewestTimestamp();
        if (!newest) return false;
        if (!lastViewed) return true; // First visit, show dot
        return newest > lastViewed;
    }

    // Mark as viewed
    function markAsViewed() {
        const newest = getNewestTimestamp();
        if (newest) {
            localStorage.setItem(STORAGE_KEY, newest);
        }
    }

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

        /* Notification dot */
        #changelog-btn {
            position: relative;
        }

        #changelog-btn.has-notification::after {
            content: '';
            position: absolute;
            top: 8px;
            right: 8px;
            width: 8px;
            height: 8px;
            background: #ef4444;
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
        }
    `;
    document.head.appendChild(style);

    // Generate entries HTML
    function generateEntriesHTML() {
        return CHANGELOG_ENTRIES.map(entry => `
            <div class="changelog-entry" data-issue="${entry.issue}" data-closed="${entry.closedAt}">
                <div class="changelog-header">
                    <span class="changelog-issue">#${entry.issue}</span>
                    <span class="changelog-date">${formatDate(entry.closedAt)}</span>
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

        // Check for unseen updates and show notification dot
        if (hasUnseenUpdates()) {
            changelogBtn.classList.add('has-notification');
        }

        // Open modal
        changelogBtn.onclick = () => {
            changelogModal.classList.add('active');
            // Mark as viewed and remove notification
            markAsViewed();
            changelogBtn.classList.remove('has-notification');
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
