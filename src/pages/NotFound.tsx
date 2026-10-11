import React from 'react';
import Navbar from '../components/features/generics/Navbar';
import Footer from '../components/features/generics/Footer';
import styles from './NotFound.module.css';

const NotFoundPage: React.FC = () => {
  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <main className={styles.container}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.message}>Oops! The page you're looking for doesn't exist.</p>
      </main>
      <Footer />
    </div>
  );
};

export default NotFoundPage;
