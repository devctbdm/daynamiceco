'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth, useCart } from '@/store';
import { useStoreStatus } from '@/components/store/StoreStatusProvider';
import { Product, ProductVariant } from '@/types/product';
import { Button } from '@/components/button/Button';

interface Props {
  product: Product;
  quantity?: number;
  disabled?: boolean;
  variant?: ProductVariant;
  variantRequired?: boolean;
}

const MIN_ADD_DURATION = 600;

const DEFAULT_SELLING_NOTICE =
  'Buying is temporarily disabled. You can browse, but orders cannot be placed right now.';

export const AddToCartButton: React.FC<Props> = ({
  product,
  quantity = 1,
  disabled = false,
  variant,
  variantRequired = false,
}) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addItem, isLoading, items } = useCart();
  const { buyingEnabled, sellingMessage } = useStoreStatus();
  const [adding, setAdding] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!localStorage.getItem('mobile_token'));
  }, [isAuthenticated]);

  const variantPrice =
    typeof variant?.price === 'number' ? variant.price : undefined;
  const variantDiscount =
    typeof variant?.discountPrice === 'number' &&
    variant.discountPrice > 0 &&
    variantPrice !== undefined &&
    variant.discountPrice < variantPrice
      ? variant.discountPrice
      : 0;
  const variantIsComplete =
    !variantRequired ||
    (!!variant?._id &&
      variantPrice !== undefined &&
      typeof variant.stock === 'number' &&
      !!variant.sku?.trim());

  const handleAdd = async () => {
    if (adding) return;
    const hasStoredToken = !!localStorage.getItem('mobile_token');
    if (!isAuthenticated && !hasStoredToken) {
      const redirect = `${window.location.pathname}${window.location.search}`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (!variantIsComplete) {
      toast.error('Please select a complete product combination.');
      return;
    }
    if (variantRequired && (!variant || (variant.stock ?? 0) < quantity)) {
      toast.error('This combination is out of stock.');
      return;
    }
    const alreadyInCart =
      items.find(
        (item) =>
          item.productId === product._id &&
          (item.variantId || '') === (variant?._id || '')
      )?.quantity || 0;
    const availableStock = variantRequired
      ? variant?.stock ?? 0
      : product.stock;
    if (alreadyInCart + quantity > availableStock) {
      toast.error('The requested quantity exceeds available stock.');
      return;
    }
    if (!buyingEnabled) {
      toast.error(sellingMessage?.trim() || DEFAULT_SELLING_NOTICE);
      return;
    }
    setAdding(true);
    try {
      const started = Date.now();
      const normalPrice = variantRequired
        ? variantPrice!
        : product.price;
      const salePrice = variantRequired
        ? variantDiscount || normalPrice
        : product.discountPrice > 0 && product.discountPrice < product.price
          ? product.discountPrice
          : product.price;
      await addItem({
        productId: product._id,
        name: product.name,
        variantId: variantRequired ? variant?._id : undefined,
        variantLabel: variantRequired
          ? [variant?.color, variant?.storage, variant?.ram]
              .filter(Boolean)
              .join(' / ')
          : '',
        sku: variantRequired ? variant?.sku : product.sku || '',
        price: salePrice,
        promoDiscount: normalPrice - salePrice,
        image:
          (variantRequired ? variant?.images?.[0] : undefined) ||
          product.images[0],
        stock: variantRequired ? variant?.stock ?? 0 : product.stock,
        quantity,
      });
      const elapsed = Date.now() - started;
      const remaining = MIN_ADD_DURATION - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Could not add this combination to your cart.'
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <Button
      onClick={handleAdd}
      loading={adding || isLoading}
      fullWidth
      size="sm"
      disabled={disabled || !variantIsComplete}
    >
      {!isAuthenticated && !hasToken
        ? 'Login to Add to Cart'
        : buyingEnabled
          ? 'Add to Cart'
          : 'Buying Disabled'}
    </Button>
  );
};
