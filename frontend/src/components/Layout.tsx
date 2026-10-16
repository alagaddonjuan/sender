import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import {
	ArrowLeft,
	BookOpen,
	Activity,
	LayoutDashboard,
	LogOut,
	Menu,
	MessageSquareText,
	Search,
	Send,
	ShieldCheck,
	X,
	type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const links = [
	{ to: '/', label: 'Dashboard', icon: LayoutDashboard },
	{ to: '/scraper', label: 'Step 1 · Scraper', icon: Search },
	{ to: '/verify', label: 'Step 2 · Verifier', icon: ShieldCheck },
	{ to: '/campaigns', label: 'Step 3 · Mailer', icon: Send },
	{ to: '/analytics', label: 'Campaign analytics', icon: Activity },
	{ to: '/sms', label: 'SMS broadcast', icon: MessageSquareText },
	{ to: '/guide', label: 'Platform guide', icon: BookOpen },
] as const;

export default function Layout() {
	const { user, loading, signOut } = useAuth();
	const location = useLocation();
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const [signOutError, setSignOutError] = useState('');
	const currentPage = links.find(({ to }) => to === location.pathname)?.label ?? 'Q4iltd workspace';

	useEffect(() => {
		setMobileNavOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		if (!mobileNavOpen) return undefined;

		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setMobileNavOpen(false);
		};
		document.addEventListener('keydown', closeOnEscape);
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', closeOnEscape);
			document.body.style.overflow = '';
		};
	}, [mobileNavOpen]);

	if (loading) return <p className="center">Loading your workspace…</p>;
	if (!user) return <Navigate to="/login" replace />;
	const handleSignOut = async () => {
		setSignOutError('');
		try {
			await signOut();
		} catch (signOutFailure) {
			setSignOutError(
				signOutFailure instanceof Error ? signOutFailure.message : 'Could not sign out.',
			);
		}
	};

	return (
		<div className="shell">
			{mobileNavOpen && (
				<button
					className="mobile-nav-backdrop"
					aria-label="Close navigation menu"
					onClick={() => setMobileNavOpen(false)}
				/>
			)}
			<aside
				id="workspace-navigation"
				className={`sidebar${mobileNavOpen ? ' mobile-open' : ''}`}
				aria-label="Workspace navigation"
			>
				<Link className="brand-lockup" to="/" aria-label="Q4iltd home">
					<span className="brand-mark" aria-hidden="true">
						Q4
					</span>
					<span>
						<strong>Q4iltd</strong>
						<small>Q4 WORKSPACE (BETA)</small>
					</span>
				</Link>
				<button
					className="mobile-nav-close"
					aria-label="Close navigation menu"
					onClick={() => setMobileNavOpen(false)}
				>
					<X size={19} aria-hidden="true" />
				</button>
				<div className="nav-caption">YOUR WORKSPACE</div>
				<nav aria-label="Workspace">
					{links.map(
						({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) => (
							<NavLink
								key={to}
								to={to}
								end={to === '/'}
								onClick={() => setMobileNavOpen(false)}
								className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
							>
								<Icon className="nav-icon" size={17} strokeWidth={1.8} aria-hidden="true" />
								<span>{label}</span>
							</NavLink>
						),
					)}
				</nav>
				<div style={{ padding: '0.75rem 1rem 0.25rem' }}>
					<a
						href="../index.php"
						className="nav-link"
						style={{
							backgroundColor: 'rgba(255, 255, 255, 0.08)',
							border: '1px solid rgba(255, 255, 255, 0.15)',
							color: '#e2e8f0',
							fontWeight: 600,
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							padding: '8px 12px',
							borderRadius: '8px',
							textDecoration: 'none',
						}}
					>
						<ArrowLeft size={16} aria-hidden="true" />
						<span>Classic Version</span>
					</a>
				</div>
				<div className="sidebar-bottom">
					<div className="workspace-account">
						<span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
						<span className="account-copy">
							<strong>{user.name}</strong>
							<small>Workspace account</small>
						</span>
					</div>
					<button className="signout-button" onClick={handleSignOut}>
						<LogOut size={15} aria-hidden="true" />
						Sign out
					</button>
				</div>
			</aside>
			<main className="main-area">
				<div className="topbar">
					<div className="topbar-leading">
						<button
							className="mobile-nav-toggle"
							type="button"
							aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
							aria-expanded={mobileNavOpen}
							aria-controls="workspace-navigation"
							onClick={() => setMobileNavOpen((open) => !open)}
						>
							<Menu size={19} aria-hidden="true" />
						</button>
						<div className="topbar-breadcrumb">
							<Link to="/">Workspace</Link>
							<span className="topbar-separator">/</span>
							<span>{currentPage}</span>
						</div>
					</div>
					<div className="topbar-actions">
						<a
							href="../index.php"
							className="topbar-status"
							style={{
								textDecoration: 'none',
								color: '#0f172a',
								backgroundColor: '#f1f5f9',
								border: '1px solid #cbd5e1',
								fontWeight: 600,
								cursor: 'pointer',
								display: 'inline-flex',
								alignItems: 'center',
								gap: '6px',
							}}
							title="Return to Classic PHP Dashboard"
						>
							<ArrowLeft size={14} aria-hidden="true" />
							<span>Classic Version</span>
						</a>
						<span className="topbar-status">
							<span className="status-dot" />
							Q4 API
						</span>
						<button className="topbar-signout" onClick={handleSignOut}>
							Sign out
						</button>
					</div>
				</div>
				{signOutError && (
					<p className="inline-alert alert-error" role="alert">
						{signOutError}
					</p>
				)}
				<div className="content">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
