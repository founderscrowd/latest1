import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

interface NotFoundPageProps {
  siteLogoUrl?: string | null;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ siteLogoUrl }) => (
  <div className="min-h-screen bg-slate-50">
    <Helmet>
      <title>Page Not Found | EquityTake</title>
      <meta name="robots" content="noindex" />
    </Helmet>
    <main className="max-w-2xl mx-auto px-4 py-20 text-center">
      {siteLogoUrl && <img src={siteLogoUrl} alt="EquityTake Logo" className="h-12 object-contain mx-auto mb-10" />}
      <h1 className="text-4xl font-bold text-slate-900 mb-4">Page not found</h1>
      <p className="text-slate-600 mb-8">The page you requested does not exist.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/" className="px-5 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold">Back to homepage</Link>
        <Link to="/blog" className="px-5 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors font-semibold">Visit the blog</Link>
      </div>
    </main>
  </div>
);

export default NotFoundPage;
