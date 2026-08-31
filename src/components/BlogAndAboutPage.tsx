import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, ChevronRight } from 'lucide-react';
import { blogAPI, SiteContent } from '../lib/blogApi';

interface BlogAndAboutPageProps {
  onBack: () => void;
  siteLogoUrl: string | null;
}

const BlogAndAboutPage: React.FC<BlogAndAboutPageProps> = ({ onBack, siteLogoUrl }) => {
  const [activeTab, setActiveTab] = useState<'blog' | 'about'>('blog');
  const [blogPosts, setBlogPosts] = useState<SiteContent[]>([]);
  const [aboutSections, setAboutSections] = useState<SiteContent[]>([]);
  const [selectedPost, setSelectedPost] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const [posts, sections] = await Promise.all([
        blogAPI.getPublishedBlogPosts(),
        blogAPI.getPublishedAboutSections(),
      ]);
      setBlogPosts(posts);
      setAboutSections(sections);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handlePostClick = (post: SiteContent) => {
    setSelectedPost(post);
  };

  const handleBackToList = () => {
    setSelectedPost(null);
  };

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back to Blog</span>
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <article className="bg-white rounded-xl shadow-sm p-8">
            {selectedPost.featured_image_url && (
              <img
                src={selectedPost.featured_image_url}
                alt={selectedPost.title}
                className="w-full h-96 object-cover rounded-lg mb-8"
              />
            )}

            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              {selectedPost.title}
            </h1>

            <div className="flex items-center gap-6 text-sm text-slate-600 mb-8 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{formatDate(selectedPost.published_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={16} />
                <span>EquityTake Team</span>
              </div>
            </div>

            <div className="prose prose-slate max-w-none">
              <div
                dangerouslySetInnerHTML={{ __html: selectedPost.content_body.replace(/\n/g, '<br />') }}
                className="text-slate-700 leading-relaxed whitespace-pre-wrap"
              />
            </div>
          </article>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Home</span>
          </button>

          {siteLogoUrl && (
            <img
              src={siteLogoUrl}
              alt="Site Logo"
              className="h-12 max-w-[200px] object-contain"
            />
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('blog')}
              className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                activeTab === 'blog'
                  ? 'text-orange-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Blog
              {activeTab === 'blog' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                activeTab === 'about'
                  ? 'text-orange-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              About Us
              {activeTab === 'about' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"></div>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading content...</p>
          </div>
        ) : (
          <>
            {activeTab === 'blog' && (
              <div>
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Our Blog</h1>
                  <p className="text-slate-600">
                    Insights, updates, and stories from the EquityTake community
                  </p>
                </div>

                {blogPosts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <p className="text-slate-600">No blog posts yet. Check back soon!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {blogPosts.map((post) => (
                      <article
                        key={post.id}
                        onClick={() => handlePostClick(post)}
                        className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                      >
                        {post.featured_image_url && (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={post.featured_image_url}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                            <Calendar size={14} />
                            <span>{formatDate(post.published_at)}</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                              {post.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-orange-600 text-sm font-semibold group-hover:gap-3 transition-all">
                            <span>Read More</span>
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div>
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">About EquityTake</h1>
                  <p className="text-slate-600">
                    Learn more about our mission, vision, and the team behind the platform
                  </p>
                </div>

                {aboutSections.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <p className="text-slate-600">About content coming soon!</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {aboutSections.map((section, index) => (
                      <section
                        key={section.id}
                        className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                          index % 2 === 0 ? 'md:flex' : 'md:flex md:flex-row-reverse'
                        }`}
                      >
                        {section.featured_image_url && (
                          <div className="md:w-1/2">
                            <img
                              src={section.featured_image_url}
                              alt={section.title}
                              className="w-full h-full object-cover min-h-[300px]"
                            />
                          </div>
                        )}
                        <div className={`p-8 ${section.featured_image_url ? 'md:w-1/2' : 'w-full'}`}>
                          <h2 className="text-2xl font-bold text-slate-900 mb-4">
                            {section.title}
                          </h2>
                          <div
                            dangerouslySetInnerHTML={{ __html: section.content_body.replace(/\n/g, '<br />') }}
                            className="text-slate-700 leading-relaxed whitespace-pre-wrap"
                          />
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BlogAndAboutPage;
