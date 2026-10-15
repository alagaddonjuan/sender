import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info, LoaderCircle, MessageSquareText, Send } from 'lucide-react';
import { sendSms } from '@/services/sms';
import { isValidPhone, smsSegments } from '@/lib/email';

export default function Sms() {
	const [numbers, setNumbers] = useState('');
	const [text, setText] = useState('');
	const [consentConfirmed, setConsentConfirmed] = useState(false);
	const [busy, setBusy] = useState(false);
	const [note, setNote] = useState('');
	const [error, setError] = useState('');
	const recipients = useMemo(
		() => [...new Set(numbers.split(/[\s,;]+/).filter(Boolean))],
		[numbers],
	);
	const invalidCount = recipients.filter((number) => !isValidPhone(number)).length;
	const segmentCount = smsSegments(text);

	const submit = async () => {
		setBusy(true);
		setError('');
		setNote('');
		try {
			setNote(await sendSms({ recipients, text: text.trim() }));
		} catch (sendError) {
			setError(sendError instanceof Error ? sendError.message : 'Could not send SMS.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<div className="sms-card-shell">
				<header className="sms-titlebar">
					<h1>
						<MessageSquareText size={20} aria-hidden="true" /> SMS Broadcast
					</h1>
					<Link to="/">
						<ArrowLeft size={14} aria-hidden="true" />
						Dashboard
					</Link>
				</header>
				<section className="sms-card-body">
					<div className="provider-notice">
						<Info size={17} aria-hidden="true" />
						<span>
							Messages are dispatched by the Q4 SMS API. Only send to recipients who consented.
						</span>
					</div>
					<label className="field-label" htmlFor="sms-recipients">
						Recipients (phone numbers)
					</label>
					<textarea
						id="sms-recipients"
						className="sms-recipients"
						rows={4}
						value={numbers}
						onChange={(event) => setNumbers(event.target.value)}
						placeholder={
							'+254711XXXYYY, +254733XXXYYY\n(Include country code; separate numbers with commas or new lines)'
						}
					/>
					<p className={invalidCount ? 'sms-validation-error' : 'field-hint'}>
						{invalidCount ? `${invalidCount} invalid number(s). ` : ''}Numbers must include the
						country code (e.g. +234 or +254).{' '}
						{recipients.length ? `${recipients.length} recipient(s).` : ''}
					</p>
					<div className="sms-message-heading">
						<label className="field-label" htmlFor="sms-message">
							Message
						</label>
						<span>
							{text.length} / 1600 chars ({segmentCount} SMS segment
							{text && segmentCount !== 1 ? 's' : ''})
						</span>
					</div>
					<textarea
						id="sms-message"
						className="sms-message"
						rows={5}
						maxLength={1600}
						value={text}
						onChange={(event) => setText(event.target.value)}
						placeholder="Write your message..."
					/>
					<label className="mailer-checkbox sms-consent">
						<input
							type="checkbox"
							checked={consentConfirmed}
							onChange={(event) => setConsentConfirmed(event.target.checked)}
						/>
						<span>
							I confirm all recipients opted in and the message includes appropriate sender and
							opt-out information.
						</span>
					</label>
					<button
						className="sms-launch icon-button"
						onClick={submit}
						aria-busy={busy}
						disabled={
							busy || !recipients.length || invalidCount > 0 || !text.trim() || !consentConfirmed
						}
					>
						{busy ? (
							<LoaderCircle className="button-spinner" size={16} aria-hidden="true" />
						) : (
							<Send size={16} aria-hidden="true" />
						)}
						{busy ? 'Sending SMS…' : 'Send SMS broadcast'}
					</button>
					{error && (
						<p className="inline-alert alert-error" role="alert">
							{error}
						</p>
					)}
					{note && (
						<pre className="inline-alert" role="status">
							{note}
						</pre>
					)}
				</section>
			</div>
		</>
	);
}
