import { Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import Analytics from '@/pages/Analytics';
import Campaigns from '@/pages/Campaigns';
import Dashboard from '@/pages/Dashboard';
import Guide from '@/pages/Guide';
import History from '@/pages/History';
import Scraper from '@/pages/Scraper';
import Login from '@/pages/Login';
import Sms from '@/pages/Sms';
import Verifier from '@/pages/Verifier';

export default function App() {
	return (
		<Routes>
			<Route path="/login" element={<Login />} />
			<Route element={<Layout />}>
				<Route index element={<Dashboard />} />
				<Route path="scraper" element={<Scraper />} />
				<Route path="verify" element={<Verifier />} />
				<Route path="campaigns" element={<Campaigns />} />
				<Route path="sms" element={<Sms />} />
				<Route path="guide" element={<Guide />} />
				<Route path="analytics" element={<Analytics />} />
				<Route path="history" element={<History />} />
			</Route>
		</Routes>
	);
}
