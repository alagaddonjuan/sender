const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmailSyntax = (email: string): boolean => EMAIL_RE.test(email.trim());

/** Split pasted text (newlines, commas, semicolons, spaces) into trimmed, lower-cased emails. */
export function parseEmailList(raw: string): string[] {
	return raw
		.split(/[\s,;]+/)
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
}

/** SMS length helper: a single GSM-7 segment is 160 chars. */
export function smsSegments(text: string): number {
	return Math.max(1, Math.ceil(text.length / 160));
}

/** Basic E.164 check (+234..., +254...). */
export const isValidPhone = (p: string): boolean => /^\+[1-9]\d{7,14}$/.test(p.trim());
