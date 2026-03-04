import React from 'react';
import { useAuth } from '../../../hooks/auth/useAuth.ts';
import { supabase } from '../../../lib/supabase.ts';
import styles from './Footer.module.css';

const Footer: React.FC = () => {
  const { user, triggerRefresh } = useAuth();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
        Made with the FreeTime framework by <a href="https://andreidurlea.com" target="_blank" rel="noopener noreferrer" className={styles.link}>Durlea Andrei</a>
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
        ) : (
          <span className={styles.filterOption}>
            <span onClick={handleLogin} className={styles.link} style={{textDecoration: 'underline', cursor: 'pointer'}}>Login with Google</span> to edit enrollments
          </span>
        )}
      </div>
    </footer>
  );
};

export default Footer;
