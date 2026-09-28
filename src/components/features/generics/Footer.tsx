import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/auth/useAuth.ts';
import { useHasSelectedSchedule } from '../../../hooks/misc/useHasSelectedSchedule.ts';
import { supabase } from '../../../lib/supabase.ts';
import styles from './Footer.module.css';

const LockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="13"
    height="13"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
      clipRule="evenodd"
    />
  </svg>
);

const Footer: React.FC = () => {
  const { user, triggerRefresh, logout } = useAuth();
  const hasSelection = useHasSelectedSchedule();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleReset = async () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to reset all your enrollments? This will remove all manually added and removed classes.')) {
      await supabase.from('user_classes').delete().eq('user_id', user.id);
      await supabase.from('user_removed_classes').delete().eq('user_id', user.id);
      triggerRefresh();
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.leftSection}>
        <span>
          Made by{' '}
          <a href="https://andreidurlea.com" target="_blank" rel="noopener noreferrer" className={styles.link}>
            Andrei Durlea
          </a>
        </span>
        <Link to="/privacy" className={styles.privacyIconLink} title="Privacy Policy" aria-label="Privacy Policy">
          <LockIcon />
        </Link>
      </div>
      <div className={styles.rightSection}>
        {user ? (
          <>
            <span onClick={handleReset} className={styles.filterOption}>
              Reset my course enrollments
            </span>
            <span onClick={handleLogout} className={styles.filterOption}>
              Logout
            </span>
          </>
        ) : hasSelection ? (
          <span className={styles.filterOption}>
            <span onClick={handleLogin} className={styles.link} style={{textDecoration: 'underline', cursor: 'pointer'}}>Login with Google</span> to edit enrollments
          </span>
        ) : null}
      </div>
    </footer>
  );
};

export default Footer;
