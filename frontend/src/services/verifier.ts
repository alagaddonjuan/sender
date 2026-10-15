import { api, ApiError } from '@/lib/api';

export interface VerificationReport {
	message: string;
	details: string;
	tables: Array<{ headers: string[]; rows: string[][] }>;
}

function parseVerificationResponse(response: string): VerificationReport {
	if (!response.trim()) {
		throw new ApiError(502, 'The verifier returned an empty response.');
	}

	if (!/<(?:html|table|div|section|main)\b/i.test(response)) {
		if (/^\s*(?:ERROR:|❌\s*Error:)/i.test(response)) {
			throw new ApiError(502, response.trim());
		}
		return { message: '', details: response.trim(), tables: [] };
	}

	const document = new DOMParser().parseFromString(response, 'text/html');
	const alert = document.querySelector<HTMLElement>('.alert-danger, [role="alert"]');
	const alertMessage = alert?.textContent?.trim() ?? '';
	if (
		alert?.classList.contains('alert-danger') ||
		/^\s*(?:ERROR:|❌\s*Error:)/i.test(alertMessage)
	) {
		throw new ApiError(502, alertMessage || 'The verifier returned an error.');
	}

	const message =
		document.querySelector<HTMLElement>('.alert-success, .alert-warning')?.textContent?.trim() ??
		'';
	const tables = [...document.querySelectorAll('table')]
		.map((table) => {
			const headers = [...table.querySelectorAll('thead th')].map(
				(cell) => cell.textContent?.trim() ?? '',
			);
			const rows = [...table.querySelectorAll('tbody tr')]
				.map((row) =>
					[...row.querySelectorAll('th, td')].map((cell) => cell.textContent?.trim() ?? ''),
				)
				.filter((row) => row.some(Boolean));
			return { headers, rows };
		})
		.filter((table) => table.rows.length || table.headers.length);

	const content = document.body.cloneNode(true) as HTMLBodyElement;
	content
		.querySelectorAll('script, style, noscript, .alert, table')
		.forEach((element) => element.remove());
	const details = tables.length
		? ''
		: (content.innerText || content.textContent || '').replace(/\s+/g, ' ').trim();
	if (!message && !details && !tables.length) {
		throw new ApiError(502, 'The verifier returned an HTML page without any readable results.');
	}
	return { message, details, tables };
}

export async function verifyEmails(emailList: string): Promise<VerificationReport> {
	const form = new FormData();
	form.append('emailList', emailList);
	const response = await api<string>('/verify.php', {
		method: 'POST',
		data: form,
		responseType: 'text',
		headers: {
			'Content-Type': 'multipart/form-data',
			Accept: 'text/html, text/plain, application/json',
		},
	});
	return parseVerificationResponse(response);
}
