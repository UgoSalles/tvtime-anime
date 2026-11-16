import { animate, motion, useMotionValue } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { motion as m } from '../theme';

/**
 * Écran empilé (push iOS) : glisse depuis la droite ; swipe retour depuis le bord
 * gauche (zone de 20 pt). Timings provisoires (SPEC §5 : aucune vidéo fournie).
 */
export function StackLayer({ children, onBack, z = 30 }: { children: ReactNode; onBack: () => void; z?: number }) {
  const w = typeof window === 'undefined' ? 393 : Math.min(window.innerWidth, 393);
  const x = useMotionValue(w);
  useEffect(() => {
    const c = animate(x, 0, m.push);
    return () => c.stop();
  }, [x]);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden bg-background"
      style={{ x, zIndex: z, boxShadow: '-8px 0 24px rgba(0,0,0,0.18)' }}
      exit={{ x: w, transition: m.push }}
    >
      {children}
      <motion.div
        className="absolute inset-y-0 left-0 w-5"
        style={{ touchAction: 'none', zIndex: 50 }}
        onPan={(_, i) => x.set(Math.max(0, i.offset.x))}
        onPanEnd={(_, i) => {
          if (i.offset.x > w / 3 || i.velocity.x > 500) onBack();
          else animate(x, 0, m.push);
        }}
      />
    </motion.div>
  );
}
