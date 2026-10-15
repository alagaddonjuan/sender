import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import {
	Bold,
	CheckCircle2,
	Code,
	Image,
	Italic,
	Link as LinkIcon,
	List,
	ListOrdered,
	LoaderCircle,
	Outdent,
	Quote,
	Redo,
	Send,
	Strikethrough,
	Underline,
	Undo,
	Indent,
	Paperclip,
	Sparkles,
} from 'lucide-react';
import { checkSpamScore, generateVariantB } from '@/services/ai';
import { sendCampaign, type MailerProgress } from '@/services/mailer';

const escapeHtml = (text: string) =>
	text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

function sanitizeRichHtml(html: string): string {
	const document = new DOMParser().parseFromString(html, 'text/html');
	const allowedTags = new Set([
		'A',
		'B',
		'BLOCKQUOTE',
		'BR',
		'CODE',
		'DEL',
		'DIV',
		'EM',
		'I',
		'IMG',
		'LI',
		'OL',
		'P',
		'PRE',
		'S',
		'STRONG',
		'U',
		'UL',
	]);

	const serialize = (node: Node): string => {
		if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? '');
		if (!(node instanceof HTMLElement) || !allowedTags.has(node.tagName)) {
			return Array.from(node.childNodes, serialize).join('');
		}

		const tag = node.tagName.toLowerCase();
		if (tag === 'img') {
			const source = node.getAttribute('src') ?? '';
			try {
				const url = new URL(source);
				if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
				return `<img src="${escapeHtml(url.href)}" alt="${escapeHtml(node.getAttribute('alt') ?? '')}">`;
			} catch {
				return '';
			}
		}
		if (tag === 'a') {
			const href = node.getAttribute('href') ?? '';
			try {
				const url = new URL(href);
				if (url.protocol !== 'https:' && url.protocol !== 'http:') {
					return Array.from(node.childNodes, serialize).join('');
				}
				return `<a href="${escapeHtml(url.href)}" rel="noopener noreferrer">${Array.from(node.childNodes, serialize).join('')}</a>`;
			} catch {
				return Array.from(node.childNodes, serialize).join('');
			}
		}

		const contents = Array.from(node.childNodes, serialize).join('');
		return tag === 'br' ? '<br>' : `<${tag}>${contents}</${tag}>`;
	};

	return Array.from(document.body.childNodes, serialize).join('');
}

function plainTextHtml(text: string): string {
	return escapeHtml(text).replace(/\r?\n/g, '<br>');
}

const htmlFromText = plainTextHtml;

function EditorToolbar({ editorRef }: { editorRef: RefObject<HTMLDivElement> }) {
	const [urlError, setUrlError] = useState('');
	const runCommand = (command: string, value?: string) => {
		editorRef.current?.focus();
		document.execCommand(command, false, value);
	};

	const getHttpUrl = (label: string) => {
		const value = window.prompt(`Enter ${label} URL (http or https):`);
		if (!value) {
			setUrlError('');
			return undefined;
		}
		try {
			const url = new URL(value);
			if (url.protocol === 'http:' || url.protocol === 'https:') {
				setUrlError('');
				return url.href;
			}
		} catch {
			setUrlError('Enter a valid http or https URL.');
			return undefined;
		}
		setUrlError('Enter a valid http or https URL.');
		return undefined;
	};

	const insertLink = () => {
		const url = getHttpUrl('link');
		if (url) runCommand('createLink', url);
	};

	const insertImage = () => {
		const url = getHttpUrl('image');
		if (url) runCommand('insertImage', url);
	};

	const tools = [
		{ label: 'Bold', icon: Bold, command: 'bold' },
		{ label: 'Italic', icon: Italic, command: 'italic' },
		{ label: 'Underline', icon: Underline, command: 'underline' },
		{ label: 'Strikethrough', icon: Strikethrough, command: 'strikeThrough' },
		{ label: 'Bulleted list', icon: List, command: 'insertUnorderedList' },
		{ label: 'Numbered list', icon: ListOrdered, command: 'insertOrderedList' },
		{ label: 'Quote', icon: Quote, command: 'formatBlock', value: 'blockquote' },
		{ label: 'Code block', icon: Code, command: 'formatBlock', value: 'pre' },
	];

	return (
		<>
			<div className="editor-toolbar" role="toolbar" aria-label="Message formatting">
				{tools.slice(0, 4).map(({ label, icon: Icon, command }) => (
					<button
						key={label}
						type="button"
						title={label}
						aria-label={label}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => runCommand(command)}
					>
						<Icon size={15} aria-hidden="true" />
					</button>
				))}
				<span className="toolbar-divider" aria-hidden="true" />
				{tools.slice(4).map(({ label, icon: Icon, command, value }) => (
					<button
						key={label}
						type="button"
						title={label}
						aria-label={label}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => runCommand(command, value)}
					>
						<Icon size={15} aria-hidden="true" />
					</button>
				))}
				<span className="toolbar-divider" aria-hidden="true" />
				<button
					type="button"
					title="Insert link"
					aria-label="Insert link"
					onMouseDown={(event) => event.preventDefault()}
					onClick={insertLink}
				>
					<LinkIcon size={15} aria-hidden="true" />
				</button>
				<button
					type="button"
					title="Insert image"
					aria-label="Insert image"
					onMouseDown={(event) => event.preventDefault()}
					onClick={insertImage}
				>
					<Image size={15} aria-hidden="true" />
				</button>
				<span className="toolbar-divider" aria-hidden="true" />
				<button
					type="button"
					title="Indent"
					aria-label="Indent"
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => runCommand('indent')}
				>
					<Indent size={15} aria-hidden="true" />
				</button>
				<button
					type="button"
					title="Outdent"
					aria-label="Outdent"
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => runCommand('outdent')}
				>
					<Outdent size={15} aria-hidden="true" />
				</button>
				<span className="toolbar-divider" aria-hidden="true" />
				<button
					type="button"
					title="Undo"
					aria-label="Undo"
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => runCommand('undo')}
				>
					<Undo size={15} aria-hidden="true" />
				</button>
				<button
					type="button"
					title="Redo"
					aria-label="Redo"
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => runCommand('redo')}
				>
					<Redo size={15} aria-hidden="true" />
				</button>
			</div>
			{urlError && (
				<p className="editor-toolbar-error" role="alert">
					{urlError}
				</p>
			)}
		</>
	);
}

export default function Campaigns() {
	const [fromName, setFromName] = useState('');
	const [fromEmail, setFromEmail] = useState('');
	const [replyToEmail, setReplyToEmail] = useState('');
	const [recipients, setRecipients] = useState('');
	const [cc, setCc] = useState('');
	const [bcc, setBcc] = useState('');
	const [subjectA, setSubjectA] = useState('');
	const [bodyA, setBodyA] = useState('');
	const [abEnabled, setAbEnabled] = useState(false);
	const [subjectB, setSubjectB] = useState('');
	const [bodyB, setBodyB] = useState('');
	const [followUp, setFollowUp] = useState(false);
	const [followUpDays, setFollowUpDays] = useState(2);
	const [followUpSubject, setFollowUpSubject] = useState('');
	const [followUpBody, setFollowUpBody] = useState('');
	const [personalize, setPersonalize] = useState(false);
	const [attachment, setAttachment] = useState<File>();
	const [authorized, setAuthorized] = useState(false);
	const [busy, setBusy] = useState(false);
	const [aiTask, setAiTask] = useState<'spam' | 'variant' | null>(null);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [progress, setProgress] = useState<MailerProgress | null>(null);
	const [spamResult, setSpamResult] = useState<Awaited<ReturnType<typeof checkSpamScore>> | null>(
		null,
	);
	const [spamRewriteApplied, setSpamRewriteApplied] = useState(false);
	const attachmentRef = useRef<HTMLInputElement>(null);
	const bodyAEditorRef = useRef<HTMLDivElement>(null);

	const onAttachment = (event: ChangeEvent<HTMLInputElement>) => {
		setAttachment(event.target.files?.[0]);
	};

	const runAi = async (task: 'spam' | 'variant') => {
		setBusy(true);
		setAiTask(task);
		setError('');
		setNotice('');
		try {
			if (task === 'spam') {
				const result = await checkSpamScore(subjectA, bodyA);
				setSpamResult(result);
				setSpamRewriteApplied(false);
				setNotice(
					`Spam risk: ${result.riskLevel}. Higher scores mean greater spam risk; lower scores are better.`,
				);
			} else {
				const variant = await generateVariantB(subjectA, bodyA);
				setSubjectB(variant.subject);
				setBodyB(variant.body);
				setAbEnabled(true);
				setNotice('Variant B is ready. Review the generated copy before sending.');
			}
		} catch (aiError) {
			setError(aiError instanceof Error ? aiError.message : 'The AI request failed.');
		} finally {
			setAiTask(null);
			setBusy(false);
		}
	};

	const launch = async () => {
		setBusy(true);
		setError('');
		setNotice('');
		setProgress({
			percent: 0,
			detail: 'Connecting to the mailer…',
			summary: '',
		});
		try {
			const summary = await sendCampaign(
				{
					fromName: fromName.trim(),
					fromEmail: fromEmail.trim(),
					replyToEmail: replyToEmail.trim() || undefined,
					toEmail: recipients.trim(),
					cc: cc.trim() || undefined,
					bcc: bcc.trim() || undefined,
					subjectLine: subjectA.trim(),
					richMessageText: bodyAEditorRef.current
						? sanitizeRichHtml(bodyAEditorRef.current.innerHTML)
						: plainTextHtml(bodyA),
					rawMessageText: bodyA,
					attachment,
					enableAiPersonalization: personalize,
					enableABTesting: abEnabled,
					subjectLineB: abEnabled ? subjectB.trim() : undefined,
					richMessageTextB: abEnabled ? htmlFromText(bodyB) : undefined,
					enableFollowUp: followUp,
					followUpDays: followUp ? followUpDays : undefined,
					followUpSubject: followUp ? followUpSubject.trim() : undefined,
					richFollowUpText: followUp ? htmlFromText(followUpBody) : undefined,
				},
				setProgress,
			);
			setNotice(summary);
			setProgress((current) => (current ? { ...current, percent: 100, summary } : current));
		} catch (sendError) {
			setError(sendError instanceof Error ? sendError.message : 'The mailer request failed.');
		} finally {
			setBusy(false);
		}
	};

	const recipientCount = recipients.split(/[\s,;]+/).filter(Boolean).length;
	const ready =
		fromName.trim() &&
		fromEmail.trim() &&
		recipients.trim() &&
		subjectA.trim() &&
		bodyA.trim() &&
		(!abEnabled || (subjectB.trim() && bodyB.trim())) &&
		(!followUp || (followUpSubject.trim() && followUpBody.trim()));

	return (
		<div className="mailer-shell-container">
			<header className="page-heading mailer-page-heading">
				<div>
					<p className="eyebrow">STEP 3 · EMAIL OUTREACH</p>
					<h1>Smart Mailer</h1>
					<p className="muted">Send an authorized email batch through the Q4 Mailer API.</p>
				</div>
				<Link className="button-link button-link-outline" to="/">
					Back to Dashboard
				</Link>
			</header>
			<div className="mailer-shell">
				<div className="mailer-titlebar">
					<Send size={17} aria-hidden="true" /> Smart Mailer{' '}
					<span className="mailer-preview-label">sender.q4iltd.com</span>
				</div>
				<div className="mailer-content">
					<section className="mailer-form-section">
						<div className="mailer-two-fields">
							<label className="field-label">
								From name
								<input
									value={fromName}
									onChange={(event) => setFromName(event.target.value)}
									required
								/>
							</label>
							<label className="field-label">
								From email
								<input
									type="email"
									value={fromEmail}
									onChange={(event) => setFromEmail(event.target.value)}
									required
								/>
							</label>
							<label className="field-label field-span-two">
								Reply-To email (optional)
								<input
									type="email"
									value={replyToEmail}
									onChange={(event) => setReplyToEmail(event.target.value)}
								/>
							</label>
						</div>
						<label className="field-label">
							Recipients{' '}
							<span className="field-help-inline">
								{recipientCount} recipient(s); separate addresses with commas, spaces, or new lines
							</span>
							<textarea
								className="mailer-recipients"
								rows={4}
								value={recipients}
								onChange={(event) => setRecipients(event.target.value)}
								placeholder="name@example.com, subscriber@example.org"
								required
							/>
						</label>
						<div className="mailer-two-fields">
							<label className="field-label">
								CC
								<input value={cc} onChange={(event) => setCc(event.target.value)} />
							</label>
							<label className="field-label">
								BCC
								<input value={bcc} onChange={(event) => setBcc(event.target.value)} />
							</label>
						</div>
					</section>

					<section className="mailer-variant">
						<label className="field-label">
							Subject line (A)
							<input
								value={subjectA}
								onChange={(event) => {
									setSubjectA(event.target.value);
									setSpamResult(null);
									setSpamRewriteApplied(false);
								}}
								required
							/>
						</label>
						<div className="editor-label-row">
							<label className="field-label" htmlFor="body-a">
								Message (plain text)
							</label>
							<div className="heading-actions">
								<button
									className="ai-button icon-button"
									type="button"
									onClick={() => runAi('spam')}
									aria-busy={aiTask === 'spam'}
									disabled={busy || !subjectA.trim() || !bodyA.trim()}
								>
									{aiTask === 'spam' ? (
										<LoaderCircle className="button-spinner" size={14} aria-hidden="true" />
									) : (
										<Sparkles size={14} aria-hidden="true" />
									)}
									{aiTask === 'spam' ? 'Checking spam score…' : 'Check spam score'}
								</button>
								<button
									className="ai-button icon-button"
									type="button"
									onClick={() => runAi('variant')}
									aria-busy={aiTask === 'variant'}
									disabled={busy || !subjectA.trim() || !bodyA.trim()}
								>
									{aiTask === 'variant' ? (
										<LoaderCircle className="button-spinner" size={14} aria-hidden="true" />
									) : (
										<Sparkles size={14} aria-hidden="true" />
									)}
									{aiTask === 'variant' ? 'Generating Variant B…' : 'Generate Variant B'}
								</button>
							</div>
						</div>
						<div className="rich-editor">
							<EditorToolbar editorRef={bodyAEditorRef} />
							<div
								id="body-a"
								ref={bodyAEditorRef}
								className="mailer-editor"
								contentEditable
								suppressContentEditableWarning
								role="textbox"
								aria-label="Message body"
								aria-multiline="true"
								aria-required="true"
								data-placeholder="Write your email message…"
								onInput={(event) => {
									setBodyA(event.currentTarget.innerText.replace(/\r/g, ''));
									setSpamResult(null);
									setSpamRewriteApplied(false);
								}}
								onPaste={(event) => {
									event.preventDefault();
									document.execCommand(
										'insertText',
										false,
										event.clipboardData.getData('text/plain'),
									);
								}}
								onDrop={(event) => event.preventDefault()}
							/>
						</div>
						{spamResult && (
							<section
								className={`spam-analysis spam-analysis-${spamResult.score <= 30 ? 'low' : spamResult.score <= 60 ? 'medium' : 'high'}`}
								aria-label="Spam analysis result"
								aria-live="polite"
							>
								<div className="spam-analysis-heading">
									<CheckCircle2 size={21} aria-hidden="true" />
									<div>
										<h3>
											Spam Score: {spamResult.score}/100
											<span>{spamResult.riskLevel} Risk</span>
										</h3>
										<p>Lower scores indicate a lower estimated risk of landing in spam.</p>
									</div>
								</div>
								<p className="spam-score-explanation">
									This estimate cannot guarantee inbox placement. Review the suggestions and
									optional rewrite below before sending.
								</p>
								<div
									className="spam-score-meter"
									role="meter"
									aria-label="Spam risk score"
									aria-valuemin={0}
									aria-valuemax={100}
									aria-valuenow={Math.max(0, Math.min(100, spamResult.score))}
									aria-valuetext={`${spamResult.score} out of 100; higher means greater spam risk`}
								>
									<span
										style={{
											width: `${Math.max(0, Math.min(100, spamResult.score))}%`,
										}}
									/>
								</div>
								{spamResult.suggestions.length > 0 && (
									<div className="spam-suggestions">
										<h4>Suggestions to improve deliverability</h4>
										<ul>
											{spamResult.suggestions.map((suggestion, index) => (
												<li key={`${suggestion}-${index}`}>{suggestion}</li>
											))}
										</ul>
									</div>
								)}
								{(spamResult.rewrittenSubject || spamResult.rewrittenBody) && (
									<div className="spam-rewrite">
										<h4>
											<Sparkles size={15} aria-hidden="true" />
											AI suggested rewrite
										</h4>
										<div className="spam-rewrite-preview">
											{spamResult.rewrittenSubject && (
												<p>
													<strong>Subject:</strong> {spamResult.rewrittenSubject}
												</p>
											)}
											{spamResult.rewrittenBody && (
												<p className="spam-rewrite-body">
													<strong>Body:</strong>
													<span>{spamResult.rewrittenBody}</span>
												</p>
											)}
										</div>
										<button
											className="spam-apply-button icon-button"
											type="button"
											disabled={spamRewriteApplied}
											onClick={() => {
												if (spamResult.rewrittenSubject) {
													setSubjectA(spamResult.rewrittenSubject);
												}
												if (spamResult.rewrittenBody) {
													setBodyA(spamResult.rewrittenBody);
													if (bodyAEditorRef.current) {
														bodyAEditorRef.current.innerHTML = plainTextHtml(
															spamResult.rewrittenBody,
														);
													}
												}
												setSpamRewriteApplied(true);
											}}
										>
											<CheckCircle2 size={15} aria-hidden="true" />
											{spamRewriteApplied ? 'Rewrite applied' : 'Apply this rewrite'}
										</button>
									</div>
								)}
							</section>
						)}
					</section>

					<section className="mailer-option-row">
						<label className="mailer-toggle">
							<input
								type="checkbox"
								checked={abEnabled}
								onChange={(event) => setAbEnabled(event.target.checked)}
							/>
							<span className="toggle-visual" aria-hidden="true" />
							<span>
								<strong>Enable A/B testing</strong>
								<small>Use the backend’s 50/50 variant split.</small>
							</span>
						</label>
					</section>
					{abEnabled && (
						<section className="mailer-variant">
							<h2>Variant B</h2>
							<label className="field-label">
								Subject line (B)
								<input
									value={subjectB}
									onChange={(event) => setSubjectB(event.target.value)}
									required
								/>
							</label>
							<label className="field-label">
								Message (plain text)
								<textarea
									className="mailer-editor"
									rows={8}
									value={bodyB}
									onChange={(event) => setBodyB(event.target.value)}
									required
								/>
							</label>
						</section>
					)}

					<section className="mailer-option-row">
						<label className="mailer-toggle">
							<input
								type="checkbox"
								checked={personalize}
								onChange={(event) => setPersonalize(event.target.checked)}
							/>
							<span className="toggle-visual" aria-hidden="true" />
							<span>
								<strong>AI personalization</strong>
								<small>Ask the backend to tailor an opening line per recipient.</small>
							</span>
						</label>
						<label className="mailer-toggle">
							<input
								type="checkbox"
								checked={followUp}
								onChange={(event) => setFollowUp(event.target.checked)}
							/>
							<span className="toggle-visual" aria-hidden="true" />
							<span>
								<strong>Schedule follow-up</strong>
								<small>Backend follow-up sequence for recipients who have not replied.</small>
							</span>
						</label>
					</section>
					{followUp && (
						<section className="mailer-variant">
							<div className="mailer-two-fields">
								<label className="field-label">
									Wait days
									<input
										type="number"
										min={1}
										max={90}
										value={followUpDays}
										onChange={(event) => setFollowUpDays(Number(event.target.value))}
									/>
								</label>
								<label className="field-label">
									Follow-up subject
									<input
										value={followUpSubject}
										onChange={(event) => setFollowUpSubject(event.target.value)}
										required
									/>
								</label>
							</div>
							<label className="field-label">
								Follow-up message
								<textarea
									className="mailer-editor"
									rows={6}
									value={followUpBody}
									onChange={(event) => setFollowUpBody(event.target.value)}
									required
								/>
							</label>
						</section>
					)}
					<section className="mailer-footer">
						<input
							ref={attachmentRef}
							className="visually-hidden"
							type="file"
							onChange={onAttachment}
						/>
						<button
							className="button-secondary icon-button"
							type="button"
							onClick={() => attachmentRef.current?.click()}
						>
							<Paperclip size={15} aria-hidden="true" />
							{attachment?.name ?? 'Attach a file (optional)'}
						</button>
						<label className="mailer-checkbox">
							<input
								type="checkbox"
								checked={authorized}
								onChange={(event) => setAuthorized(event.target.checked)}
							/>
							<span>
								I confirm that all recipients are authorized to receive this message and that I will
								honor applicable law and provider terms.
							</span>
						</label>
						<button
							className="mailer-launch icon-button"
							type="button"
							onClick={launch}
							aria-busy={busy && !aiTask}
							disabled={busy || !ready || !authorized}
						>
							{busy && !aiTask ? (
								<LoaderCircle className="button-spinner" size={16} aria-hidden="true" />
							) : (
								<Send size={16} aria-hidden="true" />
							)}
							{busy ? 'Sending batch…' : 'Send email batch'}
						</button>
					</section>
					{progress && (
						<div className="panel">
							<p>
								<strong>
									{progress.percent === null ? progress.detail : `${progress.percent}%`}
								</strong>
								{progress.detail && progress.percent !== null ? ` · ${progress.detail}` : ''}
							</p>
							{progress.percent !== null && <progress max={100} value={progress.percent} />}
							{progress.summary && <p>{progress.summary}</p>}
						</div>
					)}
					{error && (
						<p className="inline-alert alert-error" role="alert">
							{error}
						</p>
					)}
					{notice && (
						<p className="inline-alert" role="status">
							{notice}
						</p>
					)}
				</div>
			</div>
			<p className="privacy-note">
				The Q4 API sends the submitted recipient list directly. Verify consent, sender
				authorization, and all message details before dispatch.
			</p>
		</div>
	);
}
