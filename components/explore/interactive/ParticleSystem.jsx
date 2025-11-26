'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Particle System - Canvas-based floating particles
 * Types: ingredients (emojis), sparkles, confetti
 */
export default function ParticleSystem({ 
  type = 'ingredients', 
  count = 30,
  paused = false,
  colors = ['#D4AF37', '#8B7355', '#059669', '#10b981']
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  // Ingredient emojis
  const ingredientEmojis = ['🌊', '🍍', '🍋', '🫚', '🌟', '🌿', '🥭', '🍓', '🫐', '🌺', '🥥', '🍑'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const particles = particlesRef.current;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      particles.length = 0;
      const maxParticles = window.innerWidth < 768 ? Math.min(count, 20) : count;
      
      for (let i = 0; i < maxParticles; i++) {
        particles.push(createParticle());
      }
    };

    const createParticle = () => {
      const particle = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 30 + 20,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02
      };

      if (type === 'ingredients') {
        particle.emoji = ingredientEmojis[Math.floor(Math.random() * ingredientEmojis.length)];
      } else if (type === 'sparkles') {
        particle.color = colors[Math.floor(Math.random() * colors.length)];
        particle.speedY = -2 - Math.random() * 2;
        particle.life = 1.0;
      } else if (type === 'confetti') {
        particle.color = colors[Math.floor(Math.random() * colors.length)];
        particle.speedY = 2 + Math.random() * 3;
        particle.size = Math.random() * 10 + 5;
      }

      return particle;
    };

    initParticles();

    // Animation loop
    const animate = () => {
      if (paused || !isVisible) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.rotation += particle.rotationSpeed;

        // Wrap around screen
        if (particle.x < -50) particle.x = canvas.width + 50;
        if (particle.x > canvas.width + 50) particle.x = -50;
        if (particle.y < -50) particle.y = canvas.height + 50;
        if (particle.y > canvas.height + 50) particle.y = -50;

        // Draw based on type
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);

        if (type === 'ingredients') {
          ctx.font = `${particle.size}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(particle.emoji, 0, 0);
        } else if (type === 'sparkles') {
          // Draw star
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * particle.size;
            const y = Math.sin(angle) * particle.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();

          // Fade out
          particle.life -= 0.01;
          particle.opacity = particle.life;
          if (particle.life <= 0) {
            particles[index] = createParticle();
          }
        } else if (type === 'confetti') {
          ctx.fillStyle = particle.color;
          ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        }

        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Visibility detection
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      observer.disconnect();
    };
  }, [type, count, paused, colors, isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}
