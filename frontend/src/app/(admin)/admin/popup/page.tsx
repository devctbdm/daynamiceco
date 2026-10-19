'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageIcon, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SiteHeader } from '@/components/site-header';
import { popupOfferApi } from '@/lib/api';
import { popupOfferResource } from '@/lib/resources';

export default function PopupOfferPage() {
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(30);
  const [maxShowsPerDay, setMaxShowsPerDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    popupOfferApi
      .get()
      .then(({ data }) => {
        if (data.success) {
          setImage(data.popupOffer.image);
          setEnabled(data.popupOffer.enabled);
          setDelaySeconds(data.popupOffer.delaySeconds);
          setMaxShowsPerDay(data.popupOffer.maxShowsPerDay);
        }
      })
      .catch(() => toast.error('Failed to load popup offer'))
      .finally(() => setLoading(false));
  }, []);

  const preview = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    return removeImage ? '' : image;
  }, [image, imageFile, removeImage]);

  async function save() {
    setSaving(true);
    try {
      const data = new FormData();
      data.append('enabled', String(enabled));
      data.append('delaySeconds', String(delaySeconds));
      data.append('maxShowsPerDay', String(maxShowsPerDay));
      if (imageFile) data.append('image', imageFile);
      if (removeImage && !imageFile) data.append('removeImage', 'true');

      const response = await popupOfferApi.update(data);
      if (response.data.success) {
        // Keep the shared storefront cache in sync with the new offer.
        popupOfferResource.set(response.data.popupOffer);
        setImage(response.data.popupOffer.image);
        setEnabled(response.data.popupOffer.enabled);
        setDelaySeconds(response.data.popupOffer.delaySeconds);
        setMaxShowsPerDay(response.data.popupOffer.maxShowsPerDay);
        setImageFile(null);
        setRemoveImage(false);
        toast.success('Popup offer saved');
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to save popup offer'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Popup Offer</h1>
          <p className="text-sm text-muted-foreground">
            Upload the promotional image shown to store visitors.
          </p>
        </div>

        <Card className="max-w-3xl">
          <CardContent className="space-y-6 p-6">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading popup
                offer...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-md border p-4">
                  <div>
                    <Label htmlFor="popup-enabled">Show popup offer</Label>
                    <p className="text-sm text-muted-foreground">
                      Visitors see it after the configured delay and frequency.
                    </p>
                  </div>
                  <Switch
                    id="popup-enabled"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="popup-delay">Show after</Label>
                    <select
                      id="popup-delay"
                      value={delaySeconds}
                      onChange={(event) =>
                        setDelaySeconds(Number(event.target.value))
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={120}>2 minutes</option>
                      <option value={180}>3 minutes</option>
                      <option value={240}>4 minutes</option>
                      <option value={300}>5 minutes</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="popup-frequency">
                      Maximum displays per day
                    </Label>
                    <select
                      id="popup-frequency"
                      value={maxShowsPerDay}
                      onChange={(event) =>
                        setMaxShowsPerDay(Number(event.target.value))
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value={1}>1 time</option>
                      <option value={2}>2 times</option>
                      <option value={3}>3 times</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Offer image</Label>
                  <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-md border bg-muted/30 p-2">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Popup offer preview"
                        className="max-h-112 max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-sm">No popup image uploaded</span>
                      </div>
                    )}
                  </div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(event) => {
                      setImageFile(event.target.files?.[0] || null);
                      setRemoveImage(false);
                    }}
                  />
                  {image && !imageFile && !removeImage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setRemoveImage(true)}
                    >
                      <Trash2 className="h-4 w-4" /> Remove current image
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, GIF, or WebP up to 5 MB.
                  </p>
                </div>

                <div className="flex justify-end border-t pt-4">
                  <Button onClick={save} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save popup offer
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
