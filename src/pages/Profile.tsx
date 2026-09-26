import React, { useState, useEffect } from 'react';
import ProfileForm from '../components/features/forms/ProfileForm.tsx';
import ClassSearch from '../components/features/class/ClassSearch.tsx';
import Navbar from '../components/features/generics/Navbar';
import Footer from '../components/features/generics/Footer';
import JumpNav from '../components/ui/JumpNav';

const Profile: React.FC = () => {
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showClassSearch, setShowClassSearch] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setShowProfileForm(true);
    }, 100);
    const timer2 = setTimeout(() => {
      setShowClassSearch(true);
    }, 600);
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
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 40px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div className={`fade-in ${showProfileForm ? 'visible' : ''}`} style={{ width: '100%', maxWidth: '1200px' }}>
            <ProfileForm isProfilePage={true} />
          </div>

          <div className={`fade-in ${showClassSearch ? 'visible' : ''}`} style={{ marginTop: '28px', width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25em', marginBottom: '4px' }}>Manually add or remove classes</h2>
              <p style={{ color: '#666', fontSize: '0.85em', margin: 0 }}>
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
      <JumpNav />
    </div>
  );
};

export default Profile;
