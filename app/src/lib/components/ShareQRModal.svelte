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

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(appUrl);
			// Could show a toast here
		} catch {
			// Fallback for older browsers
			const input = document.createElement('input');
			input.value = appUrl;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div class="overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true">
		<div class="modal">
			<button class="close-btn" onclick={onClose} aria-label={tr('leaderboard.close')}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"/>
					<line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>

			<div class="content">
				<h2>{tr('share.title')}</h2>
				<p class="subtitle">{tr('share.scanQR')}</p>

				<div class="qr-container">
					<img src={getQRCodeUrl()} alt="QR Code" class="qr-code" />
				</div>

				<div class="url-box">
					<span class="url">{appUrl}</span>
					<button class="copy-btn" onclick={copyLink} aria-label={tr('share.copy')}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
						</svg>
					</button>
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

	.close-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 50%;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.close-btn:active {
		transform: scale(0.9);
		background: rgba(255, 255, 255, 0.2);
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
		margin-bottom: 20px;
	}

	.qr-code {
		display: block;
		width: 200px;
		height: 200px;
	}

	.url-box {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 12px 16px;
	}

	.url {
		flex: 1;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.copy-btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.copy-btn:active {
		transform: scale(0.9);
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}
</style>
