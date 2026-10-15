import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as auth from '@/services/auth';
import type { SessionUser } from '@/types';

interface AuthCtx {
	user: SessionUser | null;
	loading: boolean;
	signIn: (password: string) => Promise<void>;
	signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<SessionUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setUser(auth.getSession());
		setLoading(false);
		const expireSession = () => setUser(null);
		window.addEventListener('q4-api-unauthorized', expireSession);
		return () => window.removeEventListener('q4-api-unauthorized', expireSession);
	}, []);

	const signIn = async (password: string) => {
		setUser(await auth.login(password));
	};

	const signOut = async () => {
		try {
			await auth.logout();
			setUser(null);
		} catch (logoutError) {
			throw logoutError;
		}
	};

	return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
	const value = useContext(Ctx);
	if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
	return value;
}
