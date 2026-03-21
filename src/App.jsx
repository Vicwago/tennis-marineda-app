import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PadelMatchApp from './components/PadelMatchApp';
import Login from './components/Login';
import Register from './components/Register';
import NewsFeed from './components/News/NewsFeed';

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const { setSport } = useGame();
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

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

  // Route: News
  if (currentPath === '/noticias') {
    return (
      <div className="min-h-screen pb-20" style={{ background: 'var(--bg-deepest)' }}>
        <NewsFeed onBack={() => {
          setSport(null);
          navigate('/');
        }} />
      </div>
    );
  }

  // Route: Register
  if (!isAuthenticated && currentPath === '/register') {
    return <Register onNavigateToLogin={() => navigate('/')} />;
  }

  // Auth guard
  if (!isAuthenticated) {
    return <Login onNavigateToRegister={() => navigate('/register')} />;
  }

  return (
    <NotificationProvider>
      <PadelMatchApp onNavigate={navigate} currentPath={currentPath} />
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
