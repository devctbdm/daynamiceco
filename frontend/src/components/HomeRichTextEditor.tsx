'use client';

import { useState, useEffect } from 'react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

interface HomeRichTextEditorProps {
  initialContent?: string;
  initialEnabled?: boolean;
  onSave?: (content: string, enabled: boolean) => void;
}

export default function HomeRichTextEditor({
  initialContent = '',
  initialEnabled = true,
  onSave,
}: HomeRichTextEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);

  // Sync content when initialContent changes (after save)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(content, enabled);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Home Page Content</CardTitle>
        <CardDescription>
          Write and manage the content displayed on the home page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="home-content-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <Label htmlFor="home-content-enabled" className="cursor-pointer">
            {enabled ? 'Content Enabled' : 'Content Disabled'}
          </Label>
        </div>

        <div className={enabled ? '' : 'opacity-50 pointer-events-none'}>
          <RichTextEditor value={content} onChange={setContent} />
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}
