import { api, ApiError } from '@/lib/api';

export interface AnalyticsPoint {
	date: string;
	sent: number;
	opens: number;
	clicks: number;
}

export interface ActivityEntry {
	timestamp: string;
	type: string;
	recipient: string;
	details: string;
}

export interface AnalyticsReport {
	emailsSent: number;
	totalOpens: number;
	openRate: number;
	totalClicks: number;
	clickToOpenRate: number;
	timeline: AnalyticsPoint[];
	recentActivity: ActivityEntry[];
	timelineNotice?: string;
}

export interface HistoryEntry {
	timestamp: string;
	status: string;
	recipient: string;
	subject: string;
}

type DataRecord = Record<string, unknown>;

function isRecord(value: unknown): value is DataRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonResponse(value: unknown): unknown | undefined {
	if (typeof value !== 'string') return value;
	if (!/^\s*[\[{]/.test(value)) return undefined;
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return undefined;
	}
}

function responseData(value: unknown): DataRecord {
	if (!isRecord(value)) {
		throw new ApiError(502, 'The backend returned an unexpected analytics response.');
	}
	if (value.success === false) {
		const message = typeof value.error === 'string' ? value.error : 'The analytics request failed.';
		throw new ApiError(502, message);
	}
	const data = isRecord(value.data) ? value.data : value;
	return data;
}

function pick(record: DataRecord, ...keys: string[]): unknown {
	for (const key of keys) {
		if (record[key] !== undefined && record[key] !== null) return record[key];
	}
	return undefined;
}

function numberValue(value: unknown, field: string, allowPercent = false): number {
	if (typeof value !== 'number' && typeof value !== 'string') {
		throw new ApiError(502, `The analytics API omitted ${field}.`);
	}
	const parsed = Number.parseFloat(
		typeof value === 'string' ? value.replace('%', '') : String(value),
	);
	if (!Number.isFinite(parsed)) {
		throw new ApiError(502, `The analytics API returned an invalid ${field}.`);
	}
	const percentValue =
		allowPercent && typeof value === 'string' && value.includes('%')
			? parsed
			: allowPercent && parsed > 0 && parsed <= 1
				? parsed * 100
				: parsed;
	return percentValue;
}

function stringValue(value: unknown, field: string, fallback = ''): string {
	if (value === undefined || value === null) return fallback;
	if (typeof value === 'string' || typeof value === 'number') return String(value);
	throw new ApiError(502, `The analytics API returned an invalid ${field}.`);
}

function listValue(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function htmlDocument(response: string, pageName: string): Document {
	if (!response.trim()) {
		throw new ApiError(502, `The backend returned an empty ${pageName} page.`);
	}
	if (!/<(?:html|body|table|main|section|div)\b/i.test(response)) {
		throw new ApiError(502, `The backend returned an unexpected ${pageName} response.`);
	}

	const document = new DOMParser().parseFromString(response, 'text/html');
	const alert = document.querySelector<HTMLElement>('.alert-danger, [role="alert"]');
	const alertText = alert?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
	if (alert?.classList.contains('alert-danger')) {
		throw new ApiError(502, alertText || `The backend could not load ${pageName}.`);
	}
	return document;
}

function tableRows(document: Document): Array<{ headers: string[]; rows: string[][] }> {
	return [...document.querySelectorAll('table')]
		.map((table) => {
			const headerCells = [...table.querySelectorAll('thead th')];
			const allRows = [...table.querySelectorAll('tr')];
			const firstRowHeaders = headerCells.length
				? []
				: [...(allRows[0]?.querySelectorAll('th') ?? [])];
			const headers = (headerCells.length ? headerCells : firstRowHeaders).map(
				(cell) => cell.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '',
			);
			const dataRows = allRows.filter(
				(row) => !row.querySelector('th') || row.querySelectorAll('td').length > 0,
			);
			const rows = dataRows
				.map((row) =>
					[...row.querySelectorAll('td, th')].map(
						(cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '',
					),
				)
				.filter((row) => row.some(Boolean));
			return { headers, rows };
		})
		.filter((table) => table.rows.length);
}

function columnIndex(headers: string[], pattern: RegExp): number {
	return headers.findIndex((header) => pattern.test(header));
}

function cell(row: string[], index: number, fallback = ''): string {
	return index >= 0 ? (row[index] ?? fallback) : fallback;
}

function parseArrayLiteral(source: string, start: number): unknown[] | null {
	let cursor = start;
	while (/\s/.test(source[cursor] ?? '')) cursor += 1;
	if (source[cursor] !== '[') return null;
	cursor += 1;
	const values: unknown[] = [];
	while (cursor < source.length) {
		while (/[\s,]/.test(source[cursor] ?? '')) cursor += 1;
		if (source[cursor] === ']') return values;
		const quote = source[cursor];
		if (quote === '"' || quote === "'") {
			cursor += 1;
			let value = '';
			while (cursor < source.length && source[cursor] !== quote) {
				if (source[cursor] === '\\' && cursor + 1 < source.length) cursor += 1;
				value += source[cursor];
				cursor += 1;
			}
			if (source[cursor] !== quote) return null;
			cursor += 1;
			values.push(value);
			continue;
		}
		const token = source.slice(cursor).match(/^(?:-?\d+(?:\.\d+)?|true|false|null)\b/i)?.[0];
		if (!token) return null;
		values.push(
			token === 'true' ? true : token === 'false' ? false : token === 'null' ? null : Number(token),
		);
		cursor += token.length;
	}
	return null;
}

function scriptTimeline(document: Document): AnalyticsPoint[] {
	for (const script of document.querySelectorAll('script:not([src])')) {
		const source = script.textContent ?? '';
		const labelsMatch = /\b(?:labels|dates|chartLabels)\s*[:=]\s*/i.exec(source);
		if (!labelsMatch) continue;
		const labels = parseArrayLiteral(source, labelsMatch.index + labelsMatch[0].length);
		if (!labels?.length) continue;

		const valuesBySeries: Partial<Record<keyof Omit<AnalyticsPoint, 'date'>, number[]>> = {};
		const datasetLabels = [...source.matchAll(/\blabel\s*:\s*(['"])(.*?)\1/gi)];
		for (const match of datasetLabels) {
			const label = match[2].toLowerCase();
			const series = /\bsent\b/.test(label)
				? 'sent'
				: /\bopens?\b|\bopened\b/.test(label)
					? 'opens'
					: /\bclicks?\b|\bclicked\b/.test(label)
						? 'clicks'
						: null;
			if (!series) continue;
			const afterLabel = (match.index ?? 0) + match[0].length;
			const nextDataMatch = /\bdata\s*:\s*/i.exec(source.slice(afterLabel));
			if (!nextDataMatch || nextDataMatch.index > 500) continue;
			const dataStart = afterLabel + nextDataMatch.index + nextDataMatch[0].length;
			const values = parseArrayLiteral(source, dataStart);
			if (values)
				valuesBySeries[series] = values.map((value) => numberValue(value, `${series} chart value`));
		}

		const variableSeries = /\b(?:const|let|var)\s+([a-z_$][\w$]*)\s*=\s*/gi;
		for (const match of source.matchAll(variableSeries)) {
			const name = match[1].toLowerCase();
			const series = /sent/.test(name)
				? 'sent'
				: /open/.test(name)
					? 'opens'
					: /click/.test(name)
						? 'clicks'
						: null;
			if (!series || valuesBySeries[series]) continue;
			const arrayStart = (match.index ?? 0) + match[0].length;
			const values = parseArrayLiteral(source, arrayStart);
			if (values)
				valuesBySeries[series] = values.map((value) => numberValue(value, `${series} chart value`));
		}

		if (!valuesBySeries.sent && !valuesBySeries.opens && !valuesBySeries.clicks) continue;
		return labels.map((label, index) => ({
			date: String(label),
			sent: valuesBySeries.sent?.[index] ?? 0,
			opens: valuesBySeries.opens?.[index] ?? 0,
			clicks: valuesBySeries.clicks?.[index] ?? 0,
		}));
	}
	return [];
}

function findMetric(document: Document, label: RegExp, allowPercent = false): number | undefined {
	const candidates = [...document.body.querySelectorAll<HTMLElement>('*')]
		.filter((element) => {
			if (element.children.length > 3) return false;
			const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
			return text.length > 0 && text.length < 70 && label.test(text);
		})
		.sort((left, right) => (left.textContent?.length ?? 0) - (right.textContent?.length ?? 0));

	for (const candidate of candidates) {
		let container: HTMLElement | null = candidate;
		for (let depth = 0; container && depth < 5; depth += 1, container = container.parentElement) {
			const text = container.textContent?.replace(/\s+/g, ' ').trim() ?? '';
			if (!text || text.length > 180 || !label.test(text)) continue;
			const values = text.match(/(?:\d[\d,]*(?:\.\d+)?\s*%?)/g) ?? [];
			const parsed = values
				.map((value) => Number.parseFloat(value.replace(/[,%]/g, '')))
				.find((value) => Number.isFinite(value));
			if (parsed !== undefined) {
				return allowPercent && parsed <= 1 && parsed > 0 && !text.includes('%')
					? parsed * 100
					: parsed;
			}
		}
	}
	return undefined;
}

type ParsedHtmlAnalytics = AnalyticsReport & { hasAggregateMetrics: boolean };

function htmlAnalytics(document: Document): ParsedHtmlAnalytics {
	const tables = tableRows(document);

	const timeline = scriptTimeline(document);
	const recentActivity: ActivityEntry[] = [];
	for (const table of tables) {
		const dateIndex = columnIndex(table.headers, /\bdate\b|\bday\b|\btime\b|\btimestamp\b/);
		const sentIndex = columnIndex(table.headers, /\bsent\b/);
		const opensIndex = columnIndex(table.headers, /\bopens?\b|\bopened\b/);
		const clicksIndex = columnIndex(table.headers, /\bclicks?\b|\bclicked\b/);
		if (
			!timeline.length &&
			dateIndex >= 0 &&
			(sentIndex >= 0 || opensIndex >= 0 || clicksIndex >= 0)
		) {
			for (const row of table.rows) {
				timeline.push({
					date: cell(row, dateIndex),
					sent: sentIndex >= 0 ? numberValue(cell(row, sentIndex), 'timeline sent count') : 0,
					opens: opensIndex >= 0 ? numberValue(cell(row, opensIndex), 'timeline open count') : 0,
					clicks:
						clicksIndex >= 0 ? numberValue(cell(row, clicksIndex), 'timeline click count') : 0,
				});
			}
			continue;
		}

		const eventIndex = columnIndex(table.headers, /\bevent\b|\btype\b|\bstatus\b/);
		const recipientIndex = columnIndex(table.headers, /\brecipient\b|\bemail\b|\buser\b/);
		if (dateIndex >= 0 && eventIndex >= 0 && recipientIndex >= 0) {
			for (const row of table.rows) {
				recentActivity.push({
					timestamp: cell(row, dateIndex),
					type: cell(row, eventIndex, 'Activity'),
					recipient: cell(row, recipientIndex, 'Unknown'),
					details: row
						.filter((_, index) => ![dateIndex, eventIndex, recipientIndex].includes(index))
						.join(' | '),
				});
			}
		}
	}

	if (!timeline.length && recentActivity.length) {
		const daily = new Map<string, AnalyticsPoint>();
		for (const event of recentActivity) {
			const parsed = new Date(event.timestamp);
			const date = Number.isNaN(parsed.getTime())
				? event.timestamp.slice(0, 10)
				: parsed.toISOString().slice(0, 10);
			const key = date || 'Unknown date';
			const point = daily.get(key) ?? { date: key, sent: 0, opens: 0, clicks: 0 };
			const type = event.type.toLowerCase();
			if (/\bsent\b|\bdeliver(?:ed|y)?\b|\bsuccess\b/.test(type)) point.sent += 1;
			else if (/\bopen(?:ed)?\b/.test(type)) point.opens += 1;
			else if (/\bclick(?:ed)?\b/.test(type)) point.clicks += 1;
			else continue;
			daily.set(key, point);
		}
		timeline.push(...daily.values());
	}

	const sumSeries = (key: keyof Omit<AnalyticsPoint, 'date'>) =>
		timeline.reduce((sum, point) => sum + point[key], 0);
	const sentMetric = findMetric(document, /emails?\s+sent|total\s+sent/i);
	const opensMetric = findMetric(document, /total\s+opens?|emails?\s+opened/i);
	const clicksMetric = findMetric(document, /total\s+clicks?|emails?\s+clicked/i);
	const emailsSent = sentMetric ?? sumSeries('sent');
	const totalOpens = opensMetric ?? sumSeries('opens');
	const totalClicks = clicksMetric ?? sumSeries('clicks');
	const openRate =
		findMetric(document, /open\s+rate/i, true) ??
		(emailsSent ? (totalOpens / emailsSent) * 100 : 0);
	const clickToOpenRate =
		findMetric(document, /click[-\s]*to[-\s]*open\s+rate/i, true) ??
		(totalOpens ? (totalClicks / totalOpens) * 100 : 0);
	const orderedTimeline = timeline.sort((a, b) => a.date.localeCompare(b.date));

	return {
		emailsSent,
		totalOpens,
		openRate,
		totalClicks,
		clickToOpenRate,
		timeline: orderedTimeline,
		recentActivity,
		timelineNotice: timeline.length
			? undefined
			: 'No daily chart data was present in the analytics page or its activity rows.',
		hasAggregateMetrics:
			sentMetric !== undefined || opensMetric !== undefined || clicksMetric !== undefined,
	};
}

function htmlHistory(document: Document): HistoryEntry[] {
	for (const table of tableRows(document)) {
		const timestampIndex = columnIndex(table.headers, /\bdate\b|\btime\b|\btimestamp\b/);
		const statusIndex = columnIndex(table.headers, /\bstatus\b|\bstate\b/);
		const recipientIndex = columnIndex(table.headers, /\brecipient\b|\bemail\b|\bto\b/);
		const subjectIndex = columnIndex(table.headers, /\bsubject\b|\bmessage\b/);
		if (timestampIndex < 0 || statusIndex < 0 || recipientIndex < 0) continue;
		return table.rows.map((row) => ({
			timestamp: cell(row, timestampIndex),
			status: cell(row, statusIndex, 'Unknown'),
			recipient: cell(row, recipientIndex, 'Unknown'),
			subject: cell(row, subjectIndex),
		}));
	}
	throw new ApiError(
		502,
		'The backend history page did not include a transmission table with date, status, and recipient columns.',
	);
}

function mapActivity(value: unknown): ActivityEntry[] {
	return listValue(value).map((item, index) => {
		if (!isRecord(item)) {
			throw new ApiError(502, `The analytics API returned an invalid activity row (${index + 1}).`);
		}
		const details = [
			pick(item, 'details', 'extra_details', 'info'),
			pick(item, 'ip_address', 'ip'),
			pick(item, 'user_agent'),
		]
			.filter(
				(detail): detail is string | number =>
					typeof detail === 'string' || typeof detail === 'number',
			)
			.map(String)
			.filter(Boolean)
			.join(' | ');
		return {
			timestamp: stringValue(
				pick(item, 'timestamp', 'time', 'created_at', 'date'),
				'activity timestamp',
			),
			type: stringValue(pick(item, 'event_type', 'type', 'status'), 'activity type', 'Activity'),
			recipient: stringValue(
				pick(item, 'recipient', 'email', 'recipient_email', 'user'),
				'activity recipient',
				'Unknown User',
			),
			details: details || stringValue(pick(item, 'subject'), 'activity details'),
		};
	});
}

function mapTimeline(value: unknown): AnalyticsPoint[] {
	return listValue(value)
		.map((item, index) => {
			if (!isRecord(item)) {
				throw new ApiError(
					502,
					`The analytics API returned an invalid timeline row (${index + 1}).`,
				);
			}
			return {
				date: stringValue(pick(item, 'date', 'day', 'timestamp'), 'timeline date'),
				sent: numberValue(
					pick(item, 'sent', 'emails_sent', 'emailsSent', 'total_sent') ?? 0,
					'timeline sent count',
				),
				opens: numberValue(
					pick(item, 'opens', 'opened', 'total_opens', 'totalOpens') ?? 0,
					'timeline open count',
				),
				clicks: numberValue(
					pick(item, 'clicks', 'total_clicks', 'totalClicks') ?? 0,
					'timeline click count',
				),
			};
		})
		.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAnalytics(): Promise<AnalyticsReport> {
	const raw = await api<unknown>('/analytics.php', {
		method: 'GET',
		responseType: 'text',
		headers: { Accept: 'text/html, application/json;q=0.9' },
	});
	const json = parseJsonResponse(raw);
	if (json === undefined) {
		const { hasAggregateMetrics, ...report } = htmlAnalytics(
			htmlDocument(String(raw), 'analytics'),
		);
		if (!hasAggregateMetrics && !report.timeline.length && !report.recentActivity.length) {
			throw new ApiError(
				502,
				'The backend analytics page did not include readable campaign metrics or timeline data.',
			);
		}
		if (!report.timeline.length) {
			report.timelineNotice = 'The analytics page did not include daily chart points.';
		}
		return report;
	}
	const payload = responseData(json);
	const analytics = isRecord(payload.analytics) ? payload.analytics : payload;
	const stats = isRecord(analytics.stats) ? analytics.stats : analytics;
	return {
		emailsSent: numberValue(
			pick(stats, 'emails_sent', 'emailsSent', 'sent', 'total_sent'),
			'emails sent',
		),
		totalOpens: numberValue(
			pick(stats, 'total_opens', 'totalOpens', 'opens', 'opened'),
			'total opens',
		),
		openRate: numberValue(pick(stats, 'open_rate', 'openRate'), 'open rate', true),
		totalClicks: numberValue(pick(stats, 'total_clicks', 'totalClicks', 'clicks'), 'total clicks'),
		clickToOpenRate: numberValue(
			pick(stats, 'click_to_open_rate', 'clickToOpenRate', 'click_to_open'),
			'click-to-open rate',
			true,
		),
		timeline: mapTimeline(pick(analytics, 'timeline', 'daily_stats', 'daily')),
		recentActivity: mapActivity(
			pick(analytics, 'recent_activity', 'recentActivity', 'activity', 'events'),
		),
	};
}

export async function getHistory(): Promise<HistoryEntry[]> {
	const raw = await api<unknown>('/history.php', {
		method: 'GET',
		responseType: 'text',
		headers: { Accept: 'text/html, application/json;q=0.9' },
	});
	const json = parseJsonResponse(raw);
	if (json === undefined) {
		if (typeof raw !== 'string')
			throw new ApiError(502, 'The backend returned an unexpected history response.');
		return htmlHistory(htmlDocument(raw, 'history'));
	}
	const payload = Array.isArray(json) ? json : responseData(json);
	const rows = Array.isArray(payload)
		? payload
		: Array.isArray(payload.history)
			? payload.history
			: Array.isArray(payload.records)
				? payload.records
				: Array.isArray(payload.data)
					? payload.data
					: null;
	if (!rows) {
		throw new ApiError(502, 'The history API did not return a history list.');
	}
	return rows.map((item, index) => {
		if (!isRecord(item)) {
			throw new ApiError(502, `The history API returned an invalid row (${index + 1}).`);
		}
		return {
			timestamp: stringValue(
				pick(item, 'timestamp', 'time', 'created_at', 'date'),
				'history timestamp',
			),
			status: stringValue(pick(item, 'status', 'state'), 'history status', 'Unknown'),
			recipient: stringValue(
				pick(item, 'recipient', 'email', 'to', 'recipient_email'),
				'history recipient',
				'Unknown',
			),
			subject: stringValue(pick(item, 'subject', 'subject_line', 'message'), 'history subject'),
		};
	});
}
