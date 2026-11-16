import { motion } from 'framer-motion';
import { IconCheck } from './Icons';
import { motion as m } from '../theme';

/** Bouton coche rond. Animation provisoire : « pop » en ressort + remplissage vert (SPEC §5). */
export function CheckButton({
  checked,
  onToggle,
  size = 36,
}: {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={checked}
      aria-label={checked ? 'Marquer comme non vu' : 'Marquer comme vu'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      whileTap={{ scale: 0.88 }}
      animate={{ scale: 1 }}
      transition={m.check}
      className={`grid shrink-0 place-items-center rounded-full transition-colors duration-150 ${checked ? 'bg-check-done-bg' : 'bg-check-idle-bg'}`}
      style={{ width: size, height: size }}
    >
      <motion.span
        key={String(checked)}
        initial={{ scale: checked ? 0.4 : 1 }}
        animate={{ scale: 1 }}
        transition={m.check}
        className="grid place-items-center"
        style={{ color: checked ? 'var(--c-check-done-icon)' : 'var(--c-check-idle-icon)' }}
      >
        <IconCheck size={size * 0.5} />
      </motion.span>
    </motion.button>
  );
}
