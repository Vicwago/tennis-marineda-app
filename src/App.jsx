import React, { Suspense, lazy } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PadelMatchApp from './components/PadelMatchApp';
import Login from './components/Login';
import logoUrl from './assets/logo.png';

// Rutas secundarias: se cargan solo cuando se visitan (reduce el bundle inicial)
const Register = lazy(() => import('./components/Register'));
const NewsFeed = lazy(() => import('./components/News/NewsFeed'));

// ─── Theme management ───────────────────────────────────────────
const getInitialTheme = () => {
  try { return localStorage.getItem('marineda-theme') || 'dark'; } catch { return 'dark'; }
};
const applyTheme = (theme) => {
  if (theme === 'light') document.documentElement.classList.add('light');
  else document.documentElement.classList.remove('light');
};
// Apply immediately (before first render) to avoid flash
applyTheme(getInitialTheme());

const SplashScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center cyber-grid-bg relative overflow-hidden">
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(229,57,53,0.12) 0%, transparent 70%)' }} />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 70%)' }} />
    </div>
    <div className="relative z-10 flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-2xl p-2 shadow-lg animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.15), rgba(0,212,255,0.08))', border: '1px solid rgba(229,57,53,0.3)' }}>
        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
      </div>
      <p className="text-sm font-bold" style={{ color: 'var(--text-2)' }}>Cargando...</p>
    </div>
  </div>
);

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const { setSport } = useGame();
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
  const [theme, setTheme] = React.useState(getInitialTheme);

  const toggleTheme = React.useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('marineda-theme', next); } catch {}
      return next;
    });
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Handle browser back/forward buttons
  React.useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Splash screen while checking auth
  if (loading) {
    return <SplashScreen />;
  }

  // Route: News
  if (currentPath === '/noticias') {
    return (
      <div className="min-h-screen pb-20" style={{ background: 'var(--bg-deepest)' }}>
        <Suspense fallback={<SplashScreen />}>
          <NewsFeed onBack={() => {
            setSport(null);
            navigate('/');
          }} />
        </Suspense>
      </div>
    );
  }

  // Route: Register
  if (!isAuthenticated && currentPath === '/register') {
    return (
      <Suspense fallback={<SplashScreen />}>
        <Register onNavigateToLogin={() => navigate('/')} />
      </Suspense>
    );
  }

  // Auth guard
  if (!isAuthenticated) {
    return <Login onNavigateToRegister={() => navigate('/register')} />;
  }

  return (
    <NotificationProvider>
      <PadelMatchApp onNavigate={navigate} currentPath={currentPath} theme={theme} onToggleTheme={toggleTheme} />
    </NotificationProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
