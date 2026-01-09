<script lang="ts">
	import { t, translate, type Translations } from '$lib/i18n';
	import { barsHidden } from '$lib/stores/scroll';

	interface Props {
		onTitleClick?: () => void;
	}

	let { onTitleClick }: Props = $props();

	let translations = $state<Translations>({});
	let hidden = $state(false);

	t.subscribe((value) => {
		translations = value;
	});

	barsHidden.subscribe((value) => {
		hidden = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	function handleTitleClick() {
		if (onTitleClick) onTitleClick();
	}
</script>

<header class="header" class:hidden>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
	<h1 class="title" onclick={handleTitleClick}>{tr('app.title')}</h1>
	<p class="subtitle">{tr('app.subtitle')}</p>
</header>

<style>
	.header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		padding: var(--header-padding-top) 20px 36px;
		padding-top: max(var(--header-padding-top), calc(env(safe-area-inset-top) + 4px));
		text-align: center;
		background: linear-gradient(to bottom, rgba(15, 15, 35, 0.98) 0%, rgba(15, 15, 35, 0.9) 70%, transparent 100%);
		z-index: 90;
		transition: transform 0.4s ease-out;
	}

	.header.hidden {
		transform: translateY(-100%);
	}

	.title {
		font-size: 2.2rem;
		font-weight: 800;
		background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #d946ef 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 8px 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.subtitle {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.95rem;
		margin: 0;
	}
</style>
