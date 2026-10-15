import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Clipboard, LoaderCircle, Search } from 'lucide-react';
import { scrapeLeads, type ScrapeResult } from '@/services/scraper';

export default function Scraper() {
	const [keywords, setKeywords] = useState('');
	const [result, setResult] = useState<ScrapeResult | null>(null);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [busy, setBusy] = useState(false);
	const [copying, setCopying] = useState(false);

	const search = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setBusy(true);
		setError('');
		setNotice('');
		setResult(null);
		try {
			setResult(await scrapeLeads(keywords.trim()));
		} catch (searchError) {
			setError(searchError instanceof Error ? searchError.message : 'The search request failed.');
		} finally {
			setBusy(false);
		}
	};

	const copyEmails = async () => {
		if (!result?.emails.length) return;
		setCopying(true);
		try {
			await navigator.clipboard.writeText(result.emails.join('\n'));
			setNotice('Email addresses copied.');
			setError('');
		} catch {
			setError('Clipboard access was blocked. Select and copy the email list manually.');
			setNotice('');
		} finally {
			setCopying(false);
		}
	};

	return (
		<>
			<header className="module-page-heading">
				<div>
					<p className="eyebrow">STEP 1 · BUILD AN AUDIENCE</p>
					<h1>
						<Search className="heading-icon" aria-hidden="true" /> Lead Scraper
					</h1>
				</div>
				<Link className="button-link" to="/verify">
					Next: Verify emails
				</Link>
			</header>
			<section className="instruction-callout scraper-callout">
				<h2>Search for leads</h2>
				<p>
					Searches the backend-approved public web source. Review source permissions and privacy
					requirements, and only message people when you have a lawful basis to contact them.
				</p>
			</section>
			<form className="panel scraper-form" onSubmit={search}>
				<label className="field-label" htmlFor="scraper-keywords">
					Keywords / Search tags
				</label>
				<input
					id="scraper-keywords"
					value={keywords}
					onChange={(event) => setKeywords(event.target.value)}
					placeholder="e.g. logistics companies in Nairobi"
					required
				/>
				<button
					className="scraper-submit"
					type="submit"
					aria-busy={busy}
					disabled={busy || !keywords.trim()}
				>
					{busy && <LoaderCircle className="button-spinner" size={15} aria-hidden="true" />}
					{busy ? 'Searching public sources…' : 'Search for leads'}
				</button>
				{error && (
					<p className="inline-alert alert-error" role="alert">
						{error}
					</p>
				)}
			</form>
			{result && (
				<section className="panel scraper-results" aria-live="polite">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">SEARCH RESULTS</p>
							<h2>Scrape complete</h2>
						</div>
						{result.emails.length > 0 && (
							<Link
								className="button-link"
								to="/verify"
								state={{ emailList: result.emails.join('\n') }}
							>
								Verify emails
							</Link>
						)}
					</div>
					<p className="scraper-result-message">{result.message}</p>
					<div className="scraper-stats">
						{result.scannedWebsites !== null && (
							<div>
								<strong>{result.scannedWebsites}</strong>
								<span>Websites scanned</span>
							</div>
						)}
						<div>
							<strong>{result.emails.length}</strong>
							<span>Emails found</span>
						</div>
					</div>
					<div className="scraper-email-heading">
						<label className="field-label" htmlFor="scraper-email-list">
							Extracted emails
						</label>
						<button
							className="button-secondary icon-button"
							onClick={copyEmails}
							disabled={!result.emails.length || copying}
							type="button"
						>
							{copying ? (
								<LoaderCircle className="button-spinner" size={15} aria-hidden="true" />
							) : (
								<Clipboard size={15} aria-hidden="true" />
							)}
							{copying ? 'Copying emails…' : 'Copy emails'}
						</button>
					</div>
					{result.emails.length ? (
						<textarea
							id="scraper-email-list"
							className="scraper-email-list"
							rows={Math.min(10, Math.max(4, result.emails.length))}
							readOnly
							value={result.emails.join('\n')}
						/>
					) : (
						<p className="scraper-empty">
							The search completed, but no email addresses were returned.
						</p>
					)}
					{notice && (
						<p className="inline-alert" role="status">
							{notice}
						</p>
					)}
					{error && (
						<p className="inline-alert alert-error" role="alert">
							{error}
						</p>
					)}
				</section>
			)}
		</>
	);
}
