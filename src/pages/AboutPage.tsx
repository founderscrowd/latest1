import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { blogAPI, SiteContent } from '../lib/blogApi';

interface AboutPageProps {
  siteLogoUrl: string | null;
}

const AboutPage: React.FC<AboutPageProps> = ({ siteLogoUrl }) => {
  const navigate = useNavigate();
  const [aboutSections, setAboutSections] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAboutSections();
  }, []);

  const loadAboutSections = async () => {
    setLoading(true);
    try {
      const sections = await blogAPI.getPublishedAboutSections();
      setAboutSections(sections);
    } catch (error) {
      console.error('Error loading about sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const canonicalUrl = `${window.location.origin}/about`;
  const description = 'Learn more about EquityTake - connecting co-founders to build startups together through collaborative groups. Join our community of entrepreneurs and innovators.';

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>About Us | EquityTake</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph tags for social sharing */}
        <meta property="og:title" content="About EquityTake" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {siteLogoUrl && <meta property="og:image" content={siteLogoUrl} />}

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About EquityTake" />
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">About EquityTake</h1>
          <p className="text-lg text-slate-600">
            Connecting co-founders to build startups together
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading content...</p>
          </div>
        ) : aboutSections.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <p className="text-slate-700 leading-relaxed mb-6">
              EquityTake is a platform designed to help aspiring entrepreneurs connect with co-founders
              and build startups together. Our mission is to make starting a company more accessible
              by facilitating meaningful connections between people with complementary skills and shared visions.
            </p>
            <p className="text-slate-700 leading-relaxed mb-6">
              Through our platform, you can:
            </p>
            <ul className="list-disc list-inside text-slate-700 leading-relaxed mb-6 space-y-2">
              <li>Browse and join startup groups with innovative ideas</li>
              <li>Connect with potential co-founders who share your passion</li>
              <li>Claim equity stakes in promising ventures</li>
              <li>Collaborate with team members to bring ideas to life</li>
              <li>Access resources and tools to help your startup succeed</li>
            </ul>
            <p className="text-slate-700 leading-relaxed">
              Whether you're a developer, designer, marketer, or business strategist, EquityTake
              provides the platform to find your perfect co-founder match and start building
              something amazing together.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {aboutSections.map((section) => (
              <div key={section.id} className="bg-white rounded-xl shadow-sm p-8">
                {section.featured_image_url && (
                  <img
                    src={section.featured_image_url}
                    alt={section.title}
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}
                <h2 className="text-2xl font-bold text-slate-900 mb-4">{section.title}</h2>
                <div className="prose prose-slate max-w-none">
                  <div
                    dangerouslySetInnerHTML={{ __html: section.content_body.replace(/\n/g, '<br />') }}
                    className="text-slate-700 leading-relaxed whitespace-pre-wrap"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AboutPage;
