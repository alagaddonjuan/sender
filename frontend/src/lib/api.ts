import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';

const apiBase = import.meta.env.DEV ? '/q4-api' : '..';

const client = axios.create({
	baseURL: apiBase,
	withCredentials: true,
	headers: { Accept: 'application/json' },
});

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

function messageFromResponse(data: unknown, fallback: string): string {
	if (typeof data === 'string') {
		try {
			const parsed: unknown = JSON.parse(data);
			if (
				parsed &&
				typeof parsed === 'object' &&
				'error' in parsed &&
				typeof parsed.error === 'string'
			) {
				return parsed.error;
			}
		} catch {
			return data.trim() || fallback;
		}
		return data.trim() || fallback;
	}
	if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
		return data.error;
	}
	return fallback;
}

export async function apiResponse<T>(
	path: string,
	config: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> {
	try {
		const response = await client.request<T>({ url: path, ...config });
		const responseUrl = response.request?.responseURL ?? '';
		if (
			/\/(?:login\.php|index\.php)(?:[?#]|$)/.test(responseUrl) &&
			!/\/(?:login\.php|index\.php)/.test(path)
		) {
			sessionStorage.removeItem('q4iltd-api-session');
			window.dispatchEvent(new Event('q4-api-unauthorized'));
			throw new ApiError(401, 'Your backend session has expired. Sign in again.');
		}
		return response;
	} catch (error) {
		if (error instanceof ApiError) throw error;
		if (axios.isAxiosError(error)) {
			const requestError = error as AxiosError<unknown>;
			if (requestError.response?.status === 401) {
				sessionStorage.removeItem('q4iltd-api-session');
				window.dispatchEvent(new Event('q4-api-unauthorized'));
			}
			throw new ApiError(
				requestError.response?.status ?? 0,
				messageFromResponse(
					requestError.response?.data,
					requestError.message || 'The API request failed.',
				).slice(0, 1200),
			);
		}
		throw error;
	}
}

export async function api<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
	return (await apiResponse<T>(path, config)).data;
}
