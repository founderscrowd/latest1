# How to Complete the Routing Implementation

## Current Status

Most routing infrastructure is in place:
- ✅ Database has slug support for groups
- ✅ Route wrapper components are created
- ✅ Blog, About, and other page components are ready
- ✅ react-router-dom is installed and configured in main.tsx
- ✅ Footer uses Link components

## What Remains: Update App.tsx

The main App.tsx file (1475 lines) needs to be updated to use React Router's Routes and Route components instead of conditional rendering.

### Current Pattern (what needs to change):
```tsx
// Current conditional rendering approach
{showPrivacyPolicy && <PrivacyPolicyPage ... />}
{showTermsOfService && <TermsOfServicePage ... />}
{showProfile && <ProfilePage ... />}
```

### New Pattern (what it should become):
```tsx
import { Routes, Route, useNavigate, Link } from 'react-router-dom';

<Routes>
  <Route path="/" element={<HomePage ... />} />
  <Route path="/blog" element={<BlogListPage ... />} />
  <Route path="/blog/:slug" element={<BlogPostPage ... />} />
  <Route path="/about" element={<AboutPage ... />} />
  <Route path="/groups/:slug" element={<GroupDetailsRoute ... />} />
  ...
</Routes>
```

## Step-by-Step Instructions

### Step 1: Add Router Imports to App.tsx

Add these imports at the top of App.tsx:
```tsx
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
```

### Step 2: Add New Page Imports

Add imports for the new page components:
```tsx
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import AboutPage from './pages/AboutPage';
import GroupDetailsRoute from './pages/GroupDetailsRoute';
import GroupProfileRoute from './pages/GroupProfileRoute';
import PaymentSuccessRoute from './pages/PaymentSuccessRoute';
import PaymentCancelRoute from './pages/PaymentCancelRoute';
import LegacyGroupRedirect from './pages/LegacyGroupRedirect';
```

### Step 3: Remove State-Based Navigation Variables

Remove or comment out these state variables (they're replaced by routing):
```tsx
// DELETE THESE:
const [showProfile, setShowProfile] = useState(false);
const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
const [showTermsOfService, setShowTermsOfService] = useState(false);
const [showCookiePolicy, setShowCookiePolicy] = useState(false);
const [showBlogAndAbout, setShowBlogAndAbout] = useState(false);
const [showHowItWorks, setShowHowItWorks] = useState(false);
const [showStripeSuccess, setShowStripeSuccess] = useState(false);
const [showStripeCancel, setShowStripeCancel] = useState(false);
const [showSiteSettings, setShowSiteSettings] = useState(false);
const [showGroupProfile, setShowGroupProfile] = useState(false);
const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
```

### Step 4: Add useNavigate Hook

Add the navigate hook after other hooks:
```tsx
const navigate = useNavigate();
const location = useLocation();
```

### Step 5: Update Navigation Handlers

Replace state-based handlers with navigate calls:
```tsx
// OLD:
const handleBackFromProfile = () => {
  setShowProfile(false);
};

// NEW:
const handleShowProfile = () => {
  navigate('/profile');
};
```

### Step 6: Update Group Navigation to Use Slugs

Update the handleGroupCardClick function to navigate using slugs:
```tsx
const handleGroupCardClick = (group: GroupData) => {
  if (isGroupOwner(group)) {
    navigate(`/groups/${group.slug}/manage`);
  } else if (group.joined) {
    navigate(`/groups/${group.slug}/manage`);
  } else {
    navigate(`/groups/${group.slug}`);
  }
};
```

### Step 7: Update Header Navigation

Replace onClick handlers with Link components or navigate calls:
```tsx
// In header:
<Link
  to="/blog"
  className="px-3 py-2 rounded-lg font-semibold text-xs text-slate-600 hover:text-slate-900 transition-colors"
>
  Blog
</Link>
<Link
  to="/about"
  className="px-3 py-2 rounded-lg font-semibold text-xs text-slate-600 hover:text-slate-900 transition-colors"
>
  About
</Link>
```

### Step 8: Replace Conditional Rendering with Routes

Find the section that starts with:
```tsx
// Determine which page to show
const isHomePage = !showPrivacyPolicy && !showTermsOfService ...
```

And replace all the conditional rendering (`{showPrivacyPolicy && ...}`) with:

```tsx
<Routes>
  {/* Main Pages */}
  <Route path="/" element={
    <HomePage
      // Pass all necessary props
      user={user}
      groups={groups}
      groupsLoading={groupsLoading}
      userSubscription={userSubscription}
      isUserSiteAdmin={isUserSiteAdmin}
      siteLogoUrl={siteLogoUrl}
      onShowAuthModal={() => setIsAuthModalOpen(true)}
      onShowPricingModal={() => setShowPricingModal(true)}
      onShowCreateModal={() => setIsCreateModalOpen(true)}
      // ... other props
    />
  } />

  {/* Blog & About */}
  <Route path="/blog" element={<BlogListPage siteLogoUrl={siteLogoUrl} />} />
  <Route path="/blog/:slug" element={<BlogPostPage siteLogoUrl={siteLogoUrl} />} />
  <Route path="/about" element={<AboutPage siteLogoUrl={siteLogoUrl} />} />

  {/* Groups */}
  <Route path="/groups/:slug" element={
    <GroupDetailsRoute
      onShowAuthModal={() => setIsAuthModalOpen(true)}
      onShowPricingModal={() => setShowPricingModal(true)}
    />
  } />
  <Route path="/groups/:slug/manage" element={
    <GroupProfileRoute siteLogoUrl={siteLogoUrl} />
  } />

  {/* Legacy redirect for old ?group=id URLs */}
  <Route path="/redirect" element={<LegacyGroupRedirect />} />

  {/* Payment Pages */}
  <Route path="/payment/success" element={<PaymentSuccessRoute />} />
  <Route path="/payment/cancelled" element={
    <PaymentCancelRoute onShowPricingModal={() => setShowPricingModal(true)} />
  } />

  {/* Policy Pages */}
  <Route path="/privacy" element={
    <PrivacyPolicyPage
      onBack={() => navigate('/')}
      siteLogoUrl={siteLogoUrl}
    />
  } />
  <Route path="/terms" element={
    <TermsOfServicePage
      onBack={() => navigate('/')}
      siteLogoUrl={siteLogoUrl}
    />
  } />
  <Route path="/cookies" element={
    <CookiePolicyPage
      onBack={() => navigate('/')}
      siteLogoUrl={siteLogoUrl}
    />
  } />

  {/* Protected Routes */}
  <Route path="/profile" element={
    user ? (
      <ProfilePage
        onBack={() => navigate('/')}
        onViewJoinedGroup={(groupId) => {
          // Fetch group and navigate to its slug
          groupAPI.getGroup(groupId).then(g => navigate(`/groups/${g.slug}/manage`));
        }}
        onCreateGroup={() => setIsCreateModalOpen(true)}
        siteLogoUrl={siteLogoUrl}
        userSubscription={userSubscription}
      />
    ) : (
      // Redirect to home if not authenticated
      <Navigate to="/" replace />
    )
  } />

  <Route path="/settings" element={
    user && isUserSiteAdmin ? (
      <SiteSettingsPage onBack={() => navigate('/')} />
    ) : (
      <Navigate to="/" replace />
    )
  } />

  {/* 404 Not Found */}
  <Route path="*" element={
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">404 - Page Not Found</h1>
        <Link to="/" className="text-orange-600 hover:text-orange-700">
          Go back home
        </Link>
      </div>
    </div>
  } />
</Routes>

{/* Modals - Rendered outside Routes so they appear on any page */}
<CreateGroupModal
  isOpen={isCreateModalOpen}
  onClose={() => setIsCreateModalOpen(false)}
  onSuccess={handleCreateGroupSuccess}
/>
<AuthModal
  isOpen={isAuthModalOpen}
  onClose={() => setIsAuthModalOpen(false)}
  onAuthSuccess={handleAuthSuccess}
  initialIsSignUp={initialAuthModeSignUp}
/>
<PricingModal
  isOpen={showPricingModal}
  onClose={() => setShowPricingModal(false)}
  onShowTerms={() => navigate('/terms')}
/>
{/* ... other modals */}
```

### Step 9: Handle Legacy URL Redirects

Add this effect to handle old ?group=id URLs:
```tsx
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('group');

  if (groupId) {
    // Redirect to LegacyGroupRedirect component
    navigate(`/redirect?group=${groupId}`, { replace: true });
  }

  // Handle Stripe redirects
  const sessionId = urlParams.get('session_id');
  if (sessionId) {
    navigate(`/payment/success?session_id=${sessionId}`, { replace: true });
  }

  const cancelled = urlParams.get('cancelled');
  if (cancelled === 'true') {
    navigate('/payment/cancelled', { replace: true });
  }
}, [navigate]);
```

### Step 10: Create HomePage Component

Since the home page logic is complex, you can either:
1. Keep it inline in the Route element
2. Or extract it to a separate HomePage component

For simplicity, you can keep the home page rendering inline initially.

## Testing Checklist

After making these changes, test:

1. ✅ Home page loads at /
2. ✅ Blog list loads at /blog
3. ✅ Individual blog posts load at /blog/:slug
4. ✅ About page loads at /about
5. ✅ Groups load at /groups/:slug
6. ✅ Group management loads at /groups/:slug/manage
7. ✅ Legacy ?group=id URLs redirect correctly
8. ✅ Payment success/cancel pages work with query params
9. ✅ Browser back/forward buttons work
10. ✅ All modals still work
11. ✅ Footer links work
12. ✅ Header navigation works

## Build and Deploy

```bash
npm run build
```

Check for any TypeScript errors and fix them.

## Notes

- The HomePage content can remain inline in App.tsx for now
- Modals must stay outside <Routes> to work on all pages
- Use navigate() instead of state setters for page changes
- Use Link components for static links in JSX
- Keep modal state variables (isAuthModalOpen, etc.)
