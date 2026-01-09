<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { language } from '$lib/i18n';
	import { barsHidden } from '$lib/stores/scroll';
	import BottomTabBar from '$lib/components/BottomTabBar.svelte';
	import Header from '$lib/components/Header.svelte';
	import '../app.css';

	let { children } = $props();

	// Check if we're on a game page (should hide tab bar)
	let isGamePage = $state(false);
	let isHomePage = $state(false);
	let contentEl: HTMLElement;

	// Scroll handling for hiding/showing header and footer
	let lastScrollTop = 0;
	const scrollThreshold = 10;

	page.subscribe((value) => {
		isGamePage = value.url.pathname.includes('/spil/');
		isHomePage = value.url.pathname === `${base}/` || value.url.pathname === `${base}`;
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

	onMount(() => {
		language.init();

		if (contentEl) {
			contentEl.addEventListener('scroll', handleScroll, { passive: true });
			return () => {
				contentEl.removeEventListener('scroll', handleScroll);
			};
		}
	});
</script>

<svelte:head>
	<title>Hjernespil</title>
</svelte:head>

<div class="app">
	<!-- Animated background -->
	{#if !isGamePage}
		<div class="background">
			<div class="orb orb-1"></div>
			<div class="orb orb-2"></div>
			<div class="orb orb-3"></div>
		</div>
	{/if}

	{#if isHomePage}
		<Header />
	{/if}

	<div class="content" class:has-header={isHomePage} class:has-nav={!isGamePage} bind:this={contentEl}>
		{@render children()}
	</div>

	{#if !isGamePage}
		<BottomTabBar />
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
	}

	.content.has-header {
		padding-top: 90px;
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
</style>
