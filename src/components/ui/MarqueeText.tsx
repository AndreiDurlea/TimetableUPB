import React, { useState, useRef, useEffect } from 'react';
import styles from './MarqueeText.module.css';

interface MarqueeTextProps {
  text: string;
  className?: string;
}

const MarqueeText: React.FC<MarqueeTextProps> = ({ text, className = '' }) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setIsOverflowing(textRef.current.scrollWidth > textRef.current.offsetWidth);
    }
  }, [text]);

  return (
    <div 
      ref={textRef} 
      className={`${styles.marqueeContainer} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={`${styles.marqueeContent} ${isHovered && isOverflowing ? styles.scroll : ''}`}>
        {text}
      </span>
      {isOverflowing && (
        <span className={`${styles.marqueeContent} ${isHovered ? styles.scroll : ''}`} aria-hidden="true">
          &nbsp;&nbsp;&nbsp;{text}
        </span>
      )}
    </div>
  );
};

export default MarqueeText;
