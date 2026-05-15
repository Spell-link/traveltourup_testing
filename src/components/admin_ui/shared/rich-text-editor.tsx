"use client";

import React, { forwardRef, useImperativeHandle, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import CodeBlock from '@tiptap/extension-code-block';
import History from '@tiptap/extension-history';
import { Link } from '@tiptap/extension-link';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import type { Editor } from '@tiptap/core';
import { cn } from '@/lib/utils';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Quote,
  Code,
  Undo,
  Redo,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/admin_ui/ui/button';
import { Separator } from '@/components/admin_ui/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/admin_ui/ui/dropdown-menu';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  height?: string | number;
  columns?: number;
  error?: boolean;
  id?: string;
  showToolbar?: boolean;
}

export interface RichTextEditorRef {
  focus: () => void;
  blur: () => void;
  getEditor: () => any;
}

/**
 * Heading level configuration for dropdown selector
 */
const HEADING_LEVELS = [
  { level: 1, label: 'Heading 1' },
  { level: 2, label: 'Heading 2' },
  { level: 3, label: 'Heading 3' },
  { level: 4, label: 'Heading 4' },
  { level: 5, label: 'Heading 5' },
  { level: 6, label: 'Heading 6' },
] as const;

/**
 * Get current heading level for display
 */
function getCurrentHeadingLabel(editor: Editor | null): string {
  if (!editor) return 'Text';

  for (const { level, label } of HEADING_LEVELS) {
    if (editor.isActive('heading', { level })) {
      return label;
    }
  }

  if (editor.isActive('paragraph')) {
    return 'Text';
  }

  return 'Text';
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({
    value = '',
    onChange,
    placeholder = 'Enter text...',
    disabled = false,
    readOnly = false,
    className,
    height = '150px',
    columns = 2,
    error = false,
    id,
    showToolbar = true,
    ...props
  }, ref) => {
    const editor = useEditor({
      extensions: [
        // Core extensions
        Document,
        Paragraph,
        Text,

        // Formatting extensions
        Bold,
        Italic,
        Strike,

        // Structure extensions
        Heading.configure({
          levels: [1, 2, 3, 4, 5, 6],
        }),
        Blockquote,
        CodeBlock,

        // List extensions with explicit configuration
        ListItem,
        BulletList.configure({
          HTMLAttributes: {
            class: 'bullet-list',
          },
        }),
        OrderedList.configure({
          HTMLAttributes: {
            class: 'ordered-list',
          },
        }),

        // Additional extensions
        Link.configure({
          openOnClick: false,
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Color,
        TextStyle,
        History.configure({
          depth: 10,
        }),
      ],
      content: value || '',
      editable: !disabled && !readOnly,
      immediatelyRender: false,
      onUpdate: ({ editor }: { editor: Editor }) => {
        const html = editor.getHTML();
        const isEmpty = editor.getText().trim() === '';
        onChange?.(isEmpty ? '' : html);
      },
    });

    // Update editor content when value prop changes
    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        editor.commands.setContent(value || '');
      }
    }, [editor, value]);

    // Update editable state when disabled/readOnly changes
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled && !readOnly);
      }
    }, [editor, disabled, readOnly]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => {
        editor?.commands.focus();
      },
      blur: () => {
        editor?.commands.blur();
      },
      getEditor: () => {
        return editor;
      }
    }), [editor]);

    const addLink = useCallback(() => {
      const previousUrl = editor?.getAttributes('link').href;
      const url = window.prompt('URL', previousUrl);

      if (url === null) {
        return;
      }

      if (url === '') {
        editor?.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }

      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const toggleBulletList = useCallback(() => {
      if (!editor) return;
      editor.chain().focus().toggleBulletList().run();
    }, [editor]);

    const toggleOrderedList = useCallback(() => {
      if (!editor) return;
      editor.chain().focus().toggleOrderedList().run();
    }, [editor]);

    if (!editor) {
      return (
        <div className="h-32 bg-muted animate-pulse rounded-md flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading editor...</div>
        </div>
      );
    }

    const editorStyles = {
      '--editor-height': typeof height === 'number' ? `${height}px` : height,
    } as React.CSSProperties;

    return (
      <div
        className={cn(
          'rich-text-editor rounded-md border border-input bg-background text-foreground',
          {
            'border-destructive': error,
            'opacity-50': disabled,
          },
          className
        )}
        style={editorStyles}
      >
        {showToolbar && (
          <div className="flex flex-wrap items-center gap-1 border-b border-input bg-background p-2">
            {/* Heading Level Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 px-2 gap-1 text-xs font-medium',
                    (editor.isActive('heading') || editor.isActive('paragraph')) && 'bg-accent'
                  )}
                  disabled={disabled}
                  title="Heading level"
                >
                  <span className="max-w-[60px] truncate">{getCurrentHeadingLabel(editor)}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {/* Paragraph option */}
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().setParagraph().run()}
                  className={editor.isActive('paragraph') ? 'bg-accent' : ''}
                >
                  <span className="text-xs">Normal Text</span>
                </DropdownMenuItem>

                {/* Heading options */}
                {HEADING_LEVELS.map(({ level, label }) => (
                  <DropdownMenuItem
                    key={level}
                    onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                    className={
                      editor.isActive('heading', { level })
                        ? 'bg-accent'
                        : ''
                    }
                  >
                    <span className="text-xs font-semibold">
                      {label} (H{level})
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Text Formatting - Bold */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive('bold') && 'bg-accent'
              )}
              disabled={disabled}
              title="Bold"
            >
              <BoldIcon className="h-4 w-4" />
            </Button>

            {/* Text Formatting - Italic */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive('italic') && 'bg-accent'
              )}
              disabled={disabled}
              title="Italic"
            >
              <ItalicIcon className="h-4 w-4" />
            </Button>

            {/* Text Formatting - Strikethrough */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive('strike') && 'bg-accent'
              )}
              disabled={disabled}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Lists - Bullet */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleBulletList}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive('bulletList') && 'bg-accent'
              )}
              disabled={disabled}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>

            {/* Lists - Ordered */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleOrderedList}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive('orderedList') && 'bg-accent'
              )}
              disabled={disabled}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Alignment - Left */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive({ textAlign: 'left' }) && 'bg-accent'
              )}
              disabled={disabled}
              title="Align left"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>

            {/* Alignment - Center */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive({ textAlign: 'center' }) && 'bg-accent'
              )}
              disabled={disabled}
              title="Align center"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>

            {/* Alignment - Right */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive({ textAlign: 'right' }) && 'bg-accent'
              )}
              disabled={disabled}
              title="Align right"
            >
              <AlignRight className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Blockquote */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive('blockquote') && 'bg-accent'
              )}
              disabled={disabled}
              title="Blockquote"
            >
              <Quote className="h-4 w-4" />
            </Button>

            {/* Code Block */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive('codeBlock') && 'bg-accent'
              )}
              disabled={disabled}
              title="Code block"
            >
              <Code className="h-4 w-4" />
            </Button>

            {/* Link */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addLink}
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive('link') && 'bg-accent'
              )}
              disabled={disabled}
              title="Add link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Undo */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              className="h-8 w-8 p-0"
              disabled={disabled || !editor.can().chain().focus().undo().run()}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>

            {/* Redo */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              className="h-8 w-8 p-0"
              disabled={disabled || !editor.can().chain().focus().redo().run()}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className={`relative max-h-[${columns * 50}px] overflow-y-auto`}>
          <EditorContent
            editor={editor}
            id={id}
            className={cn(
              'prose prose-sm max-w-none p-3 focus-within:outline-none',
              '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[var(--editor-height)]',
              '[&_.ProseMirror]:text-foreground [&_.ProseMirror]:bg-background',
              '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
              '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
              '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
              '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
              '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
              // Heading styling (H1-H6) - Professional hierarchy
              '[&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:leading-tight [&_.ProseMirror_h1]:text-foreground',
              '[&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:leading-tight [&_.ProseMirror_h2]:text-foreground',
              '[&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-3 [&_.ProseMirror_h3]:leading-tight [&_.ProseMirror_h3]:text-foreground',
              '[&_.ProseMirror_h4]:text-lg [&_.ProseMirror_h4]:font-semibold [&_.ProseMirror_h4]:mt-3 [&_.ProseMirror_h4]:mb-2 [&_.ProseMirror_h4]:leading-tight [&_.ProseMirror_h4]:text-foreground',
              '[&_.ProseMirror_h5]:text-base [&_.ProseMirror_h5]:font-semibold [&_.ProseMirror_h5]:mt-3 [&_.ProseMirror_h5]:mb-2 [&_.ProseMirror_h5]:leading-tight [&_.ProseMirror_h5]:text-foreground',
              '[&_.ProseMirror_h6]:text-sm [&_.ProseMirror_h6]:font-semibold [&_.ProseMirror_h6]:mt-2 [&_.ProseMirror_h6]:mb-2 [&_.ProseMirror_h6]:text-muted-foreground [&_.ProseMirror_h6]:leading-tight',
              // Paragraph styling
              '[&_.ProseMirror_p]:my-2 [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_p]:text-foreground',
              // List styling
              '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ul]:my-2',
              '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_ol]:my-2',
              '[&_.ProseMirror_li]:my-1 [&_.ProseMirror_li]:text-foreground',
              '[&_.ProseMirror_ul_ul]:list-[circle] [&_.ProseMirror_ul_ul_ul]:list-[square]',
              // Blockquote styling
              '[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:ml-0 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-muted-foreground',
              // Code styling
              '[&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:overflow-x-auto',
              '[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-sm',
              readOnly && 'cursor-default',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            data-placeholder={placeholder}
            {...props}
          />
        </div>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
