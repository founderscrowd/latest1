import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import { trackPageView } from './lib/metaPixel';
import { getPrerenderedBlogPost } from './lib/prerenderedBlogPost';
import './index.css';

// Parse the embedded blog post JSON from the prerendered HTML before React
// mounts. React's createRoot().render() replaces the content inside #root,
// so the JSON script must live outside #root (in <head>) and be read here
// before that happens. The parsed data is cached in the module for
// BlogPostPage to consume without a DOM lookup.
getPrerenderedBlogPost();

function RouteChangeTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <RouteChangeTracker />
        <App />
      </HelmetProvider>
    </BrowserRouter>
  </StrictMode>
);
