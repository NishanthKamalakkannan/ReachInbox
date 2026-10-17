import React from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Loading } from './components/Loading';

export const App: React.FC = () => {
  const {
    user,
    loading,
    slackStatus,
    logout,
    loginWithDemo,
    disconnectSlack,
    refreshSlack,
  } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loading message="Authenticating ReachInbox session..." size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Login onDemoLogin={loginWithDemo} />;
  }

  return (
    <Dashboard
      user={user}
      slackStatus={slackStatus}
      onLogout={logout}
      onDisconnectSlack={disconnectSlack}
      onRefreshSlack={refreshSlack}
    />
  );
};

export default App;
