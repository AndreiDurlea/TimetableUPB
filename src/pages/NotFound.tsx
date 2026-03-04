import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';
import Footer from '../components/features/generics/Footer';

const NotFoundPage: React.FC = () => {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.message}>Oops! The page you're looking for doesn't exist.</p>
        <Link to="/" className={styles.link}>
          Go back to the Timetable
        </Link>
      </div>
      <Footer />
    </div>
  );
};

export default NotFoundPage;
