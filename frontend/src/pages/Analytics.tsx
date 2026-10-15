import { useEffect, useMemo, useState, type PointerEvent } from 'react';
import {
	Activity,
	ArrowLeft,
	Check,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	Eye,
	MousePointer2,
	MousePointerClick,
	Percent,
	RefreshCw,
	Send,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAnalytics, type AnalyticsPoint, type AnalyticsReport } from '@/services/analytics';

function formatDate(value: string): string {
	const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (dateOnly) return value;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatTimestamp(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function activityTime(value: string): number {
	const time = new Date(value).getTime();
	return Number.isNaN(time) ? 0 : time;
}

function activityKind(value: string): ChartSeries | null {
	const type = value.toLowerCase().replace(/[_-]+/g, ' ');
	if (/\b(open|opened|open event)\b/.test(type)) return 'opens';
	if (/\b(click|clicked|click event)\b/.test(type)) return 'clicks';
	if (/\b(sent|send|delivered|delivery|success)\b/.test(type)) return 'sent';
	return null;
}

type ChartSeries = 'sent' | 'opens' | 'clicks';

const chartSeries: Array<{ key: ChartSeries; label: string; className: string }> = [
	{ key: 'sent', label: 'Sent', className: 'legend-sent' },
	{ key: 'opens', label: 'Opens', className: 'legend-opens' },
	{ key: 'clicks', label: 'Clicks', className: 'legend-clicks' },
];

function LineChart({ points, notice }: { points: AnalyticsPoint[]; notice?: string }) {
	const pageSize = 13;
	const [chartPage, setChartPage] = useState(0);
	const [visibleSeries, setVisibleSeries] = useState<Record<ChartSeries, boolean>>({
		sent: true,
		opens: true,
		clicks: true,
	});
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const pageCount = Math.max(1, Math.ceil(points.length / pageSize));
	const currentPage = Math.min(chartPage, pageCount - 1);
	const pagePoints = points.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

	const chart = useMemo(() => {
		const width = 800;
		const height = 380;
		const left = 54;
		const right = 18;
		const top = 24;
		const bottom = 92;
		const plotWidth = width - left - right;
		const plotHeight = height - top - bottom;
		const rawMax = Math.max(
			1,
			...pagePoints.flatMap((point) =>
				chartSeries.filter(({ key }) => visibleSeries[key]).map(({ key }) => point[key]),
			),
		);
		const magnitude = 10 ** Math.floor(Math.log10(rawMax / 4));
		const stepRatio = rawMax / 4 / magnitude;
		const axisStep = [1, 1.5, 2, 2.5, 3, 5, 10].find((step) => step >= stepRatio)! * magnitude;
		const maxValue = Math.ceil(rawMax / axisStep) * axisStep;
		const x = (index: number) =>
			left +
			(pagePoints.length < 2 ? plotWidth / 2 : (index / (pagePoints.length - 1)) * plotWidth);
		const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;
		const coordinates = (series: ChartSeries) =>
			pagePoints.map((point, index) => ({ x: x(index), y: y(point[series]) }));
		return {
			width,
			height,
			left,
			right,
			top,
			bottom,
			plotWidth,
			plotHeight,
			maxValue,
			x,
			y,
			coordinates,
		};
	}, [pagePoints, visibleSeries]);

	if (!points.length) {
		return (
			<div className="analytics-chart-empty">
				<svg viewBox={`0 0 ${chart.width} ${chart.height}`} aria-hidden="true">
					{[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
						const y = chart.top + chart.plotHeight * ratio;
						return (
							<line
								key={ratio}
								x1={chart.left}
								x2={chart.width - chart.right}
								y1={y}
								y2={y}
								className="chart-grid-line"
							/>
						);
					})}
					<text
						x={chart.left - 10}
						y={chart.height - chart.bottom + 4}
						textAnchor="end"
						className="chart-axis-label"
					>
						0
					</text>
					<text
						x={chart.width / 2}
						y={chart.height / 2}
						textAnchor="middle"
						className="chart-empty-label"
					>
						No daily data available
					</text>
				</svg>
				<span>{notice || 'The backend did not return daily chart records.'}</span>
			</div>
		);
	}

	const labelIndexes = pagePoints.map((_, index) => index);
	const gridValues = Array.from({ length: 5 }, (_, index) =>
		Math.round((chart.maxValue * index) / 4),
	);
	const activePoint = activeIndex === null ? null : pagePoints[activeIndex];
	const activeYValues = activePoint
		? chartSeries
				.filter(({ key }) => visibleSeries[key])
				.map(({ key }) => chart.y(activePoint[key]))
		: [];
	const activeY = activeYValues.length ? Math.min(...activeYValues) : chart.top;
	const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
		const bounds = event.currentTarget.getBoundingClientRect();
		const viewX = ((event.clientX - bounds.left) / bounds.width) * chart.width;
		const plotRatio = Math.max(0, Math.min(1, (viewX - chart.left) / chart.plotWidth));
		setActiveIndex(Math.round(plotRatio * (pagePoints.length - 1)));
	};
	const pathFor = (series: ChartSeries) => {
		const coordinates = chart.coordinates(series);
		if (coordinates.length === 1) return `M ${coordinates[0].x} ${coordinates[0].y}`;
		if (!coordinates.length) return '';
		return coordinates.reduce((path, point, index) => {
			if (index === 0) return `M ${point.x} ${point.y}`;
			const previous = coordinates[index - 1];
			const beforePrevious = coordinates[Math.max(0, index - 2)];
			const next = coordinates[Math.min(coordinates.length - 1, index + 1)];
			const control1X = previous.x + (point.x - beforePrevious.x) / 6;
			const control1Y = previous.y + (point.y - beforePrevious.y) / 6;
			const control2X = point.x - (next.x - previous.x) / 6;
			const control2Y = point.y - (next.y - previous.y) / 6;
			return `${path} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${point.x} ${point.y}`;
		}, '');
	};
	const areaFor = (series: ChartSeries) => {
		const line = pathFor(series);
		if (!line) return '';
		const coordinates = chart.coordinates(series);
		const last = coordinates[coordinates.length - 1];
		const first = coordinates[0];
		return `${line} L ${last.x} ${chart.y(0)} L ${first.x} ${chart.y(0)} Z`;
	};

	return (
		<>
			<div className="analytics-chart-legend" aria-label="Toggle chart data">
				{chartSeries.map(({ key, label, className }) => (
					<button
						key={key}
						type="button"
						className={`chart-legend-toggle chart-legend-toggle-${key}${visibleSeries[key] ? ' is-active' : ' is-hidden'}`}
						aria-pressed={visibleSeries[key]}
						onClick={() => setVisibleSeries((current) => ({ ...current, [key]: !current[key] }))}
					>
						<i className={className} />
						{label}
						{visibleSeries[key] && (
							<Check className="chart-legend-check" size={13} aria-hidden="true" />
						)}
					</button>
				))}
			</div>
			<div className="chart-page-toolbar" aria-label="Graph date pages">
				<span>
					{formatDate(pagePoints[0].date)} – {formatDate(pagePoints[pagePoints.length - 1].date)}
					<b>
						Page {currentPage + 1} of {pageCount}
					</b>
				</span>
				<div>
					<button
						type="button"
						className="chart-page-button"
						onClick={() => {
							setChartPage((page) => Math.max(0, page - 1));
							setActiveIndex(null);
						}}
						disabled={currentPage === 0}
						aria-label="Previous graph dates"
					>
						<ChevronLeft size={14} aria-hidden="true" />
						Previous dates
					</button>
					<button
						type="button"
						className="chart-page-button"
						onClick={() => {
							setChartPage((page) => Math.min(pageCount - 1, page + 1));
							setActiveIndex(null);
						}}
						disabled={currentPage >= pageCount - 1}
						aria-label="Next graph dates"
					>
						Next dates
						<ChevronRight size={14} aria-hidden="true" />
					</button>
				</div>
			</div>
			<div className={`analytics-chart-stage${activePoint ? ' has-active-tooltip' : ''}`}>
				<svg
					className="analytics-line-chart"
					viewBox={`0 0 ${chart.width} ${chart.height}`}
					role="img"
					aria-label="Interactive chart of daily sent share as a percentage, opens, and clicks over time"
					onPointerMove={handlePointerMove}
					onPointerLeave={() => setActiveIndex(null)}
				>
					<defs>
						<linearGradient id="chart-plot-bg" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor="#f3f7ff" />
							<stop offset="100%" stopColor="#fbfcff" />
						</linearGradient>
						<linearGradient id="chart-sent-fill" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor="#1769f6" stopOpacity=".24" />
							<stop offset="100%" stopColor="#1769f6" stopOpacity=".015" />
						</linearGradient>
						<linearGradient id="chart-opens-fill" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor="#16885c" stopOpacity=".2" />
							<stop offset="100%" stopColor="#16885c" stopOpacity=".012" />
						</linearGradient>
						<linearGradient id="chart-clicks-fill" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor="#e5a900" stopOpacity=".2" />
							<stop offset="100%" stopColor="#e5a900" stopOpacity=".012" />
						</linearGradient>
					</defs>
					<rect
						x={chart.left}
						y={chart.top}
						width={chart.plotWidth}
						height={chart.plotHeight}
						rx="10"
						fill="url(#chart-plot-bg)"
						className="chart-plot-background"
					/>
					{pagePoints.map((point, index) => (
						<line
							key={`date-grid-${point.date}-${index}`}
							x1={chart.x(index)}
							x2={chart.x(index)}
							y1={chart.top}
							y2={chart.height - chart.bottom}
							className="chart-date-grid-line"
						/>
					))}
					{gridValues.map((value) => {
						const y = chart.y(value);
						return (
							<g key={`grid-${value}`}>
								<line
									x1={chart.left}
									x2={chart.width - chart.right}
									y1={y}
									y2={y}
									className={
										value === 0 ? 'chart-grid-line chart-grid-baseline' : 'chart-grid-line'
									}
								/>
								<text x={chart.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">
									{value.toLocaleString()}
								</text>
							</g>
						);
					})}
					{visibleSeries.sent && (
						<path d={areaFor('sent')} fill="url(#chart-sent-fill)" className="chart-area" />
					)}
					{visibleSeries.opens && (
						<path d={areaFor('opens')} fill="url(#chart-opens-fill)" className="chart-area" />
					)}
					{visibleSeries.clicks && (
						<path d={areaFor('clicks')} fill="url(#chart-clicks-fill)" className="chart-area" />
					)}
					{visibleSeries.sent && (
						<path d={pathFor('sent')} className="chart-line chart-line-sent" />
					)}
					{visibleSeries.opens && (
						<path d={pathFor('opens')} className="chart-line chart-line-opens" />
					)}
					{visibleSeries.clicks && (
						<path d={pathFor('clicks')} className="chart-line chart-line-clicks" />
					)}
					{pagePoints.map((point, index) => (
						<g key={`${point.date}-${index}`}>
							{visibleSeries.sent && (
								<circle
									cx={chart.x(index)}
									cy={chart.y(point.sent)}
									r={activeIndex === index ? 5 : 3.5}
									className="chart-point chart-point-sent"
								/>
							)}
							{visibleSeries.opens && (
								<circle
									cx={chart.x(index)}
									cy={chart.y(point.opens)}
									r={activeIndex === index ? 5 : 3.5}
									className="chart-point chart-point-opens"
								/>
							)}
							{visibleSeries.clicks && (
								<circle
									cx={chart.x(index)}
									cy={chart.y(point.clicks)}
									r={activeIndex === index ? 5 : 3.5}
									className="chart-point chart-point-clicks"
								/>
							)}
						</g>
					))}
					{activePoint && (
						<line
							x1={chart.x(activeIndex!)}
							x2={chart.x(activeIndex!)}
							y1={chart.top}
							y2={chart.height - chart.bottom}
							className="chart-hover-guide"
						/>
					)}
					{labelIndexes.map((index) => {
						const x = chart.x(index);
						const y = chart.height - 23;
						return (
							<text
								key={`date-${index}`}
								x={x}
								y={y}
								textAnchor="middle"
								transform={`rotate(-35 ${x} ${y})`}
								className="chart-axis-label chart-date-label"
							>
								{formatDate(points[index].date)}
							</text>
						);
					})}
				</svg>
				{activePoint && (
					<div
						className="chart-hover-tooltip"
						role="status"
						style={{
							left: `${Math.max(12, Math.min(88, (chart.x(activeIndex!) / chart.width) * 100))}%`,
							top: `${Math.max(22, Math.min(82, (activeY / chart.height) * 100))}%`,
						}}
					>
						<strong>{formatDate(activePoint.date)}</strong>
						<span>
							<i className="legend-sent" />
							Sent <b>{activePoint.sent.toLocaleString()}</b>
						</span>
						<span>
							<i className="legend-opens" />
							Opens <b>{activePoint.opens.toLocaleString()}</b>
						</span>
						<span>
							<i className="legend-clicks" />
							Clicks <b>{activePoint.clicks.toLocaleString()}</b>
						</span>
					</div>
				)}
			</div>
		</>
	);
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
	const radians = (angle * Math.PI) / 180;
	return { x: cx + Math.cos(radians) * radius, y: cy + Math.sin(radians) * radius };
}

function donutSegmentPath(startAngle: number, endAngle: number): string {
	const cx = 210;
	const cy = 180;
	const outerRadius = 150;
	const innerRadius = 92;
	const startOuter = polarPoint(cx, cy, outerRadius, startAngle);
	const endOuter = polarPoint(cx, cy, outerRadius, endAngle);
	const startInner = polarPoint(cx, cy, innerRadius, startAngle);
	const endInner = polarPoint(cx, cy, innerRadius, endAngle);
	const largeArc = endAngle - startAngle > 180 ? 1 : 0;
	if (endAngle - startAngle >= 359.999) {
		const middleAngle = startAngle + 180;
		const middleOuter = polarPoint(cx, cy, outerRadius, middleAngle);
		const middleInner = polarPoint(cx, cy, innerRadius, middleAngle);
		return `M ${startOuter.x} ${startOuter.y}
      A ${outerRadius} ${outerRadius} 0 1 1 ${middleOuter.x} ${middleOuter.y}
      A ${outerRadius} ${outerRadius} 0 1 1 ${startOuter.x} ${startOuter.y}
      L ${startInner.x} ${startInner.y}
      A ${innerRadius} ${innerRadius} 0 1 0 ${middleInner.x} ${middleInner.y}
      A ${innerRadius} ${innerRadius} 0 1 0 ${startInner.x} ${startInner.y} Z`;
	}
	return `M ${startOuter.x} ${startOuter.y}
    A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}
    L ${endInner.x} ${endInner.y}
    A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y} Z`;
}

function ConversionDonut({ report }: { report: AnalyticsReport }) {
	const [hovered, setHovered] = useState<ChartSeries | null>(null);
	const slices = [
		{ key: 'sent' as const, label: 'Sent', value: report.emailsSent, color: '#1769f6' },
		{ key: 'opens' as const, label: 'Opens', value: report.totalOpens, color: '#198754' },
		{ key: 'clicks' as const, label: 'Clicks', value: report.totalClicks, color: '#ffb900' },
	];
	const total = slices.reduce((sum, slice) => sum + slice.value, 0);
	const percentageOfTotal = (value: number) => (total > 0 ? (value / total) * 100 : 0);
	let angle = -90;
	const segments = slices
		.map((slice) => {
			const startAngle = angle;
			angle += total > 0 ? (slice.value / total) * 360 : 0;
			return { ...slice, startAngle, endAngle: angle, midAngle: (startAngle + angle) / 2 };
		})
		.filter((slice) => slice.value > 0);
	const selected = segments.find((segment) => segment.key === hovered);
	const tooltipPoint = selected ? polarPoint(210, 180, 116, selected.midAngle) : null;

	return (
		<div className="conversion-visual">
			<div className="conversion-donut-stage">
				<svg
					className="conversion-donut"
					viewBox="0 0 420 360"
					role="group"
					aria-label={`Sent ${report.emailsSent.toLocaleString()}, opens ${report.totalOpens.toLocaleString()}, clicks ${report.totalClicks.toLocaleString()}`}
					onPointerLeave={() => setHovered(null)}
				>
					{segments.map((segment) => (
						<path
							key={segment.key}
							d={donutSegmentPath(segment.startAngle, segment.endAngle)}
							fill={segment.color}
							stroke="var(--surface)"
							strokeWidth="1"
							tabIndex={0}
							role="button"
							aria-label={`${segment.label}: ${segment.value.toLocaleString()}`}
							onPointerEnter={() => setHovered(segment.key)}
							onFocus={() => setHovered(segment.key)}
							onBlur={() => setHovered(null)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									setHovered(segment.key);
								}
							}}
						/>
					))}
				</svg>
				{selected && tooltipPoint && (
					<div
						className="conversion-tooltip"
						role="status"
						style={{
							left: `${(tooltipPoint.x / 420) * 100}%`,
							top: `${(tooltipPoint.y / 360) * 100}%`,
						}}
					>
						<strong>{selected.label}</strong>
						<span>
							<i style={{ background: selected.color }} />
							{selected.value.toLocaleString()}
						</span>
					</div>
				)}
			</div>
			<div className="conversion-legend">
				{slices.map((slice) => (
					<span key={slice.key}>
						<i style={{ background: slice.color }} />
						{slice.label}
					</span>
				))}
			</div>
			<div className="conversion-breakdown" aria-label="Conversion metrics">
				<div className="conversion-breakdown-item">
					<span>
						<i className="legend-sent" />
						Sent
					</span>
					<strong>{percentageOfTotal(report.emailsSent).toFixed(1)}%</strong>
					<small>
						{report.emailsSent.toLocaleString()} of {total.toLocaleString()} total
					</small>
				</div>
				<div className="conversion-breakdown-item">
					<span>
						<i className="legend-opens" />
						Opens
					</span>
					<strong>{percentageOfTotal(report.totalOpens).toFixed(1)}%</strong>
					<small>
						{report.totalOpens.toLocaleString()} of {total.toLocaleString()} total
					</small>
				</div>
				<div className="conversion-breakdown-item">
					<span>
						<i className="legend-clicks" />
						Clicks
					</span>
					<strong>{percentageOfTotal(report.totalClicks).toFixed(1)}%</strong>
					<small>
						{report.totalClicks.toLocaleString()} of {total.toLocaleString()} total
					</small>
				</div>
			</div>
		</div>
	);
}

function ActivityTable({ entries }: { entries: AnalyticsReport['recentActivity'] }) {
	const pageSize = 50;
	const [page, setPage] = useState(0);
	const matchingEntries = entries
		.filter((entry) => activityKind(entry.type) !== null)
		.sort((a, b) => activityTime(b.timestamp) - activityTime(a.timestamp));
	const pageCount = Math.max(1, Math.ceil(matchingEntries.length / pageSize));
	const currentPage = Math.min(page, pageCount - 1);
	const visibleEntries = matchingEntries.slice(
		currentPage * pageSize,
		(currentPage + 1) * pageSize,
	);
	return visibleEntries.length ? (
		<>
			<div className="activity-table-summary">
				<span>Latest email events</span>
				<strong>
					Showing {currentPage * pageSize + 1}–{currentPage * pageSize + visibleEntries.length} of{' '}
					{matchingEntries.length}
				</strong>
			</div>
			<div className="analytics-activity-scroll">
				<table className="analytics-activity-table">
					<thead>
						<tr>
							<th>Date &amp; time</th>
							<th>Event</th>
							<th>Email</th>
							<th>Details</th>
						</tr>
					</thead>
					<tbody>
						{visibleEntries.map((entry, index) => {
							const kind = activityKind(entry.type)!;
							const label = kind === 'opens' ? 'Opened' : kind === 'clicks' ? 'Clicked' : 'Sent';
							return (
								<tr key={`${entry.timestamp}-${entry.recipient}-${index}`}>
									<td>
										<time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
									</td>
									<td>
										<span className={`activity-badge activity-${kind}`}>{label}</span>
									</td>
									<td className="activity-recipient">{entry.recipient}</td>
									<td title={entry.details}>{entry.details || '—'}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<div className="activity-pagination" aria-label="Email activity pages">
				<span>
					50 events per page · Page {currentPage + 1} of {pageCount}
				</span>
				<div>
					<button
						type="button"
						className="activity-page-button"
						onClick={() => setPage((value) => Math.max(0, value - 1))}
						disabled={currentPage === 0}
						aria-label="Previous activity page"
					>
						<ChevronLeft size={15} aria-hidden="true" />
						Previous
					</button>
					<button
						type="button"
						className="activity-page-button"
						onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
						disabled={currentPage >= pageCount - 1}
						aria-label="Next activity page"
					>
						Next
						<ChevronRight size={15} aria-hidden="true" />
					</button>
				</div>
			</div>
		</>
	) : (
		<div className="analytics-activity-empty">
			No sent, open, or click events were returned by analytics.
		</div>
	);
}

export default function Analytics() {
	const [report, setReport] = useState<AnalyticsReport | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const loadReport = async () => {
		setLoading(true);
		setError('');
		try {
			setReport(await getAnalytics());
		} catch (loadError) {
			setError(
				loadError instanceof Error ? loadError.message : 'Could not load campaign analytics.',
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadReport();
	}, []);

	return (
		<div className="analytics-page">
			<header className="analytics-page-heading">
				<div>
					<h1>
						<Activity size={24} aria-hidden="true" />
						Campaign Analytics
					</h1>
					<p>Live tracking metrics for your campaigns</p>
				</div>
				<div className="analytics-page-actions">
					<Link className="button-secondary icon-button" to="/history">
						<ClipboardList size={15} aria-hidden="true" />
						Raw Logs
					</Link>
					<Link className="button-link icon-button" to="/">
						<ArrowLeft size={15} aria-hidden="true" />
						Dashboard
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
					Loading campaign analytics…
				</div>
			)}
			{!loading && !report && (
				<section className="panel analytics-load-error">
					<p>Analytics could not be loaded from the backend.</p>
					<button className="button-secondary icon-button" onClick={() => void loadReport()}>
						<RefreshCw size={15} aria-hidden="true" />
						Try again
					</button>
				</section>
			)}
			{report && (
				<>
					<section className="analytics-metrics" aria-label="Campaign metrics">
						<article className="analytics-metric metric-sent">
							<div className="analytics-metric-heading">
								<i>
									<Send size={15} aria-hidden="true" />
								</i>
								<span>Emails sent</span>
							</div>
							<strong>{report.emailsSent.toLocaleString()}</strong>
						</article>
						<article className="analytics-metric metric-opens">
							<div className="analytics-metric-heading">
								<i>
									<Eye size={15} aria-hidden="true" />
								</i>
								<span>Total opens</span>
							</div>
							<strong>{report.totalOpens.toLocaleString()}</strong>
						</article>
						<article className="analytics-metric metric-open-rate">
							<div className="analytics-metric-heading">
								<i>
									<Percent size={15} aria-hidden="true" />
								</i>
								<span>Open rate</span>
							</div>
							<strong>{report.openRate.toFixed(1)}%</strong>
						</article>
						<article className="analytics-metric metric-clicks">
							<div className="analytics-metric-heading">
								<i>
									<MousePointer2 size={15} aria-hidden="true" />
								</i>
								<span>Total clicks</span>
							</div>
							<strong>{report.totalClicks.toLocaleString()}</strong>
						</article>
						<article className="analytics-metric metric-ctor">
							<div className="analytics-metric-heading">
								<i>
									<MousePointerClick size={15} aria-hidden="true" />
								</i>
								<span>Click-to-open rate</span>
							</div>
							<strong>{report.clickToOpenRate.toFixed(1)}%</strong>
						</article>
					</section>

					<section className="analytics-visual-grid">
						<article className="panel analytics-chart-panel">
							<div className="analytics-chart-heading">
								<h2>Campaign performance</h2>
								{report.timeline.length > 0 && (
									<span>
										{formatDate(report.timeline[0].date)} –{' '}
										{formatDate(report.timeline[report.timeline.length - 1].date)}
										<b>{report.timeline.length} dates total</b>
									</span>
								)}
							</div>
							<LineChart points={report.timeline} notice={report.timelineNotice} />
						</article>
						<article className="panel analytics-funnel-panel">
							<h2>Conversion Funnel</h2>
							<ConversionDonut report={report} />
						</article>
					</section>

					<section className="panel analytics-activity-panel">
						<div className="panel-heading">
							<h2>Email activity</h2>
							<span>From analytics · latest 50 events</span>
						</div>
						<ActivityTable entries={report.recentActivity} />
					</section>
				</>
			)}
		</div>
	);
}
