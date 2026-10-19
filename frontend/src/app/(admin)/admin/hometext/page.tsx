'use client';

import HomeRichTextEditor from '@/components/HomeRichTextEditor';
import { homeContentApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const Page = () => {
  const [savedContent, setSavedContent] = useState('');
  const [savedEnabled, setSavedEnabled] = useState(true);

  const handleSave = async (content: string, enabled: boolean) => {
    try {
      const response = await homeContentApi.update({ content, enabled });
      setSavedContent(response.data.homeContent.content);
      setSavedEnabled(response.data.homeContent.enabled);

      toast.success('Home page content saved successfully!');
    } catch (error) {
      toast.error('Failed to save content');
      console.error('Save error:', error);
    }
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await homeContentApi.get();
        setSavedContent(response.data.homeContent.content);
        setSavedEnabled(response.data.homeContent.enabled);
      } catch (error) {
        toast.error('Failed to load home page content');
        console.error('Load error:', error);
      }
    };

    void loadContent();
  }, []);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Home Page Content Management</h1>
      <HomeRichTextEditor
        initialContent={savedContent}
        initialEnabled={savedEnabled}
        onSave={handleSave}
      />
    </div>
  );
};

export default Page;
