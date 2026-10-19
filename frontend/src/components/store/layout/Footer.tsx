import { MapPinCheck, Phone } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { FaFacebook, FaInstagram, FaWhatsapp, FaYoutube } from 'react-icons/fa';
import Link from 'next/link';
import { useResource } from '@/hooks/useResource';
import { storePublicResource } from '@/lib/resources';

type StoreInfo = {
  storeName: string;
  email: string;
  phone: string;
  address: string;
};

const Footer = () => {
  const { data: settings } = useResource(storePublicResource);

  const info: StoreInfo = {
    storeName: settings?.storeName || 'Apple IT Zone',
    email: settings?.email || 'info@appleitzone.com',
    phone: settings?.phone || '+8801712345678',
    address: settings?.address
      ? 'Head Office: ' + settings.address
      : 'Head Office: 28 Kazi Nazrul Islam Ave, Navana Zohura Square, Dhaka 1000',
  };

  return (
    <footer className="bg-slate-900 text-white mb-16 xl:mb-0 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Support */}
          <div className="flex flex-col gap-5 py-4">
            <h3 className="text-lg sm:text-lg font-semibold">Support</h3>
            <div className="flex items-center gap-3 border-l-2 border-gray-600 pl-2 rounded-md">
              <Phone className="w-5 h-5 shrink-0" />
              <Separator className="my-2 h-9" orientation="vertical" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-gray-400">9:00 AM - 8:00 PM</span>
                <span className="text-xs sm:text-xs font-bold text-gray-300 wrap-break-word">
                  01911059059
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 border-l-2 border-gray-600 pl-2 rounded-md">
              <MapPinCheck className="w-5 h-5 shrink-0" />
              <Separator className="my-2 h-9" orientation="vertical" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-gray-400">Store Locator</span>
                <span className="text-xs sm:text-xs font-bold text-gray-300">
                  Dhaka, Bangladesh
                </span>
              </div>
            </div>
          </div>

          {/* About Us */}
          <div className="flex flex-col gap-5 py-4">
            <h3 className="text-lg sm:text-lg font-semibold">About Us</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                'Online Delivery',
                'Refund and Returns policy',
                'Blog',
                'EMI Terms',
                'Privacy Policy',
                'Contact Us',
                'Terms and Conditions',
                'Brands',
              ].map((label) => (
                <Link
                  key={label}
                  href="/"
                  className="text-sm text-gray-400 hover:text-blue-500 transition-colors duration-200"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Stay Connected */}
          <div className="flex flex-col gap-5 py-4">
            <h3 className="text-lg sm:text-lg font-semibold">Stay Connected</h3>
            <div className="space-y-1">
              <h4 className="text-base sm:text-lg font-bold text-gray-300">
                {info.storeName}
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                {info.address}
              </p>
              <p className="text-sm text-gray-400">Phone: {info.phone}</p>
              <p className="text-sm text-gray-400 break-all">
                Email: {info.email}
              </p>
            </div>
          </div>
        </div>

        <Separator className="h-0.5 bg-gray-700 my-4" />

        <div className="flex justify-center">
          <ul className="flex flex-wrap gap-4">
            {[FaWhatsapp, FaFacebook, FaYoutube, FaInstagram].map((Icon, i) => (
              <li
                key={i}
                className="transition duration-200 ease-in-out hover:scale-105"
              >
                <Link href="/" className="text-gray-400 hover:text-blue-500">
                  <Icon size={22} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Separator className="h-0.5 bg-gray-700 my-4" />

        <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-2 text-xs text-gray-400 text-center">
          <p>
            © {new Date().getFullYear()} {info.storeName}. All rights reserved.
          </p>
          <p>
            Powered by:{' '}
            <span className="text-blue-500 font-semibold italic">
              Apple IT Zone
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
