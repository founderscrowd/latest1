import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, BookOpen, Users } from 'lucide-react';

interface NotFoundPageProps {
  siteLogoUrl?: string | null;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ siteLogoUrl }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Page not found | EquityTake</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <Home size={20} />
            <span className="text-sm font-medium">Home</span>
          </Link>
          {siteLogoUrl && (
            <img
              src={siteLogoUrl}
              alt="EquityTake Logo"
              className="h-10 object-contain"
            />
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-slate-900 mb-4">Page not found</h1>
        <p className="text-slate-600 mb-10 text-lg">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
          >
            <Home size={18} />
            Go to homepage
          </Link>
          <Link
            to="/blog/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
          >
            <BookOpen size={18} />
            Read the blog
          </Link>
          <Link
            to="/groups/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
          >
            <Users size={18} />
            Browse groups
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
