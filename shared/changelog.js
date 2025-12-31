// Changelog Modal - Self-contained component
// Changelog entries sorted by closedAt timestamp descending
// Each entry has data-issue attribute for easy comparison with GitHub
// Exposes HjernespilChangelog.open() for menu integration

(function() {
    'use strict';

    const STORAGE_KEY = 'changelog_last_viewed';
    const GITHUB_ISSUES_URL = 'https://github.com/mbundgaard/Puzzles/issues/';

    // Changelog entries - sorted by closedAt descending
    // Add new entries at the TOP of this array with ISO timestamp from GitHub
    const CHANGELOG_ENTRIES = [
        { issue: 42, closedAt: '2025-12-31T16:21:42Z', submitter: 'Vera', text: 'Added player name to overflow menu' },
        { issue: 40, closedAt: '2025-12-31T15:00:33Z', submitter: 'Martin', text: 'Redesigned main page with overflow menu' },
        { issue: 37, closedAt: '2025-12-31T14:30:00Z', submitter: 'Martin', text: 'Added GitHub link and submitter to changelog entries' },
        { issue: 35, closedAt: '2025-12-31T13:45:00Z', submitter: 'Martin', text: 'Added notification dot to changelog button' },
        { issue: 34, closedAt: '2025-12-31T11:27:29Z', submitter: 'Martin', text: 'Added changelog modal to main page' },
        { issue: 27, closedAt: '2025-12-31T10:51:48Z', submitter: 'Martin', text: 'Added badge system with Created/Updated dates in README' },
        { issue: 33, closedAt: '2025-12-31T10:08:37Z', submitter: 'Martin', text: 'Added language hint to feedback modal' },
        { issue: 29, closedAt: '2025-12-31T10:08:31Z', submitter: 'Martin', text: 'Removed text size limit on feedback inputs' },
        { issue: 23, closedAt: '2025-12-31T10:08:25Z', submitter: 'Martin', text: 'Hidden scrollbars in feedback modals (still scrollable)' },
        { issue: 31, closedAt: '2025-12-31T09:59:13Z', submitter: 'Sara', text: 'Improved word validation in Ordleg (no plural/definite forms)' },
        { issue: 32, closedAt: '2025-12-31T09:59:06Z', submitter: 'Sara', text: 'Fixed repeated points exploit in Ordleg' },
        { issue: 26, closedAt: '2025-12-31T09:01:03Z', submitter: 'Martin', text: 'Added Sænke Slagskibe (Battleships) game' },
        { issue: 20, closedAt: '2025-12-30T23:34:29Z', submitter: 'Martin', text: 'Added version check with auto-update' },
        { issue: 18, closedAt: '2025-12-30T22:55:15Z', submitter: 'Martin', text: 'Clarified feedback instructions in Info modal' },
        { issue: 19, closedAt: '2025-12-30T22:49:03Z', submitter: 'Martin', text: 'Removed vertical scrollbar on main page' },
        { issue: 21, closedAt: '2025-12-30T22:44:59Z', submitter: 'Martin', text: 'Fixed difficulty selection display in Rørføring' },
        { issue: 14, closedAt: '2025-12-30T13:47:32Z', submitter: 'Martin', text: 'Fixed move counter reset in Tårnet i Hanoi' },
        { issue: 11, closedAt: '2025-12-30T00:15:18Z', submitter: 'Martin', text: 'Added difficulty levels to Rørføring' },
        { issue: 9, closedAt: '2025-12-29T23:46:04Z', submitter: 'Martin', text: 'Renamed Kodeknækker to Mastermind' },
        { issue: 8, closedAt: '2025-12-29T23:41:37Z', submitter: 'Martin', text: 'Randomized AI starting position in Fire på Stribe' },
    ];

    // GitHub icon SVG
    const GITHUB_ICON = `<svg class="changelog-github-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>`;

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
            max-width: 340px;
        }

        .changelog-modal .highlight {
            color: #a855f7;
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
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
        }

        .changelog-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .changelog-github-link {
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.4);
            transition: color 0.2s ease;
        }

        .changelog-github-link:hover,
        .changelog-github-link:active {
            color: #a5b4fc;
        }

        .changelog-github-icon {
            width: 14px;
            height: 14px;
        }

        .changelog-date {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.4);
        }

        .changelog-submitter {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.5);
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
            <div class="changelog-entry" data-issue="${entry.issue}" data-closed="${entry.closedAt}">
                <div class="changelog-header">
                    <div class="changelog-left">
                        <a href="${GITHUB_ISSUES_URL}${entry.issue}" target="_blank" rel="noopener" class="changelog-github-link" title="View issue #${entry.issue}">
                            ${GITHUB_ICON}
                            <span class="changelog-date">${formatDate(entry.closedAt)}</span>
                        </a>
                    </div>
                    <span class="changelog-submitter">${entry.submitter}</span>
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
                <h3>Opdateringer i Hjerne<span class="highlight">spil</span></h3>
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
        const changelogBadge = document.getElementById('changelog-badge');
        const changelogModal = document.getElementById('changelog-modal');
        const changelogClose = document.getElementById('changelog-close');

        if (!changelogModal) return;

        // Check for unseen updates and show badge
        if (changelogBadge && hasUnseenUpdates()) {
            changelogBadge.style.display = '';
        }

        // Open modal function (exposed globally)
        function openModal() {
            changelogModal.classList.add('active');
            // Mark as viewed and hide badge
            markAsViewed();
            if (changelogBadge) {
                changelogBadge.style.display = 'none';
            }
        }

        // Close modal
        if (changelogClose) {
            changelogClose.onclick = () => {
                changelogModal.classList.remove('active');
            };
        }

        // Close on overlay click
        changelogModal.onclick = (e) => {
            if (e.target === changelogModal) {
                changelogModal.classList.remove('active');
            }
        };

        // Expose API
        window.HjernespilChangelog = {
            open: openModal,
            hasUnseenUpdates: hasUnseenUpdates
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
