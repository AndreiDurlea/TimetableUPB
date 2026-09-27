import React from 'react';
import Navbar from '../components/features/generics/Navbar';
import Footer from '../components/features/generics/Footer';
import styles from './Privacy.module.css';

const Privacy: React.FC = () => {
  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <main className={styles.contentWrapper}>
        <article className={styles.article}>
          <header className={styles.header}>
            <h1 className={styles.title}>Privacy Policy</h1>
            <div className={styles.lastUpdated}>Last updated: September 2026</div>
          </header>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Overview</h2>
            <p className={styles.paragraph}>
              Timetable UPB (<a href="https://orar.andreidurlea.com" className={styles.link}>orar.andreidurlea.com</a>) is an open-source student timetable and academic schedule organizer built for students of the National University of Science and Technology Politehnica Bucharest.
            </p>
            <p className={styles.paragraph}>
              Your privacy is fundamental. This policy explains what information is collected, how it is used, and your choices regarding your data.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Information We Collect</h2>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Account & Authentication:</strong> When you log in with Google, we receive basic profile information (such as your Google email address and user identifier) to authenticate your session and manage your personalized schedule.
              </li>
              <li className={styles.listItem}>
                <strong>Timetable Preferences:</strong> We store your selected student series, group, and subgroup, as well as any manually added or removed courses to display your customized weekly schedule.
              </li>
              <li className={styles.listItem}>
                <strong>Google Calendar Access (Optional):</strong> If you choose to sync your timetable with Google Calendar, we request authorization to access your Google Calendar. This authorization is only used to create, update, and manage a secondary calendar dedicated to your academic classes (&quot;Orar facultate&quot;).
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Google API Limited Use Disclosure</h2>
            <div className={styles.callout}>
              <p className={styles.paragraph} style={{ margin: 0 }}>
                Timetable UPB&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </div>
            <p className={styles.paragraph}>
              We do not read, process, or alter your primary calendar or personal events. Google Calendar data accessed through our sync feature is strictly used to create class timetable events on your behalf.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Data Sharing & Security</h2>
            <p className={styles.paragraph}>
              We do not sell, rent, commercialize, or share your personal data with third-party organizations or advertisers. Data is stored securely in Supabase with authenticated access control.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Data Control & Deletion</h2>
            <p className={styles.paragraph}>
              You have complete control over your data:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                You can reset all your enrolled course modifications directly from the footer or profile settings.
              </li>
              <li className={styles.listItem}>
                You can revoke Timetable UPB&apos;s Google Calendar access at any time through your{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Google Account Security Settings
                </a>.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact</h2>
            <p className={styles.paragraph}>
              If you have any questions or requests regarding your data, please contact Andrei Durlea at{' '}
              <a href="https://andreidurlea.com" target="_blank" rel="noopener noreferrer" className={styles.link}>
                andreidurlea.com
              </a>.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
