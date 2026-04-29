import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { Droplets, WifiOff, LogOut, User as UserIcon } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserInput from './pages/UserInput';
import VoiceInput from './pages/VoiceInput';
import Dashboard from './pages/Dashboard';
import MentorPanel from './pages/MentorPanel';
import Profile from './pages/Profile';
import Support from './pages/Support';
import Onboarding from './components/Onboarding';
import IvrCall from './pages/IvrCall';
import { offlineStore } from './store';

const AnimatedRoutes = ({ showOnboarding, setOnboarding }: { showOnboarding: boolean, setOnboarding: (val: boolean) => void }) => {
  const location = useLocation();
  
  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
          <Route path="/signup" element={<PageWrapper><Signup /></PageWrapper>} />
          <Route path="/input" element={<PageWrapper><UserInput /></PageWrapper>} />
          <Route path="/voice" element={<PageWrapper><VoiceInput /></PageWrapper>} />
          <Route path="/ivr" element={<PageWrapper><IvrCall /></PageWrapper>} />
          <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
          <Route path="/mentor" element={<PageWrapper><MentorPanel /></PageWrapper>} />
          <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
          <Route path="/support" element={<PageWrapper><Support /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
      {showOnboarding && <Onboarding onComplete={() => setOnboarding(false)} />}
    </>
  );
};

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="flex-center"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-bg)',
        zIndex: 9999,
        flexDirection: 'column'
      }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
      >
        <Droplets size={80} color="var(--color-primary)" />
      </motion.div>
      <motion.h1
        style={{ marginTop: '2rem', fontSize: '3rem', letterSpacing: '4px', textShadow: '0 0 20px var(--color-primary-glow)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        JAL-CHAKRA
      </motion.h1>
      <motion.div
        style={{ width: '200px', height: '4px', background: 'var(--color-surface)', borderRadius: '2px', marginTop: '2rem', overflow: 'hidden' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.div
          style={{ height: '100%', background: 'var(--color-primary)', borderRadius: '2px' }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
        />
      </motion.div>
    </motion.div>
  );
};

const App = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(offlineStore.getRecords().length);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const checkOnboarding = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'NORMAL_USER' && !user.profile_completed) {
          setShowOnboarding(true);
        } else {
          setShowOnboarding(false);
        }
      }
    };

    checkOnboarding();
    // Listen for storage changes (login)
    window.addEventListener('storage', checkOnboarding);

    const handleOnline = () => {
      setIsOffline(false);
      offlineStore.syncRecords().then(() => {
        setUnsyncedCount(offlineStore.getRecords().length);
      });
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setUnsyncedCount(offlineStore.getRecords().length);
      checkOnboarding(); // Re-check periodically or on navigation
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', checkOnboarding);
      clearInterval(interval);
    };
  }, []);

  return (
    <BrowserRouter>
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>

      {!showSplash && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 0.5, delay: 0.2 }}
          className="app-wrapper"
        >
          <Toaster position="top-right" toastOptions={{
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              backdropFilter: 'blur(10px)'
            }
          }} />
          
          {isOffline && (
            <div className="offline-banner">
              <WifiOff size={16} style={{ display: 'inline', marginRight: '8px' }} />
              Offline Mode: Data will sync automatically when connected.
            </div>
          )}
          
          <header className="nav-bar">
            <Link to="/" className="nav-brand" style={{ textDecoration: 'none' }}>
              <Droplets size={28} color="var(--color-primary)" />
              JAL-CHAKRA
            </Link>
            <div className="flex-center gap-4">
              {unsyncedCount > 0 && (
                <span className="badge badge-yellow">
                  {unsyncedCount} Pending Sync
                </span>
              )}
              <LogoutButton />
            </div>
          </header>

          <main className="container" style={{ flex: 1 }}>
            <AnimatedRoutes showOnboarding={showOnboarding} setOnboarding={setShowOnboarding} />
          </main>
        </motion.div>
      )}
    </BrowserRouter>
  );
};

const LogoutButton = () => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  
  if (!userStr) return null;
  const user = JSON.parse(userStr);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="flex-center gap-4">
      <div 
        className="flex-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
        style={{ fontSize: '0.875rem' }}
        onClick={() => navigate('/profile')}
        title="Edit Profile"
      >
        <div style={{ background: 'var(--color-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <UserIcon size={16} />
        </div>
        <div className="hidden md:block">
          <div className="font-bold leading-none">{user.full_name || user.username}</div>
          <div className="text-[10px] text-muted">{user.role.replace('_', ' ')}</div>
        </div>
      </div>
      <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={handleLogout}>
        <LogOut size={16} />
      </button>
    </div>
  );
};

export default App;
