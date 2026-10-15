import { api, ApiError } from '@/lib/api';
import type { SmsMessage } from '@/types';

export async function sendSms(message: SmsMessage): Promise<string> {
	const form = new FormData();
	form.append('toNumbers', message.recipients.join('\n'));
	form.append('smsMessage', message.text);
	const response = await api<string>('/sms_sender.php', {
		method: 'POST',
		data: form,
		responseType: 'text',
		headers: { 'Content-Type': 'multipart/form-data', Accept: 'text/plain' },
	});
	if (/^\s*❌\s*Error:/i.test(response)) {
		throw new ApiError(502, response.trim());
	}
	return response;
}
