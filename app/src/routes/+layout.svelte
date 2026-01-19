<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { language } from '$lib/i18n';
	import { barsHidden } from '$lib/stores/scroll';
	import BottomTabBar from '$lib/components/BottomTabBar.svelte';
	import FeedbackPopup from '$lib/components/FeedbackPopup.svelte';
	import Header from '$lib/components/Header.svelte';
	import UpdateBanner from '$lib/components/UpdateBanner.svelte';
	import '../app.css';

	let { children } = $props();

	// Check if we're on a game page (should hide tab bar)
	let isGamePage = $state(false);
	let isHomePage = $state(false);
	let wasOnGamePage = false;
	let contentEl: HTMLElement;
	let updateBanner: UpdateBanner;

	// Pull to refresh state
	let pullStartY = 0;
	let isPulling = $state(false);
	let pullDistance = $state(0);
	let isRefreshing = $state(false);
	const PULL_THRESHOLD = 80;

	// Scroll handling for hiding/showing header and footer
	let lastScrollTop = 0;
	const scrollThreshold = 10;

	page.subscribe((value) => {
		const newIsGamePage = value.url.pathname.includes('/spil/');
		const newIsHomePage = value.url.pathname === `${base}/` || value.url.pathname === `${base}` || value.url.pathname === `${base}/index.html`;

		// Check if returning from game to home - trigger silent version check
		if (wasOnGamePage && newIsHomePage && !newIsGamePage) {
			updateBanner?.checkVersion(false); // silent, no "already updated" toast
		}

		wasOnGamePage = newIsGamePage;
		isGamePage = newIsGamePage;
		isHomePage = newIsHomePage;

		// Reset bars visibility and scroll state on navigation
		barsHidden.set(false);
		lastScrollTop = 0;
		if (contentEl) {
			contentEl.scrollTop = 0;
		}
	});

	function handleScroll() {
		if (!contentEl) return;

		const scrollTop = contentEl.scrollTop;
		const scrollDelta = scrollTop - lastScrollTop;

		// Always show when near top
		if (scrollTop < 10) {
			barsHidden.set(false);
			lastScrollTop = scrollTop;
			return;
		}

		// Only trigger after threshold to avoid jitter
		if (Math.abs(scrollDelta) > scrollThreshold) {
			if (scrollDelta > 0 && scrollTop > 60) {
				// Scrolling down - hide
				barsHidden.set(true);
			} else if (scrollDelta < 0) {
				// Scrolling up - show
				barsHidden.set(false);
			}
			lastScrollTop = scrollTop;
		}
	}

	// Pull to refresh handlers
	function handleTouchStart(e: TouchEvent) {
		if (!isHomePage || isRefreshing) return;
		if (contentEl && contentEl.scrollTop === 0) {
			pullStartY = e.touches[0].clientY;
			isPulling = true;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isPulling || isRefreshing) return;
		if (contentEl && contentEl.scrollTop > 0) {
			isPulling = false;
			pullDistance = 0;
			return;
		}

		const currentY = e.touches[0].clientY;
		const distance = currentY - pullStartY;

		if (distance > 0) {
			pullDistance = Math.min(distance, PULL_THRESHOLD * 1.5);
		}
	}

	function handleTouchEnd() {
		if (!isPulling || isRefreshing) return;
		isPulling = false;

		if (pullDistance >= PULL_THRESHOLD) {
			isRefreshing = true;
			updateBanner?.checkVersion(true).finally(() => {
				isRefreshing = false;
				pullDistance = 0;
			});
		} else {
			pullDistance = 0;
		}
	}

	onMount(() => {
		language.init();

		if (contentEl) {
			contentEl.addEventListener('scroll', handleScroll, { passive: true });
			contentEl.addEventListener('touchstart', handleTouchStart, { passive: true });
			contentEl.addEventListener('touchmove', handleTouchMove, { passive: true });
			contentEl.addEventListener('touchend', handleTouchEnd);

			return () => {
				contentEl.removeEventListener('scroll', handleScroll);
				contentEl.removeEventListener('touchstart', handleTouchStart);
				contentEl.removeEventListener('touchmove', handleTouchMove);
				contentEl.removeEventListener('touchend', handleTouchEnd);
			};
		}
	});
</script>

<svelte:head>
	<title>Hjernespil</title>
</svelte:head>

<div class="app">
	<!-- Animated background (disabled for performance) -->
	{#if !isGamePage}
		<div class="background"></div>
	{/if}

	{#if isHomePage}
		<Header />
		<!-- Pull to refresh indicator -->
		<div class="pull-indicator" class:visible={pullDistance > 0} style="transform: translateX(-50%) translateY({Math.min(pullDistance - 40, 40)}px)">
			<div class="pull-spinner" class:spinning={isRefreshing}></div>
		</div>
	{/if}

	<div class="content" class:has-header={!isGamePage} class:has-nav={!isGamePage} bind:this={contentEl}>
		{@render children()}
	</div>

	{#if !isGamePage}
		<BottomTabBar />
	{/if}

	<UpdateBanner bind:this={updateBanner} />

	{#if isHomePage}
		<FeedbackPopup />
	{/if}
</div>

<style>
	.app {
		height: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	.content {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.content::-webkit-scrollbar {
		display: none;
	}

	.content.has-header {
		padding-top: var(--header-height);
	}

	.content.has-nav {
		padding-bottom: 80px;
	}

	/* Animated background - subtle like classic app */
	.background {
		position: fixed;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
		background:
			radial-gradient(circle at 20% 80%, rgba(120, 0, 255, 0.15) 0%, transparent 50%),
			radial-gradient(circle at 80% 20%, rgba(255, 0, 150, 0.1) 0%, transparent 50%),
			radial-gradient(circle at 40% 40%, rgba(0, 200, 255, 0.08) 0%, transparent 40%);
	}

	.orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(100px);
		animation: pulse 6s ease-in-out infinite;
	}

	.orb-1 {
		width: 400px;
		height: 400px;
		background: rgba(120, 0, 255, 0.12);
		top: -150px;
		left: -150px;
	}

	.orb-2 {
		width: 300px;
		height: 300px;
		background: rgba(255, 0, 150, 0.08);
		bottom: 30%;
		right: -100px;
		animation-delay: -4s;
	}

	.orb-3 {
		width: 250px;
		height: 250px;
		background: rgba(0, 200, 255, 0.06);
		bottom: -80px;
		left: 20%;
		animation-delay: -7s;
	}

	@keyframes pulse {
		0%, 100% {
			transform: scale(1) translate(0, 0);
			opacity: 1;
		}
		50% {
			transform: scale(1.3) translate(10px, 10px);
			opacity: 0.6;
		}
	}

	/* Pull to refresh */
	.pull-indicator {
		position: fixed;
		top: 60px;
		left: 50%;
		transform: translateX(-50%) translateY(-40px);
		z-index: 95;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.pull-indicator.visible {
		opacity: 1;
	}

	.pull-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(236, 72, 153, 0.3);
		border-top-color: #ec4899;
		border-radius: 50%;
	}

	.pull-spinner.spinning {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
