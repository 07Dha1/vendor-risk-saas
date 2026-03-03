import { useEffect } from 'react';
import Lenis from '@studio-freight/lenis';
import { useSceneStore } from '../store/sceneStore';

export default function ScrollSystem() {
  const { setScrollProgress, setScrollVelocity } = useSceneStore();
  
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      smooth: true,
      smoothTouch: false,
      touchMultiplier: 2,
    });
    
    lenis.on('scroll', ({ scroll, velocity }) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? (scroll / maxScroll) * 100 : 0;
      
      setScrollProgress(progress);
      setScrollVelocity(velocity);
    });
    
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    
    return () => {
      lenis.destroy();
    };
  }, [setScrollProgress, setScrollVelocity]);
  
  return null;
}