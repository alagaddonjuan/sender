import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const steps = [
	{
		number: '01',
		title: 'Search · Find leads',
		description: 'Use the Q4 scraper to search public web results for relevant business leads.',
		detail:
			'Review source permissions and privacy requirements. Finding or publishing a business email alone does not grant permission to send marketing messages.',
		link: '/scraper',
		action: 'Open Scraper',
	},
	{
		number: '02',
		title: 'Verify · Clean your list',
		description:
			'Paste an email list into the Q4 verifier. The backend checks syntax, MX records, and role-based addresses.',
		detail:
			'The interface can flag generic role inboxes such as info@ or admin@ for review. Mailbox-level SMTP VRFY probing is not performed. Domain readiness does not establish that an inbox exists or that you have consent to contact it.',
		link: '/verify',
		action: 'Open Verifier',
	},
	{
		number: '03',
		title: 'Send · Prepare a campaign',
		description:
			'Set sender details, recipients, subject, and message. Optional API controls support A/B testing, AI personalization, attachments, and follow-up.',
		detail:
			'The API streams delivery progress while sending. Verify authorization and recipient consent before dispatch. Do not rotate accounts to evade sending limits.',
		link: '/campaigns',
		action: 'Open Mailer',
	},
	{
		number: '04',
		title: 'SMS · Mobile outreach',
		description: 'Send a text message to country-coded recipients through the Q4 SMS gateway.',
		detail:
			'Only message recipients who opted in and follow local SMS rules and the provider terms.',
		link: '/sms',
		action: 'Open SMS',
	},
];

export default function Guide() {
	return (
		<>
			<header className="guide-heading">
				<p className="eyebrow">Q4ILTD FIELD GUIDE</p>
				<h1>Master your outreach workflow</h1>
				<p>A simple guide to using the connected Q4 Campaign Manager API.</p>
			</header>
			<div className="guide-layout">
				<main className="guide-steps">
					{steps.map((step) => (
						<article className="guide-step panel" key={step.number}>
							<span className="guide-step-number">{step.number}</span>
							<div className="guide-step-content">
								<h2>{step.title}</h2>
								<p>{step.description}</p>
								<p className="guide-detail">{step.detail}</p>
								<Link to={step.link}>
									{step.action}
									<ArrowRight size={14} aria-hidden="true" />
								</Link>
							</div>
						</article>
					))}
					<article className="guide-step panel guide-sms">
						<span className="guide-step-number">SMS</span>
						<div className="guide-step-content">
							<h2>SMS Engine · Mobile outreach</h2>
							<p>
								Enter phone numbers with their country codes, write a concise message, and review
								its character/segment estimate.
							</p>
							<p className="guide-detail">
								Only send to recipients who opted in. Follow local laws and provider terms.
							</p>
							<Link to="/sms">
								Open SMS broadcaster
								<ArrowRight size={14} aria-hidden="true" />
							</Link>
						</div>
					</article>
					<section className="guide-advanced panel">
						<p className="eyebrow">MAILER OPTIONS</p>
						<h2>Mailer tools</h2>
						<div className="guide-feature-grid">
							<article>
								<h3>A/B split testing</h3>
								<p>Send two message variants through the backend's A/B option.</p>
							</article>
							<article>
								<h3>AI writing assistance</h3>
								<p>
									Check spam signals and generate a second variant. Review all generated copy before
									use.
								</p>
							</article>
							<article>
								<h3>SMS broadcast</h3>
								<p>
									Send country-coded numbers and concise copy. A 160-character GSM message is
									commonly one segment; encoding may change segment counts.
								</p>
							</article>
						</div>
					</section>
				</main>
				<aside className="guide-aside panel">
					<p className="eyebrow">BEFORE YOU SEND</p>
					<h2>Trust is part of the workflow</h2>
					<ul className="guide-checklist">
						<li>Use contacts with documented permission.</li>
						<li>Identify your organization clearly.</li>
						<li>Review unsubscribe and opt-out handling before sending.</li>
						<li>Honor replies, opt-outs, and suppression requests.</li>
						<li>Never put API keys or provider credentials in the frontend.</li>
						<li>Respect sending limits—never rotate accounts to bypass them.</li>
					</ul>
					<div className="guide-backend-note">
						Analytics and transmission history are available from the Q4 analytics and history
						endpoints. Contact-list reads are not documented.
					</div>
				</aside>
			</div>
		</>
	);
}
