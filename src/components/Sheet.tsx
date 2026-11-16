import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSheet } from '../store/sheet';
import { motion as m } from '../theme';

/** Feuille modale du bas : liste d'actions ou saisie d'un texte. Montée une fois dans App. */
export function SheetHost() {
  const spec = useSheet((s) => s.spec);
  const close = useSheet((s) => s.close);
  const [text, setText] = useState('');
  useEffect(() => {
    if (spec?.kind === 'prompt') setText(spec.initial ?? '');
  }, [spec]);

  return (
    <AnimatePresence>
      {spec && (
        <motion.div key="sheet" className="absolute inset-0 z-[80]" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            className="absolute inset-x-0 bottom-0 px-2"
            style={{ paddingBottom: 'calc(var(--safe-bottom) + 8px)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={m.push}
          >
            {spec.kind === 'actions' ? (
              <>
                <div className="overflow-hidden rounded-[14px] bg-surface">
                  {(spec.title || spec.message) && (
                    <div className="border-b border-divider px-4 py-3 text-center">
                      {spec.title && <div className="text-[13px] font-bold text-ink">{spec.title}</div>}
                      {spec.message && <div className="mt-0.5 text-[12px] text-ink-3">{spec.message}</div>}
                    </div>
                  )}
                  {spec.actions.map((a) => (
                    <button
                      key={a.label}
                      onClick={async () => {
                        close();
                        await a.onClick();
                      }}
                      className={`block h-[52px] w-full border-b border-divider text-[16px] font-semibold last:border-b-0 ${a.destructive ? 'text-[#E5484D]' : 'text-ink'}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <button onClick={close} className="mt-2 h-[52px] w-full rounded-[14px] bg-surface text-[16px] font-bold text-ink">
                  Annuler
                </button>
              </>
            ) : (
              <form
                className="rounded-[14px] bg-surface p-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!text.trim()) return;
                  close();
                  await spec.onSubmit(text.trim());
                }}
              >
                <div className="text-[14px] font-bold text-ink">{spec.title}</div>
                <input
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={spec.placeholder}
                  className="mt-3 h-11 w-full rounded-card bg-chip px-3 text-[15px] text-ink outline-none"
                />
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={close} className="h-11 flex-1 rounded-card bg-chip text-[14px] font-bold text-ink-2">Annuler</button>
                  <button type="submit" className="h-11 flex-1 rounded-card bg-yellow text-[14px] font-bold text-black">{spec.submitLabel ?? 'Valider'}</button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
