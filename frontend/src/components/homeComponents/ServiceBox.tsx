import Link from 'next/link';
import {
  fetchServiceFinderItems,
  fetchServiceFinderSetting,
} from '@/lib/serverApi';
import { serviceIcon } from '@/lib/serviceIcons';

/**
 * Home page service finder cards (server rendered — no client JS).
 * Icon, title, subtitle, link and homepage visibility are managed from
 * /admin/service-finder; hidden cards are filtered out by the API and the
 * whole section can be switched off from the same page.
 */
const ServiceBox = async () => {
  const [services, setting] = await Promise.all([
    fetchServiceFinderItems(),
    fetchServiceFinderSetting(),
  ]);

  if (setting?.enabled === false) return null;
  if (!services.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 py-4 justify-items-center md:grid-cols-2 lg:grid-cols-4">
      {services.map((service) => {
        const Icon = serviceIcon(service.icon);
        const body = (
          <>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-blue-500 to-indigo-600">
              <Icon className="size-6 text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold">{service.title}</h3>
              {service.subtitle && (
                <p className="text-sm text-gray-600">{service.subtitle}</p>
              )}
            </div>
          </>
        );
        const className =
          'flex w-full max-w-md items-center gap-4 rounded-lg border border-gray-200 p-4';

        return service.href ? (
          <Link
            key={service._id}
            href={service.href}
            className={`${className} transition-shadow hover:shadow-md`}
          >
            {body}
          </Link>
        ) : (
          <div key={service._id} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
};

export default ServiceBox;
