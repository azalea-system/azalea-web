import type { RequestHandler } from './$types';
import puppeteer from 'puppeteer';

const CANVAS_SIZE = 600;
const BROWSER_TIMEOUT = 30_000;

let browserPromise: Promise<puppeteer.Browser> | null = null;

async function getBrowser() {
	if (!browserPromise) {
		browserPromise = puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});
	}
	return browserPromise;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const coverArtUrl = url.searchParams.get('coverArt');
	const overlay = url.searchParams.get('overlay');

	if (!coverArtUrl) {
		return new Response('Missing coverArt parameter', { status: 400 });
	}

	let browser: puppeteer.Browser | undefined;
	try {
		browser = await getBrowser();
		const page = await browser.newPage();
		await page.setViewport({ width: CANVAS_SIZE, height: CANVAS_SIZE });

		const escapedUrl = coverArtUrl.replace(/"/g, '&quot;');
		const overlayHtml = overlay ?? '<div style="margin: 0.5rem; display: flex; gap: 0.5rem; align-items: center; background-color: #000000C4; padding: 0.5rem; border-radius: 0.6rem;"><svg xmlns="http://www.w3.org/2000/svg" width="80" viewBox="0 0 576 512"><path fill="#2e76ff" d="M288 0c17.7 0 32 14.3 32 32v17.7C451.8 63.4 557.7 161 573.9 285.9c2 15.6-17.3 24.4-27.8 12.7c-14-15.6-41.3-26.6-66.1-26.6c-38.7 0-71 27.5-78.4 64.1c-1.7 8.7-8.7 15.9-17.6 15.9s-15.8-7.2-17.6-15.9C359 299.5 326.7 272 288 272s-71 27.5-78.4 64.1c-1.7 8.7-8.7 15.9-17.6 15.9s-15.8-7.2-17.6-15.9C167 299.5 134.7 272 96 272c-24.8 0-52.1 11-66.1 26.7c-10.5 11.7-29.8 2.8-27.8-12.8C18.3 161 124.2 63.4 256 49.7V32c0-17.7 14.3-32 32-32m0 304c12.3 0 23.5 4.6 32 12.2v114.3c0 45-36.5 81.4-81.4 81.4c-30.8 0-59-17.4-72.8-45l-2.3-4.7c-7.9-15.8-1.5-35 14.3-42.9s35-1.5 42.9 14.3l2.3 4.7c3 5.9 9 9.6 15.6 9.6c9.6 0 17.4-7.8 17.4-17.4V316.2c8.5-7.6 19.7-12.2 32-12.2"/></svg><span style="font-family: sans-serif; font-weight: bold; color: white; text-shadow: 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 3px 0 0 #000, -3px 0 0 #000, 0 3px 0 #000, 0 -3px 0 #000; font-size: 4rem;">Azalea</span></div>';

		await page.setContent(
			`<!DOCTYPE html>
<html>
<head><style>
* { margin: 0; padding: 0; }
body { width: ${CANVAS_SIZE}px; height: ${CANVAS_SIZE}px; overflow: hidden; position: relative; }
img { width: 100%; height: 100%; object-fit: cover; display: block; }
.overlay { position: absolute; bottom: 0; left: 0; }
</style></head>
<body>
  <img src="${escapedUrl}" />
	<div class="overlay">${overlayHtml}</div>
</body>
</html>`,
			{ waitUntil: 'load', timeout: BROWSER_TIMEOUT }
		);

		const screenshot = await page.screenshot({ type: 'jpeg', quality: 90 });
		await page.close();

		return new Response(screenshot, {
			headers: {
				'Content-Type': 'image/jpeg',
				'Cache-Control': 'public, max-age=86400'
			}
		});
	} catch {
		if (browser) {
			browser.close().catch(() => {});
			browserPromise = null;
		}
		return new Response('Failed to generate image', { status: 500 });
	}
};
