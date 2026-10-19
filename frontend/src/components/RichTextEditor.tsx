'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Minus,
  Palette,
  Quote,
  Redo,
  RemoveFormatting,
  SquareCode,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { uploadApi } from '@/lib/api';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const FONT_FAMILIES = [
  { value: '', label: 'Default font' },
  { value: 'Inter, ui-sans-serif, system-ui, sans-serif', label: 'Inter' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, Geneva, sans-serif', label: 'Tahoma' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Times New Roman', Times, serif", label: 'Times New Roman' },
  { value: "'Courier New', Courier, monospace", label: 'Courier New' },
];

const FONT_SIZES = [
  { value: '', label: 'Default' },
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
  { value: '36px', label: '36px' },
  { value: '48px', label: '48px' },
];

const BLOCK_TYPES = [
  { value: 'paragraph', label: 'Normal text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
];

const DEFAULT_COLOR = '#111827';

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'h-8 w-8 rounded-md',
        active && 'bg-primary text-primary-foreground hover:bg-primary/90',
        className
      )}
    >
      {children}
    </Button>
  );
}

function ColorControl({
  label,
  icon,
  value,
  fallback,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      title={label}
      aria-label={label}
      className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
    >
      {icon}
      <span
        className="absolute bottom-0.5 h-1 w-4 rounded-full border border-border/60"
        style={{ background: value || fallback }}
      />
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write the content shown on the home page…',
}: RichTextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkNewTab, setLinkNewTab] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: false,
        underline: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow' },
      }),
      Underline,
      TextStyleKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'rte-image' },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
    ],
    content: value || '',
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: 'rte-content min-h-[240px] px-3 py-2 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. when an edit form loads data).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return null;
      const textStyle = ed.getAttributes('textStyle');
      const textAlign =
        (['left', 'center', 'right', 'justify'] as const).find((a) =>
          ed.isActive({ textAlign: a })
        ) ?? 'left';
      const block =
        BLOCK_TYPES.slice(1).find((b) =>
          ed.isActive('heading', { level: Number(b.value.slice(1)) })
        )?.value ?? 'paragraph';
      return {
        block,
        textAlign,
        fontFamily: (textStyle.fontFamily as string) || '',
        fontSize: (textStyle.fontSize as string) || '',
        color: (textStyle.color as string) || '',
        backgroundColor: (textStyle.backgroundColor as string) || '',
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        underline: ed.isActive('underline'),
        strike: ed.isActive('strike'),
        code: ed.isActive('code'),
        bulletList: ed.isActive('bulletList'),
        orderedList: ed.isActive('orderedList'),
        taskList: ed.isActive('taskList'),
        blockquote: ed.isActive('blockquote'),
        codeBlock: ed.isActive('codeBlock'),
        link: ed.isActive('link'),
        canUndo: ed.can().undo(),
        canRedo: ed.can().redo(),
        characters: (ed.storage.characterCount as { characters: () => number })
          ?.characters?.() ?? 0,
      };
    },
  });

  if (!editor || !state) {
    return (
      <div className="min-h-50 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  const setBlock = (next: string) => {
    const chain = editor.chain().focus();
    if (next === 'paragraph') {
      chain.setParagraph().run();
    } else {
      const level = Number(next.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;
      chain.toggleHeading({ level }).run();
    }
  };

  const openLinkDialog = () => {
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, ' ');
    const existing = editor.getAttributes('link');
    setLinkText(selected || '');
    setLinkUrl((existing.href as string) || '');
    setLinkNewTab(existing.target === '_blank');
    setLinkOpen(true);
  };

  const applyLink = () => {
    const href = linkUrl.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const target = linkNewTab ? '_blank' : null;
    if (editor.state.selection.empty) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: linkText.trim() || href,
          marks: [{ type: 'link', attrs: { href, target } }],
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href, target })
        .run();
    }
    setLinkOpen(false);
  };

  const bubbleButton = (
    label: string,
    active: boolean,
    run: () => void,
    icon: React.ReactNode
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground',
        active && 'bg-primary text-primary-foreground hover:bg-primary/90'
      )}
    >
      {icon}
    </button>
  );

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploading(true);
    try {
      const { data } = await uploadApi.image(file);
      if (data?.success && data.url) {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      } else {
        toast.error('Image upload failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-0.5 rounded-md border bg-muted/30 p-1">
        <ToolbarButton
          label="Undo"
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        <NativeSelect
          size="sm"
          aria-label="Text style"
          value={state.block}
          onChange={(e) => setBlock(e.target.value)}
          className="w-[8.5rem]"
        >
          {BLOCK_TYPES.map((b) => (
            <NativeSelectOption key={b.value} value={b.value}>
              {b.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        <NativeSelect
          size="sm"
          aria-label="Font family"
          value={state.fontFamily}
          onChange={(e) => {
            const v = e.target.value;
            const chain = editor.chain().focus();
            if (v) chain.setFontFamily(v).run();
            else chain.unsetFontFamily().run();
          }}
          className="w-[8.5rem]"
        >
          {FONT_FAMILIES.map((f) => (
            <NativeSelectOption key={f.label} value={f.value}>
              {f.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        <NativeSelect
          size="sm"
          aria-label="Font size"
          value={state.fontSize}
          onChange={(e) => {
            const v = e.target.value;
            const chain = editor.chain().focus();
            if (v) chain.setFontSize(v).run();
            else chain.unsetFontSize().run();
          }}
          className="w-[5rem]"
        >
          {FONT_SIZES.map((f) => (
            <NativeSelectOption key={f.label} value={f.value}>
              {f.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        <ToolbarButton
          label="Bold"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={state.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={state.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <ColorControl
          label="Text color"
          icon={<Palette className="h-4 w-4" />}
          value={state.color}
          fallback={DEFAULT_COLOR}
          onChange={(v) => editor.chain().focus().setColor(v).run()}
        />
        <ColorControl
          label="Highlight color"
          icon={<Highlighter className="h-4 w-4" />}
          value={state.backgroundColor}
          fallback="#fef08a"
          onChange={(v) => editor.chain().focus().setBackgroundColor(v).run()}
        />

        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        <ToolbarButton
          label="Bullet list"
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Ordered list"
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Task list"
          active={state.taskList}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListChecks className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Blockquote"
          active={state.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          active={state.codeBlock}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <SquareCode className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        <ToolbarButton
          label="Align left"
          active={state.textAlign === 'left'}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Align center"
          active={state.textAlign === 'center'}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Align right"
          active={state.textAlign === 'right'}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Justify"
          active={state.textAlign === 'justify'}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        <ToolbarButton
          label="Insert link"
          active={state.link}
          onClick={openLinkDialog}
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Remove link"
          disabled={!state.link}
          onClick={() =>
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
          }
        >
          <Unlink className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Insert image"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </ToolbarButton>
        <ToolbarButton
          label="Clear formatting"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <BubbleMenu
        editor={editor}
        options={{ placement: 'top', offset: 8 }}
        className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md"
      >
        {bubbleButton(
          'Bold',
          state.bold,
          () => editor.chain().focus().toggleBold().run(),
          <Bold className="h-3.5 w-3.5" />
        )}
        {bubbleButton(
          'Italic',
          state.italic,
          () => editor.chain().focus().toggleItalic().run(),
          <Italic className="h-3.5 w-3.5" />
        )}
        {bubbleButton(
          'Underline',
          state.underline,
          () => editor.chain().focus().toggleUnderline().run(),
          <UnderlineIcon className="h-3.5 w-3.5" />
        )}
        {bubbleButton(
          'Strikethrough',
          state.strike,
          () => editor.chain().focus().toggleStrike().run(),
          <Strikethrough className="h-3.5 w-3.5" />
        )}
        {bubbleButton(
          'Insert link',
          state.link,
          openLinkDialog,
          <LinkIcon className="h-3.5 w-3.5" />
        )}
      </BubbleMenu>

      <EditorContent
        editor={editor}
        className="rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring"
      />

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Select text to format it, or use the toolbar for headings, fonts and
          colors.
        </span>
        <span className="shrink-0">
          {state.characters} character{state.characters === 1 ? '' : 's'}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
            <DialogDescription>
              Add a URL and optional display text. Leave the URL empty to remove
              the link.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="rte-link-text">Text</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Link text (optional)"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  }
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={linkNewTab}
                onChange={(e) => setLinkNewTab(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Open in a new tab
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={applyLink}>
              Apply link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RichTextEditor;

