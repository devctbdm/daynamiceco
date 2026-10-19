'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { productApi, questionApi } from '@/lib/api';
import type { Product } from '@/types/product';
import { RichTextView } from '@/components/RichTextView';
import { useAuth } from '@/hooks/useAuth';
import { Breadcrumb } from '@/components/store/layout/Breadcrumb';
import { ProductShareBar } from '@/components/store/product/ProductShareBar';
import { AddToCartButton } from '@/components/store/cart/AddToCartButton';
import { Button } from '@/components/button/Button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Minus,
  Plus,
  Star,
  MessageSquare,
  HelpCircle,
  Lock,
  Send,
} from 'lucide-react';

interface ProductDetailProps {
  product: Product;
  related: Product[];
  categorySlugs: string[];
  categoryPath: string[];
}

// Flatten specifications (structured or legacy flat format) into displayable sections
function renderSpecs(
  specs: Record<string, any>
): { label: string; items: { label: string; value: string }[] }[] {
  if (!specs || typeof specs !== 'object') return [];

  // new structured format
  if (specs._keySpecs || specs._keyFeatures || specs._specGroups) {
    const sections: {
      label: string;
      items: { label: string; value: string }[];
    }[] = [];
    if (specs._keySpecs && Object.keys(specs._keySpecs).length > 0) {
      sections.push({
        label: 'Key Specifications',
        items: Object.entries(specs._keySpecs).map(([k, v]) => ({
          label: k,
          value: String(v),
        })),
      });
    }
    if (specs._keyFeatures && Object.keys(specs._keyFeatures).length > 0) {
      sections.push({
        label: 'Key Features',
        items: Object.entries(specs._keyFeatures).map(([k, v]) => ({
          label: k,
          value: String(v),
        })),
      });
    }
    if (specs._specGroups && Object.keys(specs._specGroups).length > 0) {
      for (const [groupName, fields] of Object.entries(specs._specGroups)) {
        if (typeof fields === 'object' && fields !== null) {
          sections.push({
            label: groupName,
            items: Object.entries(fields).map(([k, v]) => ({
              label: k,
              value: String(v),
            })),
          });
        }
      }
    }
    return sections;
  }

  // legacy flat format
  const flatItems: { label: string; value: string }[] = [];
  const sections: {
    label: string;
    items: { label: string; value: string }[];
  }[] = [];
  for (const [key, val] of Object.entries(specs)) {
    if (typeof val === 'object' && val !== null) {
      sections.push({
        label: key,
        items: Object.entries(val).map(([k, v]) => ({
          label: k,
          value: String(v),
        })),
      });
    } else {
      flatItems.push({ label: key, value: String(val) });
    }
  }
  if (flatItems.length > 0)
    sections.unshift({ label: 'Specifications', items: flatItems });
  return sections;
}

// Pull short feature bullets from _keyFeatures (fall back to _keySpecs)
function extractKeyFeatures(specs: Record<string, any>): string[] {
  if (!specs || typeof specs !== 'object') return [];
  const features = specs._keyFeatures;
  if (features && typeof features === 'object') {
    const values = Object.entries(features)
      .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
      .map(([k, v]) => `${k}: ${v}`);
    if (values.length > 0) return values;
  }
  const keySpecs = specs._keySpecs;
  if (keySpecs && typeof keySpecs === 'object') {
    return Object.entries(keySpecs)
      .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
      .slice(0, 6)
      .map(([k, v]) => `${k}: ${v}`);
  }
  return [];
}

// Render rich content blocks produced by the admin ContentEditor
function renderContentBlocks(
  blocks: any[],
  fallbackAlt: string
): React.ReactNode {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (!block || typeof block !== 'object') return null;
        switch (block.type) {
          case 'title':
            return (
              <h3 key={i} className="text-lg font-semibold text-gray-800">
                {block.text}
              </h3>
            );
          case 'text':
            return (
              <p key={i} className="text-gray-600 leading-relaxed">
                {block.text}
              </p>
            );
          case 'image':
            return (
              <Image
                key={i}
                src={block.url}
                alt={block.alt || fallbackAlt}
                width={800}
                height={450}
                loading="eager"
                className="rounded-lg w-auto h-auto"
              />
            );
          case 'link':
            return (
              <a
                key={i}
                href={block.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline inline-block"
              >
                {block.label}
              </a>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// Read-only star display
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= value ? 'currentColor' : 'none'}
          className={i <= value ? 'text-yellow-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );
}

// Interactive star picker for the review form
function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onChange(i)}
          className="p-0.5 transition disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
        >
          <Star
            size={24}
            fill={i <= value ? 'currentColor' : 'none'}
            className={
              i <= value
                ? 'text-yellow-400'
                : 'text-gray-300 hover:text-yellow-300'
            }
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ProductDetail({
  product: initialProduct,
  related: initialRelated,
  categorySlugs: initialCategorySlugs,
  categoryPath: initialCategoryPath,
}: ProductDetailProps) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [related, setRelated] = useState<Product[]>(initialRelated);
  const [categorySlugs] = useState<string[]>(initialCategorySlugs);
  const [categoryPath] = useState<string[]>(initialCategoryPath);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuth();

  const [questions, setQuestions] = useState<any[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [asking, setAsking] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadQuestions = async (productId: string) => {
    try {
      const { data } = await questionApi.getByProduct(productId);
      setQuestions(data.questions || []);
    } catch {
      setQuestions([]);
    }
  };

  useEffect(() => {
    if (product?._id) {
      loadQuestions(product._id);
    }
  }, [product?._id]);

  const handleAsk = async () => {
    if (!product) return;
    if (!user) {
      setQuestionError('Please login to ask a question.');
      return;
    }
    if (!questionText.trim()) {
      setQuestionError('Please write your question first.');
      return;
    }
    try {
      setAsking(true);
      setQuestionError('');
      const { data } = await questionApi.ask(product._id, questionText.trim());
      if (data.success) {
        setQuestionText('');
        toast.success('Your question has been submitted for review.');
        loadQuestions(product._id);
      }
    } catch (e: any) {
      setQuestionError(
        e?.response?.data?.message || 'Failed to submit your question.'
      );
    } finally {
      setAsking(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!product) return;
    if (!user) {
      setReviewError('Please login to write a review.');
      return;
    }
    if (rating < 1) {
      setReviewError('Please select a star rating.');
      return;
    }
    try {
      setSubmittingReview(true);
      setReviewError('');
      await productApi.addRating(product._id, {
        rating,
        comment: comment.trim() || undefined,
      });
      const res = await productApi.getBySlug(product.slug);
      if (res.data.success) {
        setProduct(toProductShapeSafe(res.data.product, product));
      }
      setRating(0);
      setComment('');
      toast.success(
        'Thanks! Your review has been submitted and is awaiting admin approval.'
      );
    } catch (e: any) {
      setReviewError(
        e?.response?.data?.message || 'Failed to submit your review.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!product) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-2xl text-gray-500">Product not found</p>
        <Link
          href="/"
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          ← Back to Home
        </Link>
      </div>
    );
  }

  const finalPrice =
    product.discountPrice > 0 ? product.discountPrice : product.price;
  const hasDiscount =
    product.discountPrice > 0 && product.discountPrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.discountPrice / product.price) * 100)
    : 0;

  const inStock = product.stock > 0;
  const stockText = inStock
    ? `In Stock (${product.stock} available)`
    : 'Out of Stock';
  const stockColor = inStock ? 'text-green-600' : 'text-red-600';

  const brand =
    product.brand ||
    product.specifications?.brand ||
    product.specifications?._keySpecs?.Brand ||
    product.specifications?._keyFeatures?.Brand ||
    '—';

  const keyFeatures = extractKeyFeatures(product.specifications || {});
  const reviewCount = (product.ratings || []).filter(
    (r) => r.status === 'approved'
  ).length;
  const monthlyEmi = Math.round(finalPrice / 12);
  const maxQty = inStock ? product.stock : 0;
  const currentQty = Math.min(Math.max(quantity, 1), maxQty || 1);

  const images =
    product.images.length > 0 ? product.images : ['/placeholder-image.png'];

  return (
    <div className="max-w-7xl m-auto px-4 py-8">
      {/* Breadcrumb */}
      <Breadcrumb slug={categorySlugs} />

      {/* Share + Compare header */}
      <ProductShareBar product={product} />

      <div className="mt-4">
        <Link
          href={`/products/${categorySlugs.join('/')}`}
          className="inline-flex items-center text-sm text-blue-600 hover:underline"
        >
          <ChevronLeft size={16} />
          Back to {categoryPath[categoryPath.length - 1] || 'Category'}
        </Link>
      </div>

      {/* ================= TOP SECTION ================= */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Image Slider */}
        <div className="space-y-4">
          <div className="relative aspect-square w-full max-w-md mx-auto bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
            <Image
              src={images[activeImage]}
              alt={product.imageAlts?.[activeImage] || product.name}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-red-500 text-white font-bold px-3 py-1.5 rounded-full text-sm shadow-md">
                {discountPercent}% OFF
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`relative w-20 h-20 shrink-0 bg-gray-50 rounded-lg overflow-hidden border-2 transition ${
                    idx === activeImage
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Image
                    src={img}
                    alt={product.imageAlts?.[idx] || `${product.name} - view ${idx + 1}`}
                    fill
                    className="object-cover"
                    loading="eager"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {product.name}
            </h1>
            {brand !== '—' && (
              <p className="text-sm text-gray-500 mt-1">Brand: {brand}</p>
            )}
          </div>

          {/* Rating */}
          {product.averageRating > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    fill={
                      i < Math.round(product.averageRating)
                        ? 'currentColor'
                        : 'none'
                    }
                    className={
                      i < Math.round(product.averageRating)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {product.averageRating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">
                ({reviewCount} reviews)
              </span>
            </div>
          )}

          {/* Pricing / Summary Table */}
          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gray-600">Price</span>
              <span className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-green-700">
                  ৳{finalPrice.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-gray-400 line-through">
                    ৳{product.price.toLocaleString()}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gray-600">
                Regular Price
              </span>
              <span
                className={`font-semibold ${
                  hasDiscount ? 'text-gray-400 line-through' : 'text-gray-800'
                }`}
              >
                ৳{product.price.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gray-600">Status</span>
              <span className={`font-semibold ${stockColor}`}>{stockText}</span>
            </div>
            <div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-gray-600">
                  Product Code
                </span>
                <span className="font-semibold text-gray-800">
                  {product.productCode || '—'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gray-600">Brand</span>
              <span className="font-semibold text-gray-800">{brand}</span>
            </div>
          </div>

          {/* Key Features */}
          {keyFeatures.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800">Key Features</h3>
              <ul className="mt-2 space-y-1.5">
                {keyFeatures.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Payment Options */}
          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800">Payment Options</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2.5">
                <span className="text-green-800 font-medium">
                  ৳{finalPrice.toLocaleString()}{' '}
                  <span className="font-normal">Cash Discount Price</span>
                </span>
                <span className="text-green-700">Online / Cash Payment</span>
              </div>
            </div>
          </div>

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-4">
            <div
              className="flex items-center rounded-lg border border-gray-300 overflow-hidden"
              aria-label="Quantity"
            >
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={!inStock || quantity <= 1}
                className="p-2.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-semibold text-gray-800">
                {currentQty}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={!inStock || quantity >= maxQty}
                className="p-2.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex-1">
              <AddToCartButton
                product={product}
                quantity={currentQty}
                disabled={!inStock}
              />
            </div>
          </div>

          {/* Extra info */}
          <div className="text-xs text-gray-400 flex gap-4 pt-2">
            <span>✅ Secure Payment</span>
            <span>🚚 Free Delivery (BD)</span>
            <span>🔄 7 Days Return</span>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM SECTION ================= */}
      <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-12">
        {/* Left: Tabs */}
        <div className="min-w-0">
          <Tabs defaultValue="specification">
            <TabsList variant="line">
              <TabsTrigger value="specification">Specification</TabsTrigger>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="questions">
                Questions ({questions.length})
              </TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviewCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="specification" className="pt-4">
              {renderSpecs(product.specifications || {}).length > 0 ? (
                <div className="space-y-5">
                  {renderSpecs(product.specifications || {}).map((section) => (
                    <div key={section.label + Math.random()}>
                      <h4 className="text-sm font-semibold text-gray-700">
                        {section.label}
                      </h4>
                      <dl className="mt-1 grid grid-cols-1  text-sm">
                        {section.items.map((item) => (
                          <div
                            key={item.label}
                            className="flex py-1.5 border-b border-gray-100"
                          >
                            <dt className="w-1/2 font-medium text-gray-600 capitalize">
                              {item.label.replace(/-/g, ' ')}
                            </dt>
                            <dd className="w-1/2 text-gray-800 whitespace-pre-line">
                              {item.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 py-4">
                  No specifications available for this product.
                </p>
              )}
            </TabsContent>

            <TabsContent value="description" className="pt-4">
              <p className="text-gray-600 leading-relaxed">
                {product.description || 'No description available.'}
              </p>
              {typeof product.content === 'string' &&
              product.content.trim() ? (
                <RichTextView html={product.content} className="mt-4" />
              ) : (
                renderContentBlocks(
                  Array.isArray(product.content) ? product.content : [],
                  product.name
                )
              )}
            </TabsContent>

            <TabsContent value="questions" className="pt-4">
              {/* Existing Q&A */}
              {questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div
                      key={q._id}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-800">
                            {q.question}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {q.user?.name || 'Customer'} ·{' '}
                            {formatDate(q.createdAt)}
                          </p>
                        </div>
                        {q.featured && (
                          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            Featured
                          </span>
                        )}
                      </div>
                      {q.answer ? (
                        <div className="mt-3 rounded-lg bg-green-50 p-3">
                          <p className="text-sm leading-relaxed text-green-900">
                            {q.answer}
                          </p>
                          <p className="mt-1 text-xs text-green-700">
                            Answered by {q.answeredBy?.name || 'Seller'}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-gray-400">
                          Awaiting an answer...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <HelpCircle size={36} className="text-gray-300" />
                  <p className="mt-3 text-gray-500">
                    No questions yet. Be the first to ask about this product.
                  </p>
                </div>
              )}

              {/* Ask form / login gate */}
              <div className="mt-6 rounded-xl border border-gray-200 p-4">
                {user ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">
                      Ask a Question
                    </h4>
                    <Textarea
                      value={questionText}
                      onChange={(e) => {
                        setQuestionText(e.target.value);
                        setQuestionError('');
                      }}
                      placeholder="Write your question about this product..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {questionError && (
                      <p className="text-sm text-red-600">{questionError}</p>
                    )}
                    <Button
                      onClick={handleAsk}
                      loading={asking}
                      disabled={asking}
                    >
                      <Send size={16} className="mr-2" /> Submit Question
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4 text-center">
                    <Lock size={28} className="text-gray-400" />
                    <p className="mt-2 font-medium text-gray-700">
                      Login to ask a question
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      You need an account to ask questions about this product.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <Link href="/login">
                        <Button>Login</Button>
                      </Link>
                      <Link href="/register">
                        <Button variant="outline">Create account</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="pt-4">
              {/* Existing reviews */}
              {(product.ratings || []).filter((r) => r.status === 'approved')
                .length > 0 ? (
                <div className="space-y-4">
                  {(product.ratings || [])
                    .filter((r) => r.status === 'approved')
                    .map((r) => (
                      <div
                        key={r._id || Math.random()}
                        className="rounded-xl border border-gray-200 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                              {(r.user?.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {r.user?.name || 'Customer'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(r.createdAt)}
                              </p>
                            </div>
                          </div>
                          <Stars value={r.rating} />
                        </div>
                        {r.comment && (
                          <p className="mt-3 text-sm leading-relaxed text-gray-600">
                            {r.comment}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MessageSquare size={36} className="text-gray-300" />
                  <p className="mt-3 text-gray-500">
                    No reviews yet for this product. Be the first to review it!
                  </p>
                </div>
              )}

              {/* Review form / login gate */}
              <div className="mt-6 rounded-xl border border-gray-200 p-4">
                {user ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">
                      Write a Review
                    </h4>
                    <div className="flex items-center gap-3">
                      <StarPicker value={rating} onChange={setRating} />
                      <span className="text-sm text-gray-500">
                        {rating > 0
                          ? `${rating} star${rating > 1 ? 's' : ''}`
                          : 'Select a rating'}
                      </span>
                    </div>
                    <Textarea
                      value={comment}
                      onChange={(e) => {
                        setComment(e.target.value);
                        setReviewError('');
                      }}
                      placeholder="Share your experience with this product..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {reviewError && (
                      <p className="text-sm text-red-600">{reviewError}</p>
                    )}
                    <Button
                      onClick={handleSubmitReview}
                      loading={submittingReview}
                      disabled={submittingReview}
                    >
                      Submit Review
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4 text-center">
                    <Lock size={28} className="text-gray-400" />
                    <p className="mt-2 font-medium text-gray-700">
                      Login to write a review
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      You need an account to review this product.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <Link href="/login">
                        <Button>Login</Button>
                      </Link>
                      <Link href="/register">
                        <Button variant="outline">Create account</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Similar Products */}
        <aside className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Similar Products
          </h2>
          {related.length > 0 ? (
            <div className="space-y-3">
              {related.map((p) => {
                const pFinal = p.discountPrice > 0 ? p.discountPrice : p.price;
                return (
                  <Link
                    key={p._id}
                    href={`/product/${p.slug}`}
                    className="flex gap-3 rounded-xl border border-gray-200 p-3 hover:border-blue-300 hover:shadow-sm transition"
                  >
                    <div className="relative h-16 w-16 shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                      <Image
                        src={p.images[0] || '/placeholder-image.png'}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">
                        {p.name}
                      </p>
                      <p className="text-sm font-bold text-green-700 mt-1">
                        ৳{pFinal.toLocaleString()}
                        {p.discountPrice > 0 && p.discountPrice < p.price && (
                          <span className="ml-1.5 text-xs text-gray-400 line-through font-normal">
                            ৳{p.price.toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No similar products found.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

// Re-shape a freshly fetched raw product while keeping client-only fields
function toProductShapeSafe(raw: any, fallback: Product): Product {
  try {
    return {
      ...fallback,
      _id: raw._id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description || '',
      price: raw.price || 0,
      discountPrice: raw.discountPrice || 0,
      category: raw.category || '',
      path: [],
      productCode: raw.productCode || '',
      brand: raw.brand || '',
      images: raw.images || [],
      imageAlts: raw.imageAlts || [],
      stock: raw.stock ?? 0,
      featured: !!raw.featured,
      specifications: raw.specifications || {},
      content: raw.content || [],
      seo: raw.seo || {},
      averageRating: raw.averageRating || 0,
      ratings: raw.ratings || [],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  } catch {
    return fallback;
  }
}
