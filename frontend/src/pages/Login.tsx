import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
	const { user, signIn } = useAuth();
	const nav = useNavigate();
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);

	if (user) return <Navigate to="/" replace />;

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setError('');
		try {
			await signIn(password);
			nav('/');
		} catch (signInError) {
			setError(signInError instanceof Error ? signInError.message : 'Could not sign in.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<form className="card login" onSubmit={submit}>
			<Link className="login-brand" to="/" aria-label="Q4iltd home">
				<span className="brand-mark" aria-hidden="true">
					Q4
				</span>
				<span>
					<strong>Q4iltd</strong>
					<small>Q4 WORKSPACE</small>
				</span>
			</Link>
			<div className="login-intro">
				<p className="eyebrow">WELCOME BACK</p>
				<h1>Sign in to your workspace</h1>
				<p>Manage your audience, email campaigns, and results in one place.</p>
			</div>
			<label className="field-label" htmlFor="login-password">
				Password
				<input
					id="login-password"
					type="password"
					autoComplete="current-password"
					placeholder="Enter your password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
			</label>
			{error && <p className="error">{error}</p>}
			<button className="login-submit" disabled={busy}>
				{busy ? 'Signing in…' : 'Sign in to Q4iltd'}
				<ArrowRight size={16} aria-hidden="true" />
			</button>
			<p className="login-footer">
				Unlock your Q4 mailer session using the backend access password.
			</p>
		</form>
	);
}
