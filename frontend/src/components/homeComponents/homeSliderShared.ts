// Shared slider data types + mapping (no 'use client', so both the server
// component that fetches and the client carousel that renders can use it).
import type { StaticImageData } from 'next/image';

export interface SlideData {
  id: string;
  image: string | StaticImageData;
  link?: string;
}

export interface AdBoxData {
  id: string;
  image: string | StaticImageData;
  link?: string;
  position: 'top' | 'bottom';
}

export interface HomeSliderData {
  slides: SlideData[];
  adBoxes: AdBoxData[];
  autoSlide: boolean;
  interval: number;
}

type SliderLike = {
  _id: string;
  image: string;
  link?: string;
  type: 'hero' | 'ad_top' | 'ad_bottom';
};

const safeLink = (value?: string) => {
  const link = value?.trim();
  if (!link) return undefined;
  if (link.startsWith('/') && !link.startsWith('//')) return link;
  try {
    const url = new URL(link);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? link
      : undefined;
  } catch {
    return undefined;
  }
};

export const mapSliders = (
  sliders: SliderLike[],
  setting?: { enabled?: boolean; autoSlide?: boolean; interval?: number } | null
): HomeSliderData => {
  const slides = (
    setting?.enabled === false
      ? []
      : sliders.filter((s) => s.type === 'hero' && s.image)
  ).map((s) => ({
    id: s._id,
    image: s.image,
    link: safeLink(s.link),
  }));

  const adBoxes = sliders
    .filter((s) => (s.type === 'ad_top' || s.type === 'ad_bottom') && s.image)
    .reduce<AdBoxData[]>((ads, s) => {
      const position = s.type === 'ad_top' ? 'top' : 'bottom';
      if (!ads.some((ad) => ad.position === position)) {
        ads.push({
          id: s._id,
          image: s.image,
          link: safeLink(s.link),
          position,
        });
      }
      return ads;
    }, []);

  return {
    slides,
    adBoxes,
    autoSlide: setting?.autoSlide ?? true,
    interval: Math.min(10, Math.max(3, setting?.interval ?? 5)),
  };
};
