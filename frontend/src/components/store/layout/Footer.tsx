'use client';

import { Separator } from '@/components/ui/separator';
import { useResource } from '@/hooks/useResource';
import { storePublicResource } from '@/lib/resources';
import { DEFAULT_FOOTER_CONFIG } from '@/lib/footerConfig';
import { FOOTER_SOCIAL_ICON_MAP } from '@/lib/footerSocialIcons';
import { MapPinCheck, Phone } from 'lucide-react';
import { FaApple, FaGooglePlay } from 'react-icons/fa6';

function externalLink(url: string) {
  return url.startsWith('http://') || url.startsWith('https://');
}

const Footer = () => {
  const { data: settings } = useResource(storePublicResource);
  const config = settings?.footerConfig ?? DEFAULT_FOOTER_CONFIG;
  if (!config.enabled) return null;

  const storeName = settings?.storeName || 'Apple IT Zone';
  const supportPhone = config.support.phone || settings?.phone || '';
  const aboutLinks = config.about.links.filter(
    (link) => link.enabled && link.label.trim() && link.url.trim()
  );
  const socialLinks = config.social.links.filter(
    (link) => link.enabled && link.label.trim() && link.url.trim()
  );
  const hasAppLinks =
    config.apps.enabled &&
    (config.apps.googlePlayUrl || config.apps.appStoreUrl);
  const columnCount = [
    config.support.enabled,
    config.about.enabled,
    config.contact.enabled,
  ].filter(Boolean).length;

  return (
    <footer className="mb-16 bg-slate-900 py-8 text-white xl:mb-0">
      <div className="mx-auto max-w-7xl px-4">
        <div
          className={`grid grid-cols-1 gap-8 sm:grid-cols-2 ${
            columnCount === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
          }`}
        >
          {config.support.enabled && (
            <section className="flex flex-col gap-5 py-4">
              <h3 className="text-lg font-semibold">{config.support.title}</h3>
              {(config.support.hours || supportPhone) && (
                <div className="flex items-center gap-3 rounded-md border-l-2 border-gray-600 pl-2">
                  <Phone className="size-5 shrink-0" />
                  <Separator className="my-2 h-9" orientation="vertical" />
                  <div className="flex min-w-0 flex-col">
                    {config.support.hours && (
                      <span className="text-xs text-gray-400">
                        {config.support.hours}
                      </span>
                    )}
                    {supportPhone && (
                      <a
                        href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`}
                        className="wrap-break-word text-xs font-bold text-gray-300"
                      >
                        {supportPhone}
                      </a>
                    )}
                  </div>
                </div>
              )}
              {(config.support.locationTitle || config.support.location) && (
                <div className="flex items-center gap-3 rounded-md border-l-2 border-gray-600 pl-2">
                  <MapPinCheck className="size-5 shrink-0" />
                  <Separator className="my-2 h-9" orientation="vertical" />
                  <div className="flex min-w-0 flex-col">
                    {config.support.locationTitle && (
                      <span className="text-xs text-gray-400">
                        {config.support.locationTitle}
                      </span>
                    )}
                    {config.support.location && (
                      <span className="text-xs font-bold text-gray-300">
                        {config.support.location}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {config.about.enabled && (
            <section className="flex flex-col gap-5 py-4">
              <h3 className="text-lg font-semibold">{config.about.title}</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {aboutLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target={externalLink(link.url) ? '_blank' : undefined}
                    rel={
                      externalLink(link.url) ? 'noopener noreferrer' : undefined
                    }
                    className="text-sm text-gray-400 transition-colors duration-200 hover:text-blue-500"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </section>
          )}

          {config.contact.enabled && (
            <section className="flex flex-col gap-5 py-4">
              <h3 className="text-lg font-semibold">{config.contact.title}</h3>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-gray-300 sm:text-lg">
                  {storeName}
                </h4>
                {settings?.address && (
                  <p className="text-sm leading-relaxed text-gray-400">
                    {config.contact.addressLabel}: {settings.address}
                  </p>
                )}
                {settings?.phone && (
                  <p className="text-sm text-gray-400">
                    {config.contact.phoneLabel}: {settings.phone}
                  </p>
                )}
                {settings?.email && (
                  <p className="break-all text-sm text-gray-400">
                    {config.contact.emailLabel}: {settings.email}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        {(hasAppLinks || (config.social.enabled && socialLinks.length > 0)) && (
          <>
            <Separator className="my-4 h-0.5 bg-gray-700" />
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              {hasAppLinks && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <p className="text-sm font-medium text-gray-300">
                    {config.apps.title}
                  </p>
                  {config.apps.googlePlayUrl && (
                    <a
                      href={config.apps.googlePlayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-gray-600 px-4 py-2 text-sm text-white transition hover:bg-gray-800"
                    >
                      <FaGooglePlay size={18} aria-hidden="true" />
                      <span>{config.apps.googlePlayLabel}</span>
                    </a>
                  )}
                  {config.apps.appStoreUrl && (
                    <a
                      href={config.apps.appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-gray-600 px-4 py-2 text-sm text-white transition hover:bg-gray-800"
                    >
                      <FaApple size={20} aria-hidden="true" />
                      <span>{config.apps.appStoreLabel}</span>
                    </a>
                  )}
                </div>
              )}
              {config.social.enabled && socialLinks.length > 0 && (
                <ul className="flex items-center justify-center gap-4">
                  {socialLinks.map((link) => {
                    const Icon = FOOTER_SOCIAL_ICON_MAP[link.icon];
                    if (!Icon) return null;
                    return (
                      <li
                        key={link.id}
                        className="transition duration-200 ease-in-out hover:scale-105"
                      >
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={link.label}
                          className="text-gray-400 hover:text-blue-500"
                        >
                          <Icon size={22} aria-hidden="true" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        <Separator className="my-4 h-0.5 bg-gray-700" />
        <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-gray-400 lg:flex-row lg:justify-between">
          <p>
            {config.copyright.text ||
              `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`}
          </p>
          {config.copyright.poweredBy && config.copyright.poweredByText && (
            <p>
              {config.copyright.poweredByLabel}:{' '}
              <span className="font-semibold italic text-blue-500">
                {config.copyright.poweredByText}
              </span>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
