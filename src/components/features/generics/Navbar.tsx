import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase.ts';
import { useAuth } from '../../../hooks/auth/useAuth.ts';
import { useTheme } from '../../../hooks/misc/useTheme.ts';
import styles from './Navbar.module.css';

const PersonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={styles.icon}
  >
    <path
      fillRule="evenodd"
      d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
      clipRule="evenodd"
    />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.icon}>
    <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
  </svg>
);

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.icon}>
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.themeIcon}>
    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.themeIcon}>
    <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
  </svg>
);

const Navbar: React.FC = () => {
  const { user, loading, is_admin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile`,
        scopes: 'https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.leftContainer}>
        <Link to="/" className={styles.navLink}>
          <HomeIcon />
          <span className={styles.navText}>Timetable</span>
        </Link>
        {is_admin && (
          <Link to="/add" className={styles.navLink}>
            <PlusIcon />
            <span className={styles.navText}>Add Content</span>
          </Link>
        )}
      </div>
      <div className={styles.rightContainer}>
        {loading ? (
          <span className={styles.navLink}>Loading...</span>
        ) : !user ? (
          <button onClick={handleGoogleSignIn} className={styles.grayButton}>
            Login with Google
          </button>
        ) : (
          <Link to="/profile" className={styles.navLink}>
            <PersonIcon />
            <span className={styles.navText}>Hello, {user.user_metadata?.full_name || user.email}</span>
          </Link>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.themeToggle}
          title={theme === 'light' ? 'Light mode (click to switch to Dark)' : 'Dark mode (click to switch to Light)'}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          data-testid="theme-toggle-btn"
        >
          {theme === 'light' ? <SunIcon /> : <MoonIcon />}
          <span className={styles.themeToggleText}>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
