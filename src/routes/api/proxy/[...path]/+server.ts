import type { RequestHandler } from '@sveltejs/kit';

async function proxyRequest(event: Parameters<RequestHandler>[0]): Promise<Response> {
	const serverUrl = event.cookies.get('azalea-server-url');
	if (!serverUrl) {
		return new Response('Azalea server URL not configured. Set it in Settings.', { status: 502 });
	}

	const path = event.params.path || '';
	const base = serverUrl.replace(/\/+$/, '');
	const proxyUrl = new URL(path, base + '/');
	proxyUrl.search = event.url.search;

	const headers = new Headers(event.request.headers);
	headers.delete('host');
	headers.delete('cookie');

	let body: BodyInit | null = null;
	if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
		body = event.request.body;
	}

	try {
		const upstreamRes = await fetch(proxyUrl.toString(), {
			method: event.request.method,
			headers,
			body,
			
			duplex: body ? 'half' : undefined
		});

		const responseHeaders = new Headers(upstreamRes.headers);
		responseHeaders.delete('transfer-encoding');
		responseHeaders.delete('content-encoding');

		return new Response(upstreamRes.body, {
			status: upstreamRes.status,
			statusText: upstreamRes.statusText,
			headers: responseHeaders
		});
	} catch (e) {
		return new Response(`Proxy error: ${e instanceof Error ? e.message : 'Unknown error'}`, {
			status: 502
		});
	}
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const HEAD = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
export const PATCH = proxyRequest;
