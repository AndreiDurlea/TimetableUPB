import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/features/generics/Navbar';
import Footer from '../components/features/generics/Footer';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import { useAuth } from '../hooks/auth/useAuth';
import { supabase } from '../lib/supabase';
import { generateUserShareSlug } from '../utils/shareUtils';
import styles from './ShareProfile.module.css';

const renderUrlWithSlashBreaks = (url: string) => {
  if (!url) return null;
  const parts = url.split('/');
  return parts.map((part, index) => (
    <React.Fragment key={index}>
      {part}
      {index < parts.length - 1 && (
        <>
          /<wbr />
        </>
      )}
    </React.Fragment>
  ));
};

const ShareProfile: React.FC = () => {
  const { user, loading } = useAuth();
  const [isShared, setIsShared] = useState<boolean>(false);
  const [shareSlug, setShareSlug] = useState<string>('');
  const [shareCode, setShareCode] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);

  const initialFetchDoneRef = useRef<boolean>(false);
  const isUpdatingRef = useRef<boolean>(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    if (!user || initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;

    const meta = user.user_metadata || {};
    if (meta.is_profile_shared !== undefined) {
      setIsShared(Boolean(meta.is_profile_shared));
    }
    if (meta.share_slug) {
      setShareSlug(meta.share_slug);
    }
    if (meta.share_code) {
      setShareCode(meta.share_code);
    }

    const fetchProfileSharing = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_shared, share_slug, share_code')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          const typed = data as { is_shared?: boolean | null; share_slug?: string | null; share_code?: string | null };
          if (typed.is_shared !== undefined && typed.is_shared !== null) {
            setIsShared(Boolean(typed.is_shared));
          }
          if (typed.share_slug) {
            setShareSlug(typed.share_slug);
          }
          if (typed.share_code) {
            setShareCode(typed.share_code);
          }
        }
      } catch (err) {
        void err;
      }
    };

    void fetchProfileSharing();
  }, [user]);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || isUpdatingRef.current) return;
    const nextState = e.target.checked;
    isUpdatingRef.current = true;
    setIsShared(nextState);

    try {
      let slug = shareSlug;
      let code = shareCode;
      if (nextState && (!slug || !code)) {
        const generated = generateUserShareSlug(user.user_metadata?.full_name || user.email || 'user', user.id);
        slug = generated.slug;
        code = generated.code;
        setShareSlug(slug);
        setShareCode(code);
      }

      await supabase.auth.updateUser({
        data: {
          is_profile_shared: nextState,
          share_slug: slug,
          share_code: code,
        },
      });

      const { error: rpcError } = await supabase.rpc('set_profile_sharing', {
        p_is_shared: nextState,
        p_share_slug: slug,
        p_share_code: code,
      });

      if (rpcError) {
        await supabase
          .from('profiles')
          .update({
            is_shared: nextState,
            share_slug: slug,
            share_code: code,
          })
          .eq('id', user.id);
      }
    } catch {
      setIsShared(!nextState);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const shareUrl = typeof window !== 'undefined' && shareSlug
    ? `${window.location.origin}/share/${shareSlug}`
    : '';

  const triggerCopy = () => {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
    setShowToast(true);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  const handleHoldStart = () => {
    hasTriggeredRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      hasTriggeredRef.current = true;
      triggerCopy();
    }, 300);
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleClick = () => {
    if (!hasTriggeredRef.current) {
      triggerCopy();
    }
    hasTriggeredRef.current = false;
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <main className={styles.contentWrapper}>
        <article className={styles.article}>
          <header className={styles.header}>
            <h1 className={styles.title}>Share?</h1>
            <div className={styles.subtitle}>
              Your profile is currently <strong>{isShared ? 'public' : 'private'}</strong>.
            </div>
          </header>

          <div className={styles.toggleRow}>
            <input
              type="checkbox"
              id="share-profile-checkbox"
              className={styles.checkbox}
              checked={isShared}
              onChange={handleToggle}
            />
            <label htmlFor="share-profile-checkbox" className={styles.toggleLabel}>
              Keep an open link?
            </label>
          </div>

          {isShared && (
            <div
              className={styles.linkContainer}
              onClick={handleClick}
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerCopy();
                }
              }}
            >
              <div className={styles.linkUrl}>
                {renderUrlWithSlashBreaks(shareUrl)}
              </div>
            </div>
          )}
        </article>
      </main>
      <Footer />

      <div className={`${styles.toast} ${showToast ? styles.toastVisible : ''}`}>
        Link copied to clipboard
      </div>
    </div>
  );
};

export default ShareProfile;
