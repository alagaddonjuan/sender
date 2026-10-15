import { api } from '@/lib/api';

export interface SpamAnalysis {
	score: number;
	riskLevel: string;
	suggestions: string[];
	rewrittenSubject: string;
	rewrittenBody: string;
}

export async function checkSpamScore(subject: string, body: string): Promise<SpamAnalysis> {
	const form = new FormData();
	form.append('subject', subject);
	form.append('body', body);
	const result = await api<{
		score: number;
		risk_level: string;
		suggestions: string[];
		rewritten_subject: string;
		rewritten_body: string;
	}>('/spam_checker.php', {
		method: 'POST',
		data: form,
		responseType: 'json',
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return {
		score: result.score,
		riskLevel: result.risk_level,
		suggestions: result.suggestions,
		rewrittenSubject: result.rewritten_subject,
		rewrittenBody: result.rewritten_body,
	};
}

export async function generateVariantB(
	subject: string,
	body: string,
): Promise<{ subject: string; body: string }> {
	const form = new FormData();
	form.append('subject', subject);
	form.append('body', body);
	const result = await api<{ variant_subject: string; variant_body: string }>('/ai_variant.php', {
		method: 'POST',
		data: form,
		responseType: 'json',
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return { subject: result.variant_subject, body: result.variant_body };
}
