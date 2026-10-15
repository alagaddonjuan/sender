import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getHistory, type HistoryEntry } from '@/services/analytics';

function formatTimestamp(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function History() {
	const [entries, setEntries] = useState<HistoryEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [filter, setFilter] = useState('');

	const loadHistory = async () => {
		setLoading(true);
		setError('');
		try {
			setEntries(await getHistory());
		} catch (loadError) {
			setError(
				loadError instanceof Error ? loadError.message : 'Could not load transmission history.',
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadHistory();
	}, []);

	const filteredEntries = useMemo(() => {
		const query = filter.trim().toLowerCase();
		return query
			? entries.filter((entry) =>
					`${entry.timestamp} ${entry.status} ${entry.recipient} ${entry.subject}`
						.toLowerCase()
						.includes(query),
				)
			: entries;
	}, [entries, filter]);

	return (
		<div className="history-page">
			<header className="history-page-heading">
				<div>
					<p className="eyebrow">CAMPAIGN RECORDS</p>
					<h1>Transmission History</h1>
					<p>Recent messages reported by the Q4 backend.</p>
				</div>
				<div className="history-page-actions">
					<Link className="button-secondary icon-button" to="/analytics">
						<ArrowLeft size={15} aria-hidden="true" />
						Back to Analytics
					</Link>
					<Link className="button-link" to="/campaigns">
						Back to Mailer
					</Link>
				</div>
			</header>

			{error && (
				<div className="inline-alert alert-error" role="alert">
					{error}
				</div>
			)}
			{loading && (
				<div className="analytics-loading" role="status">
					Loading transmission history…
				</div>
			)}
			{!loading && error && (
				<button className="button-secondary icon-button" onClick={() => void loadHistory()}>
					<RefreshCw size={15} aria-hidden="true" />
					Try again
				</button>
			)}
			{!loading && !error && (
				<section className="panel history-table-panel">
					<div className="history-table-toolbar">
						<span>
							{filteredEntries.length.toLocaleString()} transmission
							{filteredEntries.length === 1 ? '' : 's'}
						</span>
						<input
							aria-label="Search transmission history"
							value={filter}
							onChange={(event) => setFilter(event.target.value)}
							placeholder="Search recipient or subject"
						/>
					</div>
					{filteredEntries.length ? (
						<div className="history-table-scroll">
							<table className="history-table">
								<thead>
									<tr>
										<th>Timestamp</th>
										<th>Status</th>
										<th>Recipient</th>
										<th>Subject</th>
									</tr>
								</thead>
								<tbody>
									{filteredEntries.map((entry, index) => (
										<tr key={`${entry.timestamp}-${entry.recipient}-${index}`}>
											<td>{formatTimestamp(entry.timestamp)}</td>
											<td>
												<span
													className={`history-status history-status-${entry.status.toLowerCase()}`}
												>
													{entry.status}
												</span>
											</td>
											<td>{entry.recipient}</td>
											<td>{entry.subject || '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className="history-empty">
							{filter
								? 'No transmissions match your search.'
								: 'The backend returned no transmission history.'}
						</div>
					)}
				</section>
			)}
		</div>
	);
}
