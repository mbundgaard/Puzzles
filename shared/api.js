/**
 * Hjernespil API Client
 * Shared across all games for tracking and leaderboard functionality.
 */

const HjernespilAPI = (() => {
    const API_BASE = 'https://puzzlesapi.azurewebsites.net/api';
    const NICKNAME_KEY = 'hjernespil_nickname';

    // ============ Event Tracking ============

    /**
     * Track a game event (start or complete).
     * @param {string} game - Game number (e.g., "01", "02")
     * @param {string} event - Event type: "start" or "complete"
     */
    async function trackEvent(game, event) {
        try {
            await fetch(`${API_BASE}/event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game, event })
            });
        } catch (error) {
            // Silently fail - don't disrupt gameplay
        }
    }

    /**
     * Track game start. Call when game loads or new game starts.
     * @param {string} game - Game number
     */
    function trackStart(game) {
        trackEvent(game, 'start');
    }

    /**
     * Track game completion. Call when player wins/solves.
     * @param {string} game - Game number
     */
    function trackComplete(game) {
        trackEvent(game, 'complete');
    }

    // ============ Win Recording ============

    /**
     * Record a win to the leaderboard.
     * @param {string} game - Game number
     * @param {string} nickname - Player nickname (2-20 chars)
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async function recordWin(game, nickname) {
        try {
            const response = await fetch(`${API_BASE}/win`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game, nickname })
            });
            return await response.json();
        } catch (error) {
            console.warn('Failed to record win:', error);
            return { success: false, error: 'Netværksfejl' };
        }
    }

    // ============ Leaderboard ============

    /**
     * Get the leaderboard.
     * @param {string} [game] - Optional game filter (null = all games)
     * @param {number} [top=10] - Number of entries to return
     * @returns {Promise<{period: string, entries: Array, totalWinsThisMonth: number}>}
     */
    async function getLeaderboard(game = null, top = 10) {
        try {
            const params = new URLSearchParams({ top });
            if (game) params.set('game', game);

            const response = await fetch(`${API_BASE}/leaderboard?${params}`);
            return await response.json();
        } catch (error) {
            console.warn('Failed to get leaderboard:', error);
            return { entries: [], totalWinsThisMonth: 0 };
        }
    }

    // ============ Statistics ============

    /**
     * Get today's activity stats.
     * @returns {Promise<{date: string, starts: number, completions: number}>}
     */
    async function getTodayStats() {
        try {
            const response = await fetch(`${API_BASE}/today`);
            return await response.json();
        } catch (error) {
            console.warn('Failed to get today stats:', error);
            return { starts: 0, completions: 0 };
        }
    }

    /**
     * Get monthly usage stats.
     * @param {string} [game] - Optional game filter
     * @returns {Promise<{period: string, totalStarts: number, totalCompletions: number, perGame: Array}>}
     */
    async function getUsageStats(game = null) {
        try {
            const params = game ? `?game=${game}` : '';
            const response = await fetch(`${API_BASE}/usage${params}`);
            return await response.json();
        } catch (error) {
            console.warn('Failed to get usage stats:', error);
            return { totalStarts: 0, totalCompletions: 0, perGame: [] };
        }
    }

    /**
     * Get total wins this month.
     * @returns {Promise<{period: string, totalWins: number}>}
     */
    async function getStats() {
        try {
            const response = await fetch(`${API_BASE}/stats`);
            return await response.json();
        } catch (error) {
            console.warn('Failed to get stats:', error);
            return { totalWins: 0 };
        }
    }

    // ============ Feedback ============

    /**
     * Submit feedback for a game.
     * @param {string} game - Game number (e.g., "01", "02")
     * @param {Object} feedback - Feedback data
     * @param {number} feedback.rating - Rating 1-5
     * @param {string} [feedback.text] - Optional feedback text
     * @param {string} [feedback.nickname] - Optional nickname
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async function submitFeedback(game, { rating, text = null, nickname = null }) {
        try {
            const response = await fetch(`${API_BASE}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game,
                    rating,
                    text: text || undefined,
                    nickname: nickname || getNickname() || undefined
                })
            });
            return await response.json();
        } catch (error) {
            console.warn('Failed to submit feedback:', error);
            return { success: false, error: 'Netværksfejl' };
        }
    }

    // ============ Nickname Management ============

    /**
     * Get saved nickname from localStorage.
     * @returns {string|null}
     */
    function getNickname() {
        return localStorage.getItem(NICKNAME_KEY);
    }

    /**
     * Save nickname to localStorage.
     * @param {string} nickname
     */
    function setNickname(nickname) {
        localStorage.setItem(NICKNAME_KEY, nickname);
    }

    /**
     * Check if nickname is valid (2-20 characters).
     * @param {string} nickname
     * @returns {boolean}
     */
    function isValidNickname(nickname) {
        return nickname && nickname.trim().length >= 2 && nickname.trim().length <= 20;
    }

    // ============ Public API ============

    return {
        // Event tracking
        trackStart,
        trackComplete,
        trackEvent,

        // Win recording
        recordWin,

        // Feedback
        submitFeedback,

        // Leaderboard & stats
        getLeaderboard,
        getTodayStats,
        getUsageStats,
        getStats,

        // Nickname
        getNickname,
        setNickname,
        isValidNickname
    };
})();
