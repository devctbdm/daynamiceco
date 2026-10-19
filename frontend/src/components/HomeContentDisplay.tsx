import { fetchHomeContent } from '@/lib/serverApi';

// Server Component — the home content block is fetched with the built-in
// Next.js fetch() and rendered on the server.
export default async function HomeContentDisplay() {
  const homeContent = await fetchHomeContent();

  if (!homeContent || homeContent.enabled === false) return null;

  const content = homeContent.content || '';
  if (!content || content === '<p></p>') return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div
        className="rich-text max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
