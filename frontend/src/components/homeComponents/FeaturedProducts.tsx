import { FeaturedProductsGrid } from './FeaturedProductsCard';
import { fetchFeaturedProducts } from '@/lib/serverApi';

// Server Component — products are fetched with the built-in Next.js fetch()
// (cached/revalidated). No client-side fetch or loading state needed.
const FeaturedProducts = async () => {
  const all = await fetchFeaturedProducts(12);

  const featured = all.filter((p) => p.featured && p.status !== 'draft');
  const products = featured.length > 0 ? featured : all;

  if (products.length === 0) return null;

  return (
    <div className="flex flex-col gap-8 py-4">
      <div className="flex flex-col items-center justify-center gap-2">
        <h2 className="text-2xl font-bold">Featured Products</h2>
        <p className="text-sm text-gray-600">
          Get Your Desired Product from Featured Products!
        </p>
      </div>
      <FeaturedProductsGrid
        products={products.map((p) => ({
          id: p._id,
          name: p.name,
          slug: p.slug,
          price: p.discountPrice > 0 ? p.discountPrice : p.price,
          comparePrice: p.discountPrice > 0 ? p.price : null,
          images: p.images || [],
          isFeatured: p.featured,
          category: {
            name:
              p.categories && p.categories.length > 0
                ? p.categories[0]
                : p.category,
            slug: (p.categories && p.categories.length > 0
              ? p.categories[0]
              : p.category
            )
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-'),
          },
        }))}
        columns={4}
        imageHeight={220}
        showCategory={true}
        skeletonCount={8}
      />
    </div>
  );
};

export default FeaturedProducts;
