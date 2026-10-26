'use client';

import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DEFAULT_FOOTER_CONFIG,
  type FooterConfig,
  type FooterLink,
  type FooterSocialLink,
} from '@/lib/footerConfig';
import { storeApi } from '@/lib/api';
import { FOOTER_SOCIAL_ICONS } from '@/lib/footerSocialIcons';
import { storePublicResource } from '@/lib/resources';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const emptySocial = (): FooterSocialLink => ({
  id: `social-${Date.now()}`,
  label: 'New social link',
  icon: 'FaFacebook',
  url: '',
  enabled: true,
});

const emptyAboutLink = (): FooterLink => ({
  id: `about-${Date.now()}`,
  label: '',
  url: '',
  enabled: true,
});

function safeLink(value: string, social = false) {
  const url = value.trim();
  if (!url) return true;
  if (!social && url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' ||
      parsed.protocol === 'http:' ||
      (!social && (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:'))
    );
  } catch {
    return false;
  }
}

function safeWebLink(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function EditorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SectionCard({
  title,
  description,
  enabled,
  onEnabledChange,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Show</Label>
          <Switch
            aria-label={`Show ${title}`}
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </CardHeader>
      {enabled && <CardContent className="space-y-4">{children}</CardContent>}
    </Card>
  );
}

export default function FooterCmsPage() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await storeApi.get();
      if (data.settings.footerConfig) {
        setConfig(data.settings.footerConfig);
      }
    } catch (error: unknown) {
      setLoadError(true);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not load footer settings'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateSection = <
    K extends 'support' | 'about' | 'contact' | 'apps' | 'social',
  >(
    section: K,
    values: Partial<FooterConfig[K]>
  ) => {
    setConfig((current) => ({
      ...current,
      [section]: { ...current[section], ...values },
    }));
  };

  const updateCopyright = (values: Partial<FooterConfig['copyright']>) => {
    setConfig((current) => ({
      ...current,
      copyright: { ...current.copyright, ...values },
    }));
  };

  const updateAboutLink = (id: string, values: Partial<FooterLink>) => {
    updateSection('about', {
      links: config.about.links.map((link) =>
        link.id === id ? { ...link, ...values } : link
      ),
    });
  };

  const updateSocialLink = (id: string, values: Partial<FooterSocialLink>) => {
    updateSection('social', {
      links: config.social.links.map((link) =>
        link.id === id ? { ...link, ...values } : link
      ),
    });
  };

  const save = async () => {
    const invalidAboutLink = config.about.links.some(
      (link) => link.enabled && (!link.label.trim() || !safeLink(link.url))
    );
    const invalidSocialLink = config.social.links.some(
      (link) =>
        link.enabled &&
        (!link.label.trim() || !link.url.trim() || !safeLink(link.url, true))
    );
    if (invalidAboutLink || invalidSocialLink) {
      toast.error('Add a label and valid URL for each enabled footer link');
      return;
    }
    if (
      !safeWebLink(config.apps.googlePlayUrl) ||
      !safeWebLink(config.apps.appStoreUrl)
    ) {
      toast.error('App links must use a valid http(s) URL');
      return;
    }

    setSaving(true);
    try {
      const { data } = await storeApi.update({ footerConfig: config });
      setConfig(data.settings.footerConfig);
      storePublicResource.set(data.settings);
      toast.success('Footer settings saved');
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save footer settings'
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setConfig(structuredClone(DEFAULT_FOOTER_CONFIG));

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div className="p-8 text-sm text-muted-foreground">
          Loading footer settings…
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <h1 className="text-3xl font-bold tracking-tight">Footer CMS</h1>
          <p className="text-muted-foreground">
            Footer settings could not be loaded. Nothing has been changed.
          </p>
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Footer CMS</h1>
            <p className="text-muted-foreground">
              Manage every storefront footer section, link, app button, and
              social profile.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} disabled={saving}>
              Reset defaults
            </Button>
            <Button onClick={save} disabled={saving}>
              <Save className="mr-2 size-4" />
              {saving ? 'Saving…' : 'Save footer'}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Storefront footer</CardTitle>
              <CardDescription>
                Turn the entire footer on or off.
              </CardDescription>
            </div>
            <Switch
              aria-label="Enable storefront footer"
              checked={config.enabled}
              onCheckedChange={(enabled) =>
                setConfig((current) => ({ ...current, enabled }))
              }
            />
          </CardHeader>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard
            title="Support"
            description="Hours, phone number, and store locator details."
            enabled={config.support.enabled}
            onEnabledChange={(enabled) => updateSection('support', { enabled })}
          >
            <EditorField
              label="Section title"
              value={config.support.title}
              onChange={(title) => updateSection('support', { title })}
            />
            <EditorField
              label="Opening hours"
              value={config.support.hours}
              onChange={(hours) => updateSection('support', { hours })}
            />
            <EditorField
              label="Support phone (leave blank to use store phone)"
              value={config.support.phone}
              onChange={(phone) => updateSection('support', { phone })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <EditorField
                label="Location label"
                value={config.support.locationTitle}
                onChange={(locationTitle) =>
                  updateSection('support', { locationTitle })
                }
              />
              <EditorField
                label="Location"
                value={config.support.location}
                onChange={(location) => updateSection('support', { location })}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="About links"
            description="Add and arrange links shown in the footer."
            enabled={config.about.enabled}
            onEnabledChange={(enabled) => updateSection('about', { enabled })}
          >
            <EditorField
              label="Section title"
              value={config.about.title}
              onChange={(title) => updateSection('about', { title })}
            />
            <div className="space-y-3">
              {config.about.links.map((link) => (
                <div
                  key={link.id}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                >
                  <Input
                    aria-label="Footer link label"
                    placeholder="Link label"
                    value={link.label}
                    onChange={(event) =>
                      updateAboutLink(link.id, { label: event.target.value })
                    }
                  />
                  <Input
                    aria-label="Footer link URL"
                    placeholder="/page or https://example.com"
                    value={link.url}
                    onChange={(event) =>
                      updateAboutLink(link.id, { url: event.target.value })
                    }
                  />
                  <Switch
                    aria-label={`Show ${link.label || 'footer link'}`}
                    checked={link.enabled}
                    onCheckedChange={(enabled) =>
                      updateAboutLink(link.id, { enabled })
                    }
                  />
                  <Button
                    aria-label="Remove footer link"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      updateSection('about', {
                        links: config.about.links.filter(
                          (item) => item.id !== link.id
                        ),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  updateSection('about', {
                    links: [...config.about.links, emptyAboutLink()],
                  })
                }
              >
                <Plus className="mr-2 size-4" />
                Add link
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Store contact"
            description="Uses the store name, address, phone, and email from General Settings."
            enabled={config.contact.enabled}
            onEnabledChange={(enabled) => updateSection('contact', { enabled })}
          >
            <EditorField
              label="Section title"
              value={config.contact.title}
              onChange={(title) => updateSection('contact', { title })}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <EditorField
                label="Address label"
                value={config.contact.addressLabel}
                onChange={(addressLabel) =>
                  updateSection('contact', { addressLabel })
                }
              />
              <EditorField
                label="Phone label"
                value={config.contact.phoneLabel}
                onChange={(phoneLabel) =>
                  updateSection('contact', { phoneLabel })
                }
              />
              <EditorField
                label="Email label"
                value={config.contact.emailLabel}
                onChange={(emailLabel) =>
                  updateSection('contact', { emailLabel })
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Update the displayed contact details from Settings → General.
            </p>
          </SectionCard>

          <SectionCard
            title="App downloads"
            description="Configure the app buttons and where they take customers."
            enabled={config.apps.enabled}
            onEnabledChange={(enabled) => updateSection('apps', { enabled })}
          >
            <EditorField
              label="Section title"
              value={config.apps.title}
              onChange={(title) => updateSection('apps', { title })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <EditorField
                label="Google Play button label"
                value={config.apps.googlePlayLabel}
                onChange={(googlePlayLabel) =>
                  updateSection('apps', { googlePlayLabel })
                }
              />
              <EditorField
                label="Google Play URL"
                value={config.apps.googlePlayUrl}
                onChange={(googlePlayUrl) =>
                  updateSection('apps', { googlePlayUrl })
                }
                placeholder="https://play.google.com/..."
              />
              <EditorField
                label="App Store button label"
                value={config.apps.appStoreLabel}
                onChange={(appStoreLabel) =>
                  updateSection('apps', { appStoreLabel })
                }
              />
              <EditorField
                label="App Store URL"
                value={config.apps.appStoreUrl}
                onChange={(appStoreUrl) =>
                  updateSection('apps', { appStoreUrl })
                }
                placeholder="https://apps.apple.com/..."
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Social links"
            description="Choose an icon from React Icons for each profile."
            enabled={config.social.enabled}
            onEnabledChange={(enabled) => updateSection('social', { enabled })}
          >
            <div className="space-y-3">
              {config.social.links.map((link) => (
                <div
                  key={link.id}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1.5fr_auto_auto]"
                >
                  <Input
                    aria-label="Social link label"
                    placeholder="Facebook"
                    value={link.label}
                    onChange={(event) =>
                      updateSocialLink(link.id, { label: event.target.value })
                    }
                  />
                  <select
                    aria-label="Social icon"
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={link.icon}
                    onChange={(event) =>
                      updateSocialLink(link.id, { icon: event.target.value })
                    }
                  >
                    {FOOTER_SOCIAL_ICONS.map(({ name, title }) => (
                      <option key={name} value={name}>
                        {title}
                      </option>
                    ))}
                  </select>
                  <Input
                    aria-label="Social profile URL"
                    placeholder="https://social.example/profile"
                    value={link.url}
                    onChange={(event) =>
                      updateSocialLink(link.id, { url: event.target.value })
                    }
                  />
                  <Switch
                    aria-label={`Show ${link.label || 'social link'}`}
                    checked={link.enabled}
                    onCheckedChange={(enabled) =>
                      updateSocialLink(link.id, { enabled })
                    }
                  />
                  <Button
                    aria-label="Remove social link"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      updateSection('social', {
                        links: config.social.links.filter(
                          (item) => item.id !== link.id
                        ),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  updateSection('social', {
                    links: [...config.social.links, emptySocial()],
                  })
                }
              >
                <Plus className="mr-2 size-4" />
                Add social link
              </Button>
            </div>
          </SectionCard>

          <Card>
            <CardHeader>
              <CardTitle>Copyright</CardTitle>
              <CardDescription>
                Set the copyright notice and optional credit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditorField
                label="Copyright text (leave blank to use the store name)"
                value={config.copyright.text}
                onChange={(text) => updateCopyright({ text })}
              />
              <EditorField
                label="Powered-by label"
                value={config.copyright.poweredByLabel}
                onChange={(poweredByLabel) =>
                  updateCopyright({ poweredByLabel })
                }
              />
              <EditorField
                label="Powered by"
                value={config.copyright.poweredByText}
                onChange={(poweredByText) => updateCopyright({ poweredByText })}
              />
              <div className="flex items-center gap-2">
                <Switch
                  aria-label="Show powered by credit"
                  checked={config.copyright.poweredBy}
                  onCheckedChange={(poweredBy) =>
                    updateCopyright({ poweredBy })
                  }
                />
                <Label>Show powered-by credit</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
