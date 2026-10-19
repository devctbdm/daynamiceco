// src/components/store/layout/Breadcrumb.tsx
'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Props {
  slug: string[];
}

// Map slugs to user-friendly names
const slugLabelMap: Record<string, string> = {
  desktops: 'Desktops',
  laptops: 'Laptops',
  components: 'Components',
  monitors: 'Monitors',
  phones: 'Phones',
  tablets: 'Tablets',
  gaming: 'Gaming',
  networking: 'Networking',
  accessories: 'Accessories',
  gpu: 'Graphics Cards',
  cpu: 'Processors',
  intel: 'Intel',
  amd: 'AMD',
  nvidia: 'NVIDIA',
  apple: 'Apple',
  samsung: 'Samsung',
  asus: 'ASUS',
  dell: 'Dell',
  lg: 'LG',
  'core-i9': 'Core i9',
  'ryzen-9': 'Ryzen 9',
  'rtx-4090': 'RTX 4090',
  'rtx-4070': 'RTX 4070',
  'rx-7900xtx': 'RX 7900 XTX',
  'all-in-one': 'All-in-One',
  console: 'Console',
  routers: 'Routers',
  'wifi-6': 'WiFi 6',
  // Add more mappings as needed
};

export const Breadcrumb: React.FC<Props> = ({ slug }) => {
  const paths = [{ label: 'Home', href: '/' }];

  let currentPath = '';
  slug.forEach((segment) => {
    currentPath += `/${segment}`;
    const label =
      slugLabelMap[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    paths.push({ label, href: currentPath });
  });

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4 overflow-x-auto whitespace-nowrap">
      {paths.map((path, index) => (
        <span key={path.href} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight size={14} className="text-gray-400 shrink-0" />
          )}
          {index === paths.length - 1 ? (
            <span className="font-semibold text-gray-900">{path.label}</span>
          ) : (
            <Link href={path.href} className="hover:text-blue-600 transition">
              {path.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
};
