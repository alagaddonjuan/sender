import { Link } from 'react-router-dom';
import {
	ArrowRight,
	Activity,
	BookOpen,
	MessageSquareText,
	Search,
	Send,
	ShieldCheck,
} from 'lucide-react';

const modules = [
	{
		step: 'Step 01',
		title: 'Find leads',
		text: 'Search public web results using the Q4 lead scraper.',
		link: '/scraper',
		action: 'Open lead scraper',
		icon: Search,
		tone: 'blue',
	},
	{
		step: 'Step 02',
		title: 'Verify an email list',
		text: 'Check syntax and domain MX records with the backend verifier.',
		link: '/verify',
		action: 'Open verifier',
		icon: ShieldCheck,
		tone: 'green',
	},
	{
		step: 'Step 03',
		title: 'Send an email campaign',
		text: 'Dispatch an authorized message with progress from the Q4 mailer.',
		link: '/campaigns',
		action: 'Open mailer',
		icon: Send,
		tone: 'violet',
	},
	{
		step: 'REPORTING',
		title: 'Campaign analytics',
		text: 'Review opens, clicks, and recent campaign activity from the Q4 API.',
		link: '/analytics',
		action: 'Open analytics',
		icon: Activity,
		tone: 'slate',
	},
	{
		step: 'Mobile outreach',
		title: 'Send SMS',
		text: 'Dispatch a consent-based SMS through the Q4 gateway.',
		link: '/sms',
		action: 'Open SMS engine',
		icon: MessageSquareText,
		tone: 'green',
	},
	{
		step: 'Get started',
		title: 'Platform guide',
		text: 'Review the workflow and consent-focused usage guidance.',
		link: '/guide',
		action: 'Read the guide',
		icon: BookOpen,
		tone: 'slate',
	},
];

export default function Dashboard() {
	return (
		<>
			<section className="dashboard-hero">
				<div className="dashboard-hero-copy">
					<p className="eyebrow">Q4ILTD WORKSPACE</p>
					<h1>
						Outreach operations,
						<br />
						all in one place.
					</h1>
					<p>
						Use the connected Q4 API to verify lists, send campaigns, and reach opted-in recipients.
					</p>
					<div className="dashboard-hero-actions">
						<Link to="/campaigns" className="hero-primary-action">
							Open email mailer <ArrowRight size={16} aria-hidden="true" />
						</Link>
						<Link to="/guide" className="hero-secondary-action">
							Explore the workflow
						</Link>
					</div>
				</div>
				<div className="dashboard-hero-aside">
					<div className="hero-status-icon">
						<Send size={19} strokeWidth={1.8} aria-hidden="true" />
					</div>
					<span className="hero-status-label">Q4 MAILER API</span>
					<strong>Configured API</strong>
					<p>Requests target the PHP service at sender.q4iltd.com.</p>
					<div className="hero-status-foot">
						<span className="status-dot" /> API calls include session credentials
					</div>
				</div>
			</section>

			<div className="dashboard-section-heading">
				<div>
					<p className="eyebrow">AVAILABLE API WORKFLOWS</p>
					<h2>Choose an operation</h2>
					<p>These tools call the endpoints documented for the Q4 backend.</p>
				</div>
			</div>
			<section className="module-grid" aria-label="Campaign modules">
				{modules.map((module) => (
					<article className={`module-card module-${module.tone}`} key={module.title}>
						<span className="module-icon">
							<module.icon size={22} strokeWidth={1.8} aria-hidden="true" />
						</span>
						<p className="module-step">{module.step}</p>
						<h2>{module.title}</h2>
						<p className="module-description">{module.text}</p>
						<Link to={module.link} className="module-action">
							{module.action}
							<ArrowRight size={14} aria-hidden="true" />
						</Link>
					</article>
				))}
			</section>
		</>
	);
}
