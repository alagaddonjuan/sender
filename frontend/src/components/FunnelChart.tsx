import type { FunnelStats } from '@/types';

export default function FunnelChart({ stats }: { stats: FunnelStats }) {
	const rows: [string, number][] = [
		['Sent', stats.sent],
		['Delivered', stats.delivered],
		['Opened', stats.opened],
		['Clicked', stats.clicked],
	];
	const max = Math.max(1, stats.sent);
	return (
		<div className="funnel">
			{rows.map(([label, n]) => (
				<div key={label} className="funnel-row">
					<span>{label}</span>
					<div className="bar">
						<div style={{ width: `${(n / max) * 100}%` }} />
					</div>
					<b>{n}</b>
				</div>
			))}
		</div>
	);
}
