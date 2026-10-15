export type ConsentStatus = 'opted_in' | 'pending' | 'unsubscribed' | 'bounced';

export interface Contact {
	id: string;
	email: string;
	phone?: string;
	name?: string;
	consent: ConsentStatus;
	/** Where/how consent was given (form URL, import note, etc.). Required for compliance. */
	consentSource: string;
	consentedAt?: string;
	listIds: string[];
	createdAt: string;
}

export interface ContactList {
	id: string;
	name: string;
	description?: string;
	contactCount: number;
}

export type VerifyReason = 'invalid_syntax' | 'duplicate' | 'no_mx' | 'disposable';

export interface VerifyResult {
	valid: string[];
	invalid: { email: string; reason: VerifyReason }[];
	total: number;
}

export interface CampaignVariant {
	subject: string;
	body: string;
}

export interface DripStep {
	waitDays: number;
	subject: string;
	body: string;
	/** Skip the step if the recipient already replied */
	skipIfReplied: boolean;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';

export interface Campaign {
	id: string;
	name: string;
	fromName: string;
	fromEmail: string;
	listId: string;
	variantA: CampaignVariant;
	/** Present when A/B testing is enabled */
	variantB?: CampaignVariant;
	drip?: DripStep;
	status: CampaignStatus;
	createdAt: string;
}

export interface FunnelStats {
	sent: number;
	delivered: number;
	opened: number;
	clicked: number;
	unsubscribed: number;
	bounced: number;
}

export interface AbResult {
	winner: 'A' | 'B' | 'tie';
	a: FunnelStats;
	b: FunnelStats;
}

export interface ActivityEvent {
	id: string;
	type: 'open' | 'click' | 'unsubscribe' | 'bounce' | 'reply';
	email: string;
	campaignId: string;
	at: string;
}

export interface SmsMessage {
	recipients: string[];
	text: string;
}

export interface SessionUser {
	id: string;
	email: string;
	name: string;
}
