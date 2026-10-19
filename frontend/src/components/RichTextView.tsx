'use client';

import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

interface RichTextViewProps {
  html?: string;
  className?: string;
}

export function RichTextView({ html, className }: RichTextViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const raw = html || '';
  const clean =
    mounted && typeof window !== 'undefined' ? DOMPurify.sanitize(raw) : raw;

  return (
    <div
      className={`rich-text ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export default RichTextView;
