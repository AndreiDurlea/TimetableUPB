import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase.ts';
import { useAuth } from '../../../hooks/auth/useAuth.ts';
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

const Navbar: React.FC = () => {
  const { user, loading, is_admin } = useAuth();

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile`,
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
      <div>
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
      </div>
    </nav>
  );
};

export default Navbar;
