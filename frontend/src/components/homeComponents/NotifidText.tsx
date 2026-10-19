import Marquee from '@/components/homeComponents/Marquee';
import { fetchHomeSliderTexts, fetchHomeSliderSetting } from '@/lib/serverApi';

// Server Component — notifications are fetched with the built-in Next.js
// fetch() and rendered into the (client) marquee. Hidden when disabled.
export default async function NotifidText() {
  const [texts, setting] = await Promise.all([
    fetchHomeSliderTexts(),
    fetchHomeSliderSetting(),
  ]);

  const list = texts.map((t) => t.text).filter((t: string) => t && t.trim());

  if (setting?.enabled === false || list.length === 0) return null;

  return (
    <div className="rounded-md bg-gray-100 py-2">
      <Marquee speed="slow">
        {list.map((notification: string, index: number) => (
          <span key={index}>{notification}</span>
        ))}
      </Marquee>
    </div>
  );
}
