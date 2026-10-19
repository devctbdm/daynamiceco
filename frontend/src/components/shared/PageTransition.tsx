'use client';

import { motion, AnimatePresence } from 'motion/react';
import { fadeIn } from '@/lib/animations';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = '',
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeIn}
      className={className}
    >
      {children}
    </motion.div>
  );
};
