export default {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'LocaCentral',
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT || 'LocaCentral',
  primaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR || '#1B4FCC',
  primaryDark: process.env.NEXT_PUBLIC_BRAND_PRIMARY_DARK || '#1340A8',
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || '/static/locacentral-logo.png',
  faviconUrl: process.env.NEXT_PUBLIC_FAVICON_URL || '/static/favicon.ico',
};
