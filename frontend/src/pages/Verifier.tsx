import { useState } from 'react';
import { Clipboard, LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { verifyEmails } from '@/services/verifier';

export default function Verifier() {
	const location = useLocation();
	const initialEmails = (location.state as { emailList?: unknown } | null)?.emailList;
	const [raw, setRaw] = useState(typeof initialEmails === 'string' ? initialEmails : '');
	const [result, setResult] = useState<Awaited<ReturnType<typeof verifyEmails>> | null>(null);
	const [busy, setBusy] = useState(false);
	const [copying, setCopying] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	const run = async () => {
		setBusy(true);
		setError('');
		setNotice('');
		setResult(null);
		try {
			setResult(await verifyEmails(raw));
		} catch (verificationError) {
			setError(
				verificationError instanceof Error
					? verificationError.message
					: 'Could not check this list.',
			);
		} finally {
			setBusy(false);
		}
	};

	const copyResult = async () => {
		if (!result) return;
		setCopying(true);
		try {
			await navigator.clipboard.writeText(
				[
					result.message,
					result.details,
					...result.tables.flatMap((table) => [
						table.headers.join('\t'),
						...table.rows.map((row) => row.join('\t')),
					]),
				]
					.filter(Boolean)
					.join('\n'),
			);
			setNotice('Verification report copied.');
		} catch {
			setError('Clipboard access was blocked. Select and copy the report manually.');
		} finally {
			setCopying(false);
		}
	};

	return (
		<>
			<header className="module-page-heading">
				<div>
					<p className="eyebrow">STEP 2 · CLEAN YOUR LIST</p>
					<h1>
						<ShieldCheck className="heading-icon" aria-hidden="true" /> List Verifier
					</h1>
				</div>
				<Link className="button-link" to="/scraper">
					<Search size={15} aria-hidden="true" /> Back to scraper
				</Link>
			</header>
			<section className="instruction-callout verifier-callout">
				<h2>Verify an email list</h2>
				<p>
					The Q4 backend checks address syntax and domain MX records and flags role-based addresses
					for review.
				</p>
				<p className="callout-note">
					MX records indicate domain mail configuration, not mailbox existence or permission to
					contact.
				</p>
			</section>
			<section className="panel verifier-form">
				<label className="field-label" htmlFor="email-list">
					Paste raw email list <span className="field-help-inline">One address per line</span>
				</label>
				<textarea
					id="email-list"
					className="verifier-textarea"
					rows={9}
					value={raw}
					onChange={(event) => setRaw(event.target.value)}
					placeholder="user@example.com&#10;another@example.org"
				/>
				<div className="verifier-actions">
					<span className="muted">{raw.split(/[\s,;]+/).filter(Boolean).length} address(es)</span>
					<button
						className="verifier-submit"
						onClick={run}
						aria-busy={busy}
						disabled={busy || !raw.trim()}
					>
						{busy && <LoaderCircle className="button-spinner" size={15} aria-hidden="true" />}
						{busy ? 'Checking email list…' : 'Verify list'}
					</button>
				</div>
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
			</section>
			{result && (
				<section className="panel verifier-results">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">VERIFICATION RESULTS</p>
							<h2>Verification report</h2>
						</div>
						<button
							className="button-secondary icon-button"
							onClick={copyResult}
							disabled={copying}
						>
							{copying ? (
								<LoaderCircle className="button-spinner" size={15} aria-hidden="true" />
							) : (
								<Clipboard size={15} aria-hidden="true" />
							)}
							{copying ? 'Copying report…' : 'Copy report'}
						</button>
					</div>
					{result.message && <p className="verifier-result-message">{result.message}</p>}
					{result.tables.map((table, tableIndex) => (
						<div className="verifier-table-wrap" key={`table-${tableIndex}`}>
							<table className="verifier-results-table">
								{table.headers.length > 0 && (
									<thead>
										<tr>
											{table.headers.map((header, index) => (
												<th key={`header-${index}`}>{header}</th>
											))}
										</tr>
									</thead>
								)}
								<tbody>
									{table.rows.map((row, rowIndex) => (
										<tr key={`row-${rowIndex}`}>
											{row.map((cell, cellIndex) => (
												<td key={`cell-${cellIndex}`}>{cell}</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					))}
					{result.details && <p className="verifier-result-details">{result.details}</p>}
				</section>
			)}
		</>
	);
}
