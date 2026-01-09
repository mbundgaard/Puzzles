<script lang="ts">
	import { onMount } from 'svelte';
	import { language } from '$lib/i18n';
	import '../app.css';

	let { children } = $props();

	onMount(() => {
		language.init();
	});
</script>

<svelte:head>
	<title>Hjernespil</title>
</svelte:head>

<div class="app">
	{@render children()}
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>
