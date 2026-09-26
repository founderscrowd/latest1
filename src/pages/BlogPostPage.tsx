import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { blogAPI, SiteContent } from '../lib/blogApi';

interface BlogPostPageProps {
  siteLogoUrl: string | null;
}

const BlogPostPage: React.FC<BlogPostPageProps> = ({ siteLogoUrl }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  const loadPost = async (postSlug: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const postData = await blogAPI.getBlogPostBySlug(postSlug);
      if (postData && postData.is_published) {
        setPost(postData);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error loading blog post:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Helmet>
          <title>Post Not Found | EquityTake</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
            <Link
              to="/blog"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back to Blog</span>
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Post Not Found</h1>
            <p className="text-slate-600 mb-8">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/blog"
              className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              View All Posts
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const canonicalUrl = `https://equitytakeaway.com/blog/${post.slug}`;
  const metaDescription = post.meta_description || post.excerpt || `${post.title} — read on EquityTake.`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>{post.title} | EquityTake</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph tags for social sharing */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        {post.featured_image_url && (
          <meta property="og:image" content={post.featured_image_url} />
        )}

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={metaDescription} />
        {post.featured_image_url && (
          <meta name="twitter:image" content={post.featured_image_url} />
        )}

        {/* Structured data for search engines */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": metaDescription,
            "image": post.featured_image_url,
            "datePublished": post.published_at,
            "dateModified": post.updated_at,
            "author": {
              "@type": "Organization",
              "name": "EquityTake"
            },
            "publisher": {
              "@type": "Organization",
              "name": "EquityTake"
            }
          })}
        </script>
      </Helmet>

      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
          <Link
            to="/blog"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Blog</span>
          </Link>
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
        <article className="bg-white rounded-xl shadow-sm p-8">
          {post.featured_image_url && (
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-96 object-cover rounded-lg mb-8"
            />
          )}

          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            {post.title}
          </h1>

          <div className="flex items-center gap-6 text-sm text-slate-600 mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{formatDate(post.published_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>EquityTake Team</span>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <div
              dangerouslySetInnerHTML={{
                __html: post.content_body.includes('<')
                  ? post.content_body
                  : post.content_body.replace(/\n/g, '<br />')
              }}
              className="text-slate-700 leading-relaxed [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-800 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:mb-2"
            />
          </div>
        </article>
      </main>
    </div>
  );
};

export default BlogPostPage;
