import React, { useState, useEffect } from 'react';
import ProfileForm from '../components/features/forms/ProfileForm.tsx';
import ClassSearch from '../components/features/class/ClassSearch.tsx';
import Navbar from '../components/features/generics/Navbar';
import Footer from '../components/features/generics/Footer';

const Profile: React.FC = () => {
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showClassSearch, setShowClassSearch] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowProfileForm(true), 100);
    const timer2 = setTimeout(() => setShowClassSearch(true), 1000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    }}>
      <Navbar />
      <main style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div className={`fade-in ${showProfileForm ? 'visible' : ''}`} style={{ width: '100%', maxWidth: '1200px' }}>
            <ProfileForm isProfilePage={true} />
          </div>

          <div className={`fade-in ${showClassSearch ? 'visible' : ''}`} style={{ marginTop: '80px', width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.5em', marginBottom: '5px' }}>Manually add or remove classes</h2>
              <p style={{ color: '#666', fontSize: '0.9em' }}>
                Search and add some more. Or remove some of your own. If there's a time conflict, we will tell you.
              </p>
            </div>
            <div style={{ width: '100%' }}>
              <ClassSearch />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
