import axios from 'axios';
import { ApiError, api } from '@/lib/api';

export interface MailerPayload {
	fromName: string;
	fromEmail: string;
	replyToEmail?: string;
	toEmail: string;
	cc?: string;
	bcc?: string;
	subjectLine: string;
	richMessageText?: string;
	rawMessageText?: string;
	attachment?: File;
	enableAiPersonalization?: boolean;
	enableABTesting?: boolean;
	subjectLineB?: string;
	richMessageTextB?: string;
	enableFollowUp?: boolean;
	followUpDays?: number;
	followUpSubject?: string;
	richFollowUpText?: string;
}

export interface MailerProgress {
	percent: number | null;
	detail: string;
	summary: string;
}

function makeForm(payload: MailerPayload): FormData {
	const form = new FormData();
	for (const key of [
		'fromName',
		'fromEmail',
		'replyToEmail',
		'toEmail',
		'cc',
		'bcc',
		'subjectLine',
		'richMessageText',
		'rawMessageText',
		'subjectLineB',
		'richMessageTextB',
		'followUpDays',
		'followUpSubject',
		'richFollowUpText',
	] as const) {
		const value = payload[key];
		if (value !== undefined && value !== '') form.append(key, String(value));
	}
	for (const key of ['enableAiPersonalization', 'enableABTesting', 'enableFollowUp'] as const) {
		if (payload[key]) form.append(key, '1');
	}
	if (payload.attachment) form.append('attachment', payload.attachment);
	return form;
}

export async function sendCampaign(
	payload: MailerPayload,
	onProgress: (progress: MailerProgress) => void,
): Promise<string> {
	const form = makeForm(payload);
	let consumed = 0;
	let carry = '';
	let summary = '';
	const errors: string[] = [];

	const readNewText = (text: string) => {
		const fresh = text.slice(consumed);
		consumed = text.length;
		const lines = (carry + fresh).split(/\r?\n/);
		carry = lines.pop() ?? '';
		for (const line of lines) processLine(line);
	};

	const processLine = (line: string) => {
		if (line.startsWith('PROGRESS:')) {
			const [value, detail = ''] = line.slice('PROGRESS:'.length).split('|SENT:');
			const parsedPercent = Number.parseFloat(value);
			onProgress({
				percent: Number.isFinite(parsedPercent) ? Math.max(0, Math.min(100, parsedPercent)) : null,
				detail,
				summary,
			});
		} else if (line.startsWith('SUMMARY:')) {
			summary = line.slice('SUMMARY:'.length).trim();
			onProgress({ percent: 100, detail: 'Complete', summary });
		} else if (line.startsWith('ERROR:')) {
			errors.push(line.slice('ERROR:'.length).trim());
			onProgress({
				percent: null,
				detail: errors[errors.length - 1] ?? 'Delivery failed',
				summary,
			});
		} else if (line.trim()) {
			onProgress({ percent: null, detail: line.trim(), summary });
		}
	};

	try {
		const response = await api<string>('/mailer.php', {
			method: 'POST',
			data: form,
			responseType: 'text',
			headers: { 'Content-Type': 'multipart/form-data' },
			onDownloadProgress: (progress) => {
				const target = progress.event?.target;
				if (target instanceof XMLHttpRequest) readNewText(target.responseText);
			},
		});
		readNewText(response);
		if (carry.trim()) processLine(carry);
		if (errors.length) throw new ApiError(502, errors.join('\n'));
		if (!summary && !response.trim())
			throw new ApiError(502, 'The mailer returned an empty response.');
		return summary || response.trim();
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const data = typeof error.response?.data === 'string' ? error.response.data : '';
			throw new ApiError(
				error.response?.status ?? 0,
				data.trim() || error.message || 'The mailer request failed.',
			);
		}
		throw error;
	}
}
