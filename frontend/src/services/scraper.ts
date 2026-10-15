import { api, ApiError } from '@/lib/api';

export interface ScrapeResult {
	message: string;
	emails: string[];
	scannedWebsites: number | null;
}

function parseScrapeResponse(response: string): ScrapeResult {
	if (!response.trim()) {
		throw new ApiError(502, 'The scraper returned an empty response.');
	}

	if (!/<html[\s>]/i.test(response)) {
		if (/^\s*(?:ERROR:|❌\s*Error:)/i.test(response)) {
			throw new ApiError(502, response.trim());
		}
		const emails = response
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);
		return { message: 'Scrape results received.', emails, scannedWebsites: null };
	}

	const document = new DOMParser().parseFromString(response, 'text/html');
	const alert = document.querySelector<HTMLElement>('.alert-success, .alert-danger');
	const message = alert?.textContent?.trim() ?? '';
	if (alert?.classList.contains('alert-danger')) {
		throw new ApiError(502, message || 'The scraper returned an error.');
	}

	const emailText = document.querySelector<HTMLTextAreaElement>('textarea[readonly]')?.value ?? '';
	const emails = emailText
		.split(/\r?\n/)
		.map((email) => email.trim())
		.filter(Boolean);
	const scanned = message.match(/scanned\s+(\d+)\s+websites?/i);
	const extracted = document
		.querySelector('h5')
		?.textContent?.match(/extracted emails\s*\((\d+)\)/i);
	const emailCount = extracted ? Number.parseInt(extracted[1], 10) : emails.length;

	return {
		message:
			message || `Scrape complete. ${emailCount} email${emailCount === 1 ? '' : 's'} discovered.`,
		emails,
		scannedWebsites: scanned ? Number.parseInt(scanned[1], 10) : null,
	};
}

export async function scrapeLeads(keywords: string): Promise<ScrapeResult> {
	const form = new FormData();
	form.append('keywords', keywords);
	const response = await api<string>('/scraper.php', {
		method: 'POST',
		data: form,
		responseType: 'text',
		headers: { 'Content-Type': 'multipart/form-data', Accept: 'text/html, text/plain' },
	});
	return parseScrapeResponse(response);
}
