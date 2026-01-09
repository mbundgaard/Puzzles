<script lang="ts">
	import { t, translate, type Translations } from '$lib/i18n';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let translations = $state<Translations>({});
	t.subscribe((value) => {
		translations = value;
	});

	function tr(key: string): string {
		return translate(translations, key);
	}

	const appUrl = 'https://mbundgaard.github.io/Puzzles/app/';

	// Generate QR code URL using QR Server API
	function getQRCodeUrl(): string {
		return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}&bgcolor=1e1e3f&color=ffffff`;
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div class="overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true">
		<div class="modal">
			<div class="content">
				<h2>{tr('share.title')}</h2>
				<p class="subtitle">{tr('share.scanQR')}</p>

				<div class="qr-container">
					<img src={getQRCodeUrl()} alt="QR Code" class="qr-code" />
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal {
		background: linear-gradient(145deg, #1e1e3f 0%, #0f0f23 100%);
		border-radius: 20px;
		padding: 25px;
		max-width: 350px;
		width: 100%;
		animation: slideUp 0.3s ease;
		border: 1px solid rgba(255, 255, 255, 0.1);
		position: relative;
	}

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.content {
		text-align: center;
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		margin: 0 0 5px 0;
	}

	.subtitle {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 20px 0;
	}

	.qr-container {
		background: white;
		border-radius: 16px;
		padding: 16px;
		display: inline-block;
	}

	.qr-code {
		display: block;
		width: 200px;
		height: 200px;
	}
</style>
