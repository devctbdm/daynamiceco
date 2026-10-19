'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCart } from '@/store';
import { useStoreStatus } from '@/components/store/StoreStatusProvider';
import { Product } from '@/types/product';
import { Button } from '@/components/button/Button';

interface Props {
  product: Product;
  quantity?: number;
  disabled?: boolean;
}

const MIN_ADD_DURATION = 600;

const DEFAULT_SELLING_NOTICE =
  'Buying is temporarily disabled. You can browse, but orders cannot be placed right now.';

export const AddToCartButton: React.FC<Props> = ({
  product,
  quantity = 1,
  disabled = false,
}) => {
  const { addItem, isLoading } = useCart();
  const { buyingEnabled, sellingMessage } = useStoreStatus();
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (adding) return;
    if (!buyingEnabled) {
      toast.error(sellingMessage?.trim() || DEFAULT_SELLING_NOTICE);
      return;
    }
    setAdding(true);
    try {
      const started = Date.now();
      const hasPromo =
        product.discountPrice > 0 && product.discountPrice < product.price;
      await addItem({
        productId: product._id,
        name: product.name,
        price: hasPromo ? product.discountPrice : product.price,
        promoDiscount: hasPromo ? product.price - product.discountPrice : 0,
        image: product.images[0],
        stock: product.stock,
        quantity,
      });
      const elapsed = Date.now() - started;
      const remaining = MIN_ADD_DURATION - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
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
      disabled={disabled}
    >
      {buyingEnabled ? 'Add to Cart' : 'Buying Disabled'}
    </Button>
  );
};
