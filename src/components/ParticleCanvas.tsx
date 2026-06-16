import React, { useEffect, useRef, useState } from 'react';

interface ParticleCanvasProps {
  isRevealed: boolean;
  onRevealComplete?: () => void;
  imageSrc: string;
}

interface Particle {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  isRevealed,
  onRevealComplete,
  imageSrc,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showHighRes, setShowHighRes] = useState(false);
  
  // Keep track of particles and animation state in refs to avoid React re-render overhead in the 60fps loop
  const particlesRef = useRef<Particle[]>([]);
  const revealProgressRef = useRef(0);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const animationFrameIdRef = useRef<number | null>(null);
  const imageDimensionsRef = useRef({ width: 0, height: 0 });

  // Load the image and extract pixels
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageDimensionsRef.current = { width: img.naturalWidth, height: img.naturalHeight };
      
      // We will analyze the image pixels using an offscreen canvas
      // Downscale for performance (we want ~8,000 - 10,000 particles)
      const offscreenWidth = 240;
      const offscreenHeight = Math.round((img.naturalHeight / img.naturalWidth) * offscreenWidth);
      
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = offscreenWidth;
      offscreenCanvas.height = offscreenHeight;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      
      if (!offscreenCtx) return;
      
      offscreenCtx.drawImage(img, 0, 0, offscreenWidth, offscreenHeight);
      const imageData = offscreenCtx.getImageData(0, 0, offscreenWidth, offscreenHeight);
      const data = imageData.data;
      
      const particles: Particle[] = [];
      const sampleStep = 2.5; // Controls particle density
      
      // Canvas dimensions for initial positioning (will be updated dynamically on mount/resize)
      const initialWidth = canvasRef.current?.width || 400;
      const initialHeight = canvasRef.current?.height || 600;

      for (let y = 0; y < offscreenHeight; y += sampleStep) {
        for (let x = 0; x < offscreenWidth; x += sampleStep) {
          const index = (Math.floor(y) * offscreenWidth + Math.floor(x)) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];
          
          // Only capture pixels with visible opacity
          if (a > 100) {
            // Spawn particles in a chaotic fluid liquid layout at the bottom, or randomly
            particles.push({
              originX: x / offscreenWidth, // normalize to 0-1
              originY: y / offscreenHeight, // normalize to 0-1
              x: Math.random() * initialWidth,
              y: initialHeight + Math.random() * 100, // Spawn from below
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 5 - 2, // Flowing upwards initially
              color: `rgb(${r}, ${g}, ${b})`,
              size: Math.random() * 1.5 + 1.2,
              alpha: 1,
            });
          }
        }
      }
      
      particlesRef.current = particles;
      setIsImageLoaded(true);
    };
  }, [imageSrc]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isImageLoaded]);

  // Animation loop
  useEffect(() => {
    if (!isImageLoaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let time = 0;
    
    const animate = () => {
      time += 0.01;
      const width = canvas.width;
      const height = canvas.height;
      
      // Semi-transparent clearing for fluid trails
      ctx.fillStyle = 'rgba(3, 7, 18, 0.18)';
      ctx.fillRect(0, 0, width, height);
      
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const progress = revealProgressRef.current;
      
      // Update progress if revealed
      if (isRevealed && progress < 1.0) {
        revealProgressRef.current = Math.min(1.0, progress + 0.018); // Faster ~1.0 second assembly
        if (revealProgressRef.current >= 1.0) {
          setShowHighRes(true);
          if (onRevealComplete) onRevealComplete();
        }
      } else if (!isRevealed && progress > 0) {
        // Reset if isRevealed becomes false
        revealProgressRef.current = Math.max(0.0, progress - 0.015);
        setShowHighRes(false);
      }
      
      // Calculate target image sizing and positioning to fit the canvas nicely
      const padding = 20;
      const maxTargetWidth = width - padding * 2;
      const maxTargetHeight = height - padding * 2;
      const imgRatio = 2 / 3; // Approx aspect ratio of original image
      
      let targetW = maxTargetWidth;
      let targetH = targetW / imgRatio;
      
      if (targetH > maxTargetHeight) {
        targetH = maxTargetHeight;
        targetW = targetH * imgRatio;
      }
      
      const targetXStart = (width - targetW) / 2;
      const targetYStart = (height - targetH) / 2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Fluid Flow Field math (using multi-wave sines/cosines for turbulent liquid movement)
        const flowAngle = Math.sin(p.x * 0.006 + time * 1.5) * Math.cos(p.y * 0.006 + time * 1.2) * Math.PI * 2;
        const flowForceX = Math.cos(flowAngle) * 0.22;
        const flowForceY = Math.sin(flowAngle) * 0.22;
        
        // Target Steering coordinates
        const tx = targetXStart + p.originX * targetW;
        const ty = targetYStart + p.originY * targetH;
        
        // Vector pointing to target
        const dx = tx - p.x;
        const dy = ty - p.y;
        
        // Combine forces based on progress
        if (progress > 0) {
          const steerStrength = Math.pow(progress, 1.5) * 0.32; // Stronger attraction curve starting earlier
          const fluidWeight = Math.max(0, 1 - progress * 1.5); // Fade out fluid turbulence faster
          
          p.vx += dx * steerStrength + flowForceX * fluidWeight;
          p.vy += dy * steerStrength + flowForceY * fluidWeight;
          
          // Apply extra damping in the final phase to lock particles in place perfectly and quickly
          if (progress > 0.75) {
            p.vx *= 0.62;
            p.vy *= 0.62;
            // Linear interpolation snap to avoid jittering (faster snapping speed)
            p.x += (tx - p.x) * 0.28;
            p.y += (ty - p.y) * 0.28;
          } else {
            p.vx *= 0.88;
            p.vy *= 0.88;
          }
        } else {
          // Ambient fluid motion (no target attraction)
          p.vx += flowForceX;
          p.vy += flowForceY;
          
          // Apply friction
          p.vx *= 0.96;
          p.vy *= 0.96;
          
          // Boundary wrapping for ambient phase
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }
        
        // Mouse Repulsion (ripples in the fluid)
        if (mouse.active) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          const activeRadius = 90;
          
          if (mdist < activeRadius && mdist > 0) {
            const force = (activeRadius - mdist) / activeRadius;
            // Stronger repulsion during ambient, slightly weaker when assembling to maintain shape
            const repulsionFactor = progress > 0.8 ? 0.3 : 1.8;
            p.vx += (mdx / mdist) * force * repulsionFactor;
            p.vy += (mdy / mdist) * force * repulsionFactor;
          }
        }
        
        // Update positions
        p.x += p.vx;
        p.y += p.vy;
        
        // Render particle
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameIdRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isImageLoaded, isRevealed, onRevealComplete]);

  // Track Mouse Movements
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  // Reset function to show the fluid animation again
  const triggerReset = () => {
    if (!showHighRes) return;
    setShowHighRes(false);
    revealProgressRef.current = 0;
    
    // Disperse particles randomly outwards
    particlesRef.current.forEach(p => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 6;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
    });
    
    // Restart reveal sequence after a short delay
    setTimeout(() => {
      revealProgressRef.current = 0.01;
    }, 150);
  };

  return (
    <div 
      ref={containerRef} 
      className="display-card-inner" 
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        className="reveal-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={triggerReset}
        title={showHighRes ? "Click image to trigger fluid explosion & re-assembly!" : undefined}
      />
      <img
        src={imageSrc}
        alt="iPhone 15 Pro Promo"
        className={`high-res-image ${showHighRes ? 'show' : ''}`}
        style={{
          cursor: 'pointer',
          pointerEvents: showHighRes ? 'auto' : 'none'
        }}
        onClick={triggerReset}
        title="Click to trigger fluid explosion & re-assembly!"
      />
    </div>
  );
};
