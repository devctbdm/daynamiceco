'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BellRing, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  notificationApi,
  type AdminNotificationCategory,
  type NotificationCampaign,
  type NotificationCampaignInput,
} from '@/lib/api';

const PAGE_SIZE = 10;
const EMPTY_FORM: NotificationCampaignInput = {
  title: '',
  description: '',
  category: 'system',
  link: '',
};

const categories: AdminNotificationCategory[] = [
  'system',
  'order',
  'delivery',
  'payment',
  'rider',
];

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }
  return fallback;
}

export default function NotificationCampaignManager() {
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationCampaign | null>(null);
  const [form, setForm] = useState<NotificationCampaignInput>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<NotificationCampaign | null>(
    null
  );

  const loadCampaigns = useCallback(async (requestedPage: number) => {
    setLoading(true);
    try {
      const { data } = await notificationApi.campaigns({
        page: requestedPage,
        limit: PAGE_SIZE,
      });
      setCampaigns(data.campaigns);
      setTotal(data.total);
      setPages(data.pages);
      setPage(data.page);
    } catch {
      toast.error('Failed to load customer announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns(1);
  }, [loadCampaigns]);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const startEdit = (campaign: NotificationCampaign) => {
    setEditing(campaign);
    setForm({
      title: campaign.title,
      description: campaign.description,
      category: campaign.category,
      link: campaign.link,
    });
    setDialogOpen(true);
  };

  const saveCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await notificationApi.updateCampaign(editing._id, form);
        toast.success('Announcement updated');
      } else {
        await notificationApi.createCampaign(form);
        toast.success('Announcement sent to active customers');
      }
      setDialogOpen(false);
      await loadCampaigns(editing ? page : 1);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save announcement'));
    } finally {
      setSaving(false);
    }
  };

  const removeCampaign = async () => {
    if (!deleteTarget) return;
    try {
      await notificationApi.deleteCampaign(deleteTarget._id);
      toast.success('Announcement and its inbox items deleted');
      const nextPage = campaigns.length === 1 && page > 1 ? page - 1 : page;
      setDeleteTarget(null);
      await loadCampaigns(nextPage);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete announcement'));
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              Customer announcements
            </CardTitle>
            <CardDescription className="mt-1">
              Publish inbox notifications to all active customer accounts.
              {total > 0 &&
                ` ${total} announcement${total === 1 ? '' : 's'} total.`}
            </CardDescription>
          </div>
          <Button onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New announcement
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading announcements…
            </p>
          ) : campaigns.length === 0 ? (
            <div className="rounded-lg border border-dashed px-6 py-10 text-center">
              <BellRing className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-medium">No customer announcements yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create an announcement to deliver it to active customers’
                inboxes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <article
                  key={campaign._id}
                  className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{campaign.title}</h3>
                      <Badge variant="outline" className="capitalize">
                        {campaign.category}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {campaign.description}
                    </p>
                    {campaign.link && (
                      <p className="mt-1 truncate text-xs text-primary">
                        {campaign.link}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{campaign.recipientCount} delivered</span>
                      <span>{campaign.readCount} read</span>
                      <span>
                        {new Date(campaign.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(campaign)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label={`Delete ${campaign.title}`}
                      onClick={() => setDeleteTarget(campaign)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => void loadCampaigns(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pages || loading}
                  onClick={() => void loadCampaigns(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={saveCampaign} className="space-y-5">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit announcement' : 'Create announcement'}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Changes will update this announcement in customer inboxes.'
                  : 'This announcement will be delivered to every active customer account.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="campaign-title">Title</Label>
              <Input
                id="campaign-title"
                required
                maxLength={120}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Holiday delivery schedule"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-description">Message</Label>
              <Textarea
                id="campaign-description"
                required
                maxLength={2000}
                rows={5}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Write the message customers will see in their account."
              />
              <p className="text-right text-xs text-muted-foreground">
                {form.description.length}/2000
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-category">Category</Label>
                <select
                  id="campaign-category"
                  className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value as AdminNotificationCategory,
                    }))
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category[0].toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-link">Optional link</Label>
                <Input
                  id="campaign-link"
                  type="text"
                  maxLength={2048}
                  value={form.link}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      link: event.target.value,
                    }))
                  }
                  placeholder="/shop or https://example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Send className="mr-2 h-4 w-4" />
                {saving
                  ? 'Saving…'
                  : editing
                    ? 'Save changes'
                    : 'Send announcement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also remove the announcement from every customer inbox.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void removeCampaign();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete announcement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
