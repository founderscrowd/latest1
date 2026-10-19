// Central route paths for EquityTake. Always trailing-slash (except the homepage
// which is just "/"). Use these for every internal <Link to=...> and navigate(...)
// so crawlers and hosting 301s only ever see the canonical slash URL.

export const ROUTES = {
  home: '/',
  groups: '/groups/',
  startupGroups: '/startup-groups/',
  createStartupGroup: '/create-startup-group/',
  cofounderMatching: '/cofounder-matching/',
  findACofounder: '/find-a-cofounder/',
  equityForCofounders: '/equity-for-cofounders/',
  startupEquitySplit: '/startup-equity-split/',
  startupTeamBuilding: '/startup-team-building/',
  communitiesAndCooperatives: '/communities-and-cooperatives/',
  howItWorks: '/how-it-works/',
  blog: '/blog/',
  about: '/about/',
  privacy: '/privacy/',
  terms: '/terms/',
  cookies: '/cookies/',
  signIn: '/sign-in/',
  forgotPassword: '/forgot-password/',
} as const;

export type RouteKey = keyof typeof ROUTES;

// Blog post routes use a slug. Always trailing-slash.
export function blogPostPath(slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, '');
  return `/blog/${clean}/`;
}

// Group profile/detail routes use a slug. Always trailing-slash.
export function groupPath(slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, '');
  return `/groups/${clean}/`;
}

export function groupManagePath(slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, '');
  return `/groups/${clean}/manage/`;
}
