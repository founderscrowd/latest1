import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { blogAPI, SiteContent } from '../lib/blogApi';

interface BlogListPageProps {
  siteLogoUrl: string | null;
}

const BlogListPage: React.FC<BlogListPageProps> = ({ siteLogoUrl }) => {
  const navigate = useNavigate();
  const [blogPosts, setBlogPosts] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlogPosts();
  }, []);

  const loadBlogPosts = async () => {
    setLoading(true);
    try {
      const posts = await blogAPI.getPublishedBlogPosts();
      setBlogPosts(posts);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const canonicalUrl = `${window.location.origin}/blog`;
  const description = 'Insights, updates, and stories from the EquityTake team. Learn about building startups, finding co-founders, and growing your business.';

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Blog | EquityTake</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph tags for social sharing */}
        <meta property="og:title" content="EquityTake Blog" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {siteLogoUrl && <meta property="og:image" content={siteLogoUrl} />}

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="EquityTake Blog" />
        <meta name="twitter:description" content={description} />
        {siteLogoUrl && <meta name="twitter:image" content={siteLogoUrl} />}
      </Helmet>

      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
          {siteLogoUrl && (
            <Link to="/" className="ml-auto">
              <img
                src={siteLogoUrl}
                alt="EquityTake Logo"
                className="h-12 object-contain"
              />
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Blog</h1>
          <p className="text-lg text-slate-600">
            Insights, updates, and stories from the EquityTake team
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading posts...</p>
          </div>
        ) : blogPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">No blog posts available yet.</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {blogPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex gap-6">
                  {post.featured_image_url && (
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-48 h-32 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">
                      {post.title}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>{formatDate(post.published_at)}</span>
                      </div>
                    </div>
                    <p className="text-slate-700 mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-2 text-orange-600 font-medium text-sm">
                      <span>Read more</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogListPage;
