import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { useApp } from './lib/AppContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { EmptyState, ErrorBoundary } from './components/ui';
import Home from './pages/Home';
import Files from './pages/Files';
import Notes from './pages/Notes';
import Tools from './pages/Tools';
import Settings from './pages/Settings';
import SearchPage from './pages/SearchPage';
import Viewer from './pages/Viewer';
import ResetPassword from './pages/ResetPassword';
import GuestBanner from './components/GuestBanner';
import { Link } from 'react-router-dom';

export default function App() {
  const { user } = useApp();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-screen min-h-[100dvh]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setMenu(true)} />
        <GuestBanner />
        <main id="main" className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6" key={user ? user._id : 'guest'}>
          <ErrorBoundary resetKey={pathname}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/files" element={<Files mode="all" />} />
              <Route path="/recent" element={<Files mode="recent" />} />
              <Route path="/favorites" element={<Files mode="favorites" />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/doc/:id" element={<Viewer />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<EmptyState icon={FileQuestion} title="Page not found" text="That page doesn't exist." action={<Link to="/" className="btn btn-primary">Go home</Link>} />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
