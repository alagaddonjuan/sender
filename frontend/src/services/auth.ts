import { api, apiResponse } from '@/lib/api';
import type { SessionUser } from '@/types';

export async function login(password: string): Promise<SessionUser> {
	const form = new FormData();
	form.append('password', password);
	const response = await apiResponse<string>('/login.php', {
		method: 'POST',
		data: form,
		responseType: 'text',
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	const responseUrl = response.request.responseURL ?? '';
	if (/[?&]error=1(?:&|$)/.test(responseUrl) || /index\.php\?error=1/.test(response.data)) {
		throw new Error('Incorrect backend password.');
	}
	if (!/index\.php(?:[?#]|$)/.test(responseUrl)) {
		throw new Error('The backend did not confirm the login session.');
	}
	sessionStorage.setItem('q4iltd-api-session', 'active');
	return { id: 'api-session', email: '', name: 'Q4 Workspace' };
}

export async function logout(): Promise<void> {
	await api<string>('/index.php?logout=1', { method: 'GET', responseType: 'text' });
	sessionStorage.removeItem('q4iltd-api-session');
}

export function getSession(): SessionUser | null {
	if (typeof window !== 'undefined') {
		const searchParams = new URLSearchParams(window.location.search);
		if (searchParams.get('session') === 'active' || searchParams.get('auth') === '1') {
			sessionStorage.setItem('q4iltd-api-session', 'active');
			searchParams.delete('session');
			searchParams.delete('auth');
			const newSearch = searchParams.toString();
			const newUrl =
				window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
			window.history.replaceState({}, '', newUrl);
		}
	}
	return sessionStorage.getItem('q4iltd-api-session') === 'active'
		? { id: 'api-session', email: '', name: 'Q4 Workspace' }
		: null;
}

