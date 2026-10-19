'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import {
  type AdBoxData,
  type HomeSliderData,
  type SlideData,
} from './homeSliderShared';

export type { AdBoxData, HomeSliderData, SlideData };

interface HomeSliderProps {
  data?: HomeSliderData;
}

const EMPTY_DATA: HomeSliderData = {
  slides: [],
  adBoxes: [],
  autoSlide: true,
  interval: 5,
};

const HomeSlider: React.FC<HomeSliderProps> = ({ data = EMPTY_DATA }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideCount = data.slides.length;
  const ads = data.adBoxes
    .filter((ad) => ad.position === 'top' || ad.position === 'bottom')
    .sort(
      (a, b) =>
        (a.position === 'top' ? -1 : 1) - (b.position === 'top' ? -1 : 1)
    );

  useEffect(() => {
    if (!data.autoSlide || slideCount < 2) return;

    let timer: number | undefined;
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      if (document.visibilityState === 'visible' && timer === undefined) {
        timer = window.setInterval(() => {
          setCurrentIndex((index) => (index + 1) % slideCount);
        }, data.interval * 1000);
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [data.autoSlide, data.interval, slideCount]);

  useEffect(() => {
    if (currentIndex >= slideCount) setCurrentIndex(0);
  }, [currentIndex, slideCount]);

  if (slideCount === 0 && ads.length === 0) return null;

  const mainSlide = data.slides[currentIndex];

  return (
    <section className="w-full" aria-label="Homepage promotions">
      <div className="relative left-1/2 mx-auto w-[min(1345px,calc(100vw_-_2rem))] -translate-x-1/2 px-4 py-6">
        <div
          className={`grid grid-cols-1 items-center gap-4 ${
            slideCount && ads.length
              ? 'lg:grid-cols-[minmax(0,982px)_315px]'
              : 'lg:grid-cols-1'
          }`}
        >
          {mainSlide && (
            <div className="relative aspect-[982/500] w-full overflow-hidden rounded-xl bg-gray-100 lg:h-[500px] lg:aspect-auto">
              {data.slides.map((slide, index) => {
                const image = (
                  <Image
                    src={slide.image}
                    alt="Homepage promotion"
                    fill
                    priority={index === currentIndex}
                    loading={index === currentIndex ? undefined : 'lazy'}
                    sizes="(max-width: 1024px) 100vw, min(982px, 72vw)"
                    className={`object-cover object-center transition-opacity duration-300 ${
                      index === currentIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                );
                return (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      index === currentIndex
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0'
                    }`}
                    aria-hidden={index !== currentIndex}
                  >
                    {slide.link ? (
                      <a
                        href={slide.link}
                        aria-label="Open promotion"
                        className="absolute inset-0"
                      >
                        {image}
                      </a>
                    ) : (
                      image
                    )}
                  </div>
                );
              })}

              {slideCount > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex(
                        (index) => (index - 1 + slideCount) % slideCount
                      )
                    }
                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition-colors hover:bg-white"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((index) => (index + 1) % slideCount)
                    }
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition-colors hover:bg-white"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                    {data.slides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => setCurrentIndex(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === currentIndex
                            ? 'w-6 bg-white'
                            : 'w-2 bg-white/60'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                        aria-current={index === currentIndex}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {ads.length > 0 && (
            <div
              className={`grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-2 ${
                slideCount
                  ? ''
                  : ads.length > 1
                    ? 'lg:max-w-[638px] lg:grid-cols-2 lg:justify-self-center'
                    : 'lg:max-w-[315px] lg:grid-cols-1 lg:justify-self-center'
              }`}
            >
              {ads.map((ad) => {
                const image = (
                  <Image
                    src={ad.image}
                    alt="Homepage advertisement"
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 50vw, 315px"
                    className="object-cover object-center"
                  />
                );
                return (
                  <div
                    key={ad.id}
                    className="relative aspect-[5/4] min-w-0 overflow-hidden rounded-xl bg-gray-100 lg:w-full"
                  >
                    {ad.link ? (
                      <a
                        href={ad.link}
                        aria-label="Open advertisement"
                        className="absolute inset-0"
                      >
                        {image}
                      </a>
                    ) : (
                      image
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HomeSlider;
