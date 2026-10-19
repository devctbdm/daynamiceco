import FeaturedCategory from '@/components/homeComponents/FeaturedCategory';
import FeaturedProducts from '@/components/homeComponents/FeaturedProducts';
import HomeSlider from '@/components/homeComponents/HomeSlider';
import { mapSliders } from '@/components/homeComponents/homeSliderShared';
import NotifidText from '@/components/homeComponents/NotifidText';
import PhysicalStores from '@/components/homeComponents/PhysicalStores';
import ServiceBox from '@/components/homeComponents/ServiceBox';
import HomeContentDisplay from '@/components/HomeContentDisplay';
import { fetchActiveSliders } from '@/lib/serverApi';

// Server Component — read data (sliders, categories, products, stores,
// notifications, content) is fetched with the built-in Next.js fetch().
const HomePage = async () => {
  const sliderResponse = await fetchActiveSliders();
  const sliders = mapSliders(sliderResponse.sliders, sliderResponse.setting);

  return (
    <div className="mx-auto max-w-7xl">
      <HomeSlider data={sliders} />

      <NotifidText />

      <ServiceBox />

      <FeaturedCategory />

      <PhysicalStores />

      <FeaturedProducts />

      <HomeContentDisplay />
    </div>
  );
};

export default HomePage;
