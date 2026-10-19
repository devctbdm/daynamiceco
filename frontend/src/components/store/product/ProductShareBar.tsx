// src/components/store/product/ProductShareBar.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Check, CheckCircle2, Link2, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { useCompare } from '@/store';
import { MAX_COMPARE } from '@/store/slices/compare.slice';
import type { Product } from '@/types/product';

const MessengerIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.744 6.613 4.468 8.648v3.861l4.126-2.258c1.144.316 2.36.49 3.652.49 6.591 0 11.754-5.181 11.754-11.852C24 4.975 18.627 0 12 0zm-.003 14.968l-3.01-3.21-5.875 3.21 6.46-6.856 3.088 3.21 5.794-3.21-6.457 6.856z" />
  </svg>
);

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const shareButtonBase =
  'flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition-colors';

function ShareButton({
  label,
  className,
  onClick,
  href,
  children,
}: {
  label: string;
  className: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const inner = (
    <motion.span
      whileHover={{ y: -2, scale: 1.05 }}
      whileTap={{ scale: 0.85 }}
      className={`${shareButtonBase} ${className}`}
    >
      {children}
    </motion.span>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        title={label}
        className="block"
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="block"
    >
      {inner}
    </button>
  );
}

export const ProductShareBar = ({ product }: { product: Product }) => {
  const { compareItems, addToCompare, removeFromCompare } = useCompare();
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const isCompared = compareItems.some((i) => i._id === product._id);
  const compareFull = compareItems.length >= MAX_COMPARE;

  const messengerUrl = `fb-messenger://share/?link=${encodeURIComponent(url)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${product.name}\n${url}`
  )}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      setCopied(true);
      toast.success('Product link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link. Please copy it manually.');
    }
  };

  const handleCompare = () => {
    if (isCompared) {
      removeFromCompare(product._id);
      toast.info('Removed from compare');
      return;
    }
    if (compareFull) {
      toast.error(`You can compare up to ${MAX_COMPARE} products at once.`);
      return;
    }
    addToCompare({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] || '/placeholder-image.png',
      price: product.price,
      discountPrice: product.discountPrice,
      stock: product.stock,
      status: product.stock > 0 ? 'active' : 'out_of_stock',
      averageRating: product.averageRating || 0,
    });
    toast.success('Added to compare');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
    >
      {/* Left: Share */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Share:</span>
        <div className="flex items-center gap-2">
          <ShareButton
            label="Share on Messenger"
            href={messengerUrl}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <MessengerIcon />
          </ShareButton>
          <ShareButton
            label="Share on WhatsApp"
            href={whatsappUrl}
            className="bg-green-500 hover:bg-green-600"
          >
            <WhatsAppIcon />
          </ShareButton>
          <ShareButton
            label="Copy link"
            onClick={handleCopy}
            className="bg-gray-800 hover:bg-gray-900"
          >
            {copied ? <Check size={15} /> : <Link2 size={15} />}
          </ShareButton>
        </div>
      </div>

      {/* Right: Compare */}
      <div className="flex items-center gap-3">
        {compareItems.length > 0 && (
          <Link
            href="/product/compare"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:underline"
          >
            Compare ({compareItems.length}/{MAX_COMPARE})
            <ArrowRight size={14} />
          </Link>
        )}
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCompare}
          aria-pressed={isCompared}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            isCompared
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700'
          }`}
        >
          {isCompared ? (
            <>
              <CheckCircle2 size={16} /> Added to Compare
            </>
          ) : (
            <>
              <Scale size={16} /> Add to Compare
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProductShareBar;
