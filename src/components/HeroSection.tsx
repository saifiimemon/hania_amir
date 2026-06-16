import React, { useState } from 'react';
import { ParticleCanvas } from './ParticleCanvas';

export const HeroSection: React.FC = () => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealComplete, setRevealComplete] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);

  const handleRevealClick = () => {
    if (!isRevealed) {
      setIsRevealed(true);
    } else {
      setResetCounter(prev => prev + 1);
    }
    setRevealComplete(false);
  };

  const handleRevealComplete = () => {
    setRevealComplete(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', zIndex: 10 }}>
      {/* Visual Canvas Card */}
      <div className={`display-card ${isRevealed ? 'active' : ''}`} style={{ width: '90vw', maxWidth: '400px' }}>
        <div className="grid-bg"></div>
        <ParticleCanvas 
          isRevealed={isRevealed}
          resetCounter={resetCounter}
          onRevealStart={() => setRevealComplete(false)}
          onRevealComplete={handleRevealComplete}
          imageSrc="/iphone-promo.jpg"
        />
      </div>

      {/* Control Button */}
      <button 
        type="button" 
        className="cta-button"
        onClick={handleRevealClick}
        disabled={isRevealed && !revealComplete}
        style={{
          opacity: (isRevealed && !revealComplete) ? 0.7 : 1,
          cursor: (isRevealed && !revealComplete) ? 'not-allowed' : 'pointer'
        }}
      >
        {isRevealed ? (revealComplete ? 'Re-Assemble Particle Fluid' : 'Assembling...') : 'Reveal Image'}
      </button>

      {revealComplete && (
        <div 
          style={{ 
            fontSize: '0.9rem', 
            color: 'var(--color-accent-gold)', 
            fontStyle: 'italic',
            opacity: 0.8,
          }}
        >
          ★ Hover cursor to create ripples. Click the image to disperse!
        </div>
      )}
    </div>
  );
};
