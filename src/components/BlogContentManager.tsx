import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Edit2, Trash2, Eye, EyeOff, Upload, X, Save, Image as ImageIcon, Code, Bold, Italic, Link as LinkIcon, List, ListOrdered, Heading1, Heading2 } from 'lucide-react';
import { blogAPI, SiteContent, CreateContentData, UpdateContentData } from '../lib/blogApi';

interface BlogContentManagerProps {
  contentType: 'blog_post' | 'about_section';
  title: string;
  description: string;
}

const BlogContentManager: React.FC<BlogContentManagerProps> = ({ contentType, title, description }) => {
  const [content, setContent] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<SiteContent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content_body: '',
    excerpt: '',
    meta_description: '',
    is_published: false,
    display_order: 0,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [htmlMode, setHtmlMode] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadContent();
  }, [contentType]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const data = contentType === 'blog_post'
        ? await blogAPI.getAllBlogPosts()
        : await blogAPI.getAllAboutSections();
      setContent(data);
    } catch (error) {
      console.error('Error loading content:', error);
      showMessage('Error loading content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const insertHtmlTag = (tag: string, prompt?: string) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content_body.substring(start, end);
    let insertText = '';

    if (tag === 'link') {
      const url = window.prompt(prompt || 'Enter URL:', 'https://');
      if (!url) return;
      insertText = `<a href="${url}">${selectedText || 'link text'}</a>`;
    } else if (tag === 'h1') {
      insertText = `<h1>${selectedText || 'Heading 1'}</h1>`;
    } else if (tag === 'h2') {
      insertText = `<h2>${selectedText || 'Heading 2'}</h2>`;
    } else if (tag === 'ul') {
      insertText = `<ul>\n  <li>${selectedText || 'List item'}</li>\n</ul>`;
    } else if (tag === 'ol') {
      insertText = `<ol>\n  <li>${selectedText || 'List item'}</li>\n</ol>`;
    } else {
      insertText = `<${tag}>${selectedText || 'text'}</${tag}>`;
    }

    const newContent = formData.content_body.substring(0, start) + insertText + formData.content_body.substring(end);
    setFormData({ ...formData, content_body: newContent });

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + insertText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleEdit = (item: SiteContent) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content_body: item.content_body,
      excerpt: item.excerpt || '',
      meta_description: item.meta_description || '',
      is_published: item.is_published,
      display_order: item.display_order,
    });
    setImagePreview(item.featured_image_url);
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      content_body: '',
      excerpt: '',
      meta_description: '',
      is_published: false,
      display_order: content.length,
    });
    setSelectedImage(null);
    setImagePreview(null);
    setShowEditor(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showMessage('Invalid file type. Please upload PNG or JPG files only.', 'error');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showMessage('File size must be less than 5MB.', 'error');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showMessage('Title is required', 'error');
      return;
    }

    if (!formData.content_body.trim()) {
      showMessage('Content is required', 'error');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = editingItem?.featured_image_url || null;

      if (selectedImage) {
        imageUrl = await blogAPI.uploadImage(selectedImage, contentType);
      }

      const dataToSave: CreateContentData | UpdateContentData = {
        ...formData,
        featured_image_url: imageUrl || undefined,
      };

      if (editingItem) {
        await blogAPI.updateContent(editingItem.id, dataToSave);
        showMessage(`${contentType === 'blog_post' ? 'Blog post' : 'About section'} updated successfully`, 'success');
      } else {
        await blogAPI.createContent({
          ...dataToSave,
          content_type: contentType,
        } as CreateContentData);
        showMessage(`${contentType === 'blog_post' ? 'Blog post' : 'About section'} created successfully`, 'success');
      }

      setShowEditor(false);
      setEditingItem(null);
      setSelectedImage(null);
      setImagePreview(null);
      loadContent();
    } catch (error) {
      console.error('Error saving content:', error);
      showMessage('Error saving content', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      await blogAPI.deleteContent(id);
      showMessage(`${contentType === 'blog_post' ? 'Blog post' : 'About section'} deleted successfully`, 'success');
      loadContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      showMessage('Error deleting content', 'error');
    }
  };

  const togglePublish = async (item: SiteContent) => {
    try {
      await blogAPI.updateContent(item.id, { is_published: !item.is_published });
      showMessage(`${contentType === 'blog_post' ? 'Blog post' : 'About section'} ${!item.is_published ? 'published' : 'unpublished'}`, 'success');
      loadContent();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      showMessage('Error updating publish status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
            <FileText size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="text-slate-600">{description}</p>
          </div>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${messageType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {showEditor ? (
        <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingItem ? 'Edit' : 'New'} {contentType === 'blog_post' ? 'Blog Post' : 'About Section'}
            </h3>
            <button
              onClick={() => {
                setShowEditor(false);
                setEditingItem(null);
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter title"
              />
            </div>

            {contentType === 'blog_post' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Excerpt
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                  rows={2}
                  placeholder="Brief summary (shown in blog list)"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Content * {htmlMode && <span className="text-blue-600 text-xs ml-2">(HTML Source Mode)</span>}
                </label>
                <button
                  type="button"
                  onClick={() => setHtmlMode(!htmlMode)}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg transition-colors ${
                    htmlMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Toggle HTML source view"
                >
                  <Code size={14} />
                  {htmlMode ? 'Visual' : 'HTML'}
                </button>
              </div>

              {!htmlMode && (
                <div className="flex flex-wrap gap-1 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-t-lg">
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('strong')}
                    className="p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-slate-300"
                    title="Bold"
                  >
                    <Bold size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('em')}
                    className="p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-slate-300"
                    title="Italic"
                  >
                    <Italic size={16} />
                  </button>
                  <div className="w-px bg-slate-300 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('h1')}
                    className="p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-slate-300"
                    title="Heading 1"
                  >
                    <Heading1 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('h2')}
                    className="p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-slate-300"
                    title="Heading 2"
                  >
                    <Heading2 size={16} />
                  </button>
                  <div className="w-px bg-slate-300 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('ul')}
                    className="p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-slate-300"
                    title="Bullet List"
                  >
                    <List size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('ol')}
                    className="p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-slate-300"
                    title="Numbered List"
                  >
                    <ListOrdered size={16} />
                  </button>
                  <div className="w-px bg-slate-300 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => insertHtmlTag('link', 'Enter the URL (e.g., /groups or https://example.com):')}
                    className="p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-slate-300 text-blue-600"
                    title="Insert Link"
                  >
                    <LinkIcon size={16} />
                  </button>
                </div>
              )}

              <textarea
                ref={contentTextareaRef}
                value={formData.content_body}
                onChange={(e) => setFormData({ ...formData, content_body: e.target.value })}
                className={`w-full p-3 border border-slate-300 focus:outline-none focus:border-blue-500 resize-none font-mono text-sm ${
                  htmlMode ? 'rounded-lg' : 'rounded-b-lg'
                }`}
                rows={15}
                placeholder={htmlMode
                  ? 'Enter HTML here...\n\nExample:\n<p>Not sure where to start? Simply <a href="/groups">join</a> an existing group or <a href="/how-it-works">learn more</a>.</p>'
                  : 'Enter your content here...\n\nTip: Select text and use the toolbar buttons above to format it, or click the HTML button to edit raw HTML.'
                }
              />

              {htmlMode && (
                <p className="text-xs text-slate-500 mt-2">
                  Tip: You can paste or write HTML directly. Common tags: &lt;p&gt;, &lt;a href="/path"&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;h1&gt;, &lt;ul&gt;, &lt;li&gt;
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Featured Image
              </label>
              <div className="flex items-center gap-4">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                )}
                <label className="cursor-pointer">
                  <div className="px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 transition-colors flex items-center gap-2">
                    <Upload size={16} />
                    <span className="text-sm">{imagePreview ? 'Change Image' : 'Upload Image'}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border border-slate-300 rounded-lg">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_published" className="text-sm font-medium text-slate-700">
                Publish immediately
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={uploading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowEditor(false);
                  setEditingItem(null);
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {content.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              No {contentType === 'blog_post' ? 'blog posts' : 'about sections'} yet. Click "Add New" to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {content.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {item.featured_image_url && (
                      <img
                        src={item.featured_image_url}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{item.title}</h4>
                      {item.excerpt && (
                        <p className="text-sm text-slate-600 line-clamp-1">{item.excerpt}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${item.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {item.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(item.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePublish(item)}
                      className="p-2 text-slate-600 hover:text-blue-600 transition-colors"
                      title={item.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {item.is_published ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-slate-600 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-600 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogContentManager;
