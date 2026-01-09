<script lang="ts">
	import { base } from '$app/paths';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		children: Snippet;
	}

	let { title, children }: Props = $props();
</script>

<div class="game-shell">
	<a href="{base}/" class="close-btn" aria-label="Tilbage">
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="18" y1="6" x2="6" y2="18"/>
			<line x1="6" y1="6" x2="18" y2="18"/>
		</svg>
	</a>

	<header>
		<h1>{title}</h1>
	</header>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.game-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px;
		position: relative;
	}

	.close-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(128, 128, 128, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		border-radius: 50%;
		color: white;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.close-btn:active {
		transform: scale(0.9);
		background: rgba(255, 255, 255, 0.2);
	}

	header {
		text-align: center;
		margin-bottom: 20px;
	}

	h1 {
		font-size: 1.8rem;
		font-weight: 800;
		background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	main {
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
