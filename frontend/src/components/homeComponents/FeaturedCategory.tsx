import Image from 'next/image';
import Link from 'next/link';
import { fetchCategories } from '@/lib/serverApi';

// Server Component — categories are fetched with the built-in Next.js fetch()
// (cached/revalidated) and streamed to the client. No client-side fetch.
const FeaturedCategory = async () => {
  const categories = await fetchCategories();

  const featuredCategories = categories
    .filter((cat) => cat.featured && cat.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 7);

  if (featuredCategories.length === 0) return null;

  return (
    <div className="flex flex-col gap-8 py-4">
      <div className="flex flex-col items-center justify-center gap-2">
        <h2 className="text-2xl font-bold">Featured Category</h2>
        <p className="text-sm text-gray-600">
          Get Your Desired Product from Featured Category!
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {featuredCategories.map((category) => (
          <Link
            key={category._id}
            href={`/products/${category.slug}`}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-400"
          >
            {category.imageUrl && (
              <div className="relative h-12 w-12">
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-contain"
                  sizes="48px"
                />
              </div>
            )}
            <h3>{category.name}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FeaturedCategory;
