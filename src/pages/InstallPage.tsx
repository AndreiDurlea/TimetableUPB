import React, { useState, useEffect } from 'react';
import Footer from '../components/features/generics/Footer';
import styles from './InstallPage.module.css';

const InstallPage: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setInstallPrompt(null);
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>Install TimetableUPB</h1>
          {isIOS ? (
            <div className={styles.iosInstructions}>
              <p>To install this app on your iOS device, please follow these steps:</p>
              <ol>
                <li>Tap the "Share" button in Safari.</li>
                <li>Scroll down and tap "Add to Home Screen".</li>
                <li>Confirm by tapping "Add".</li>
              </ol>
              <img src="/ios-install-guide.png" alt="iOS install instructions" className={styles.guideImage} />
            </div>
          ) : (
            <button onClick={handleInstallClick} disabled={!installPrompt} className={styles.installButton}>
              {installPrompt ? 'Install App' : 'App cannot be installed from this browser'}
            </button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default InstallPage;
