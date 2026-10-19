'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { RichTextEditor } from '@/components/RichTextEditor';
import { offerApi, type Offer } from '@/lib/api';
import { toast } from 'sonner';

function toDateInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

interface OfferFormProps {
  mode: 'create' | 'edit';
  initial?: Offer;
}

export function OfferForm({ mode, initial }: OfferFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [active, setActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState('');
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '');
      setShortDescription(initial.shortDescription || '');
      setFullDescription(initial.fullDescription || '');
      setStartDate(toDateInput(initial.startDate));
      setEndDate(toDateInput(initial.endDate));
      setActive(initial.active ?? true);
      setExistingImage(initial.image || '');
    }
  }, [initial]);

  const previewSrc = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    if (removeImage) return null;
    return existingImage || null;
  }, [imageFile, removeImage, existingImage]);

  useEffect(() => {
    return () => {
      if (imageFile) URL.revokeObjectURL(URL.createObjectURL(imageFile));
    };
  }, [imageFile]);

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error('Offer title is required');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('shortDescription', shortDescription);
      fd.append('fullDescription', fullDescription);
      fd.append('startDate', startDate);
      fd.append('endDate', endDate);
      fd.append('active', String(active));
      if (imageFile) fd.append('image', imageFile);
      else if (removeImage) fd.append('removeImage', 'true');

      if (mode === 'create') {
        const { data } = await offerApi.create(fd);
        if (data.success) {
          toast.success(`Offer "${title}" created`);
          router.push('/admin/offers');
        }
      } else {
        const { data } = await offerApi.update(initial!._id, fd);
        if (data.success) {
          toast.success(`Offer "${title}" updated`);
          router.push('/admin/offers');
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save offer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer Tech Splash" />
        </div>
        <div className="space-y-1.5">
          <Label>Active</Label>
          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch checked={active} onCheckedChange={setActive} id="offer-active" />
            <span className="text-sm text-muted-foreground">
              {active ? 'Visible on the store' : 'Hidden from the store'}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>End date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Short description</Label>
        <Textarea
          rows={2}
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="One-line summary shown on the offers listing"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Full description</Label>
        <RichTextEditor value={fullDescription} onChange={setFullDescription} />
      </div>

      <div className="space-y-2">
        <Label>Offer image</Label>
        <div className="flex items-start gap-4">
          <div className="flex h-40 w-64 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
            {previewSrc ? (
              <img src={previewSrc} alt="Offer preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
                setRemoveImage(false);
              }}
            />
            {existingImage && !imageFile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  setRemoveImage(true);
                  setImageFile(null);
                }}
              >
                <Trash2 className="h-4 w-4" /> Remove current image
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Upload a banner image (JPG, PNG, WebP). Stored on Cloudinary.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> {mode === 'create' ? 'Create offer' : 'Save changes'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default OfferForm;
