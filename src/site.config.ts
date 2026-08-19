import type { SiteConfig } from '~/types'

const accentColor = '#3f7896'

const config: SiteConfig = {
  // Absolute URL to the root of your published site, used for generating links and sitemaps.
  site: 'https://aionw.github.io',
  // The name of your site, used in the title and for SEO.
  title: 'Aionw',
  // The description of your site, used for SEO and RSS feed.
  description: 'Notes on software, systems, and the craft of building.',
  // The author of the site, used in the footer, SEO, and RSS feed.
  author: 'Aionw',
  // Keywords for SEO, used in the meta tags.
  tags: ['software', 'systems', 'programming'],
  // Path to the image used for generating social media previews.
  // Needs to be a square JPEG file due to limitations of the social card generator.
  // Try https://squoosh.app/ to easily convert images to JPEG.
  socialCardAvatarImage: './src/content/avatar.jpg',
  // Whether Astro should resolve trailing slashes in URLs or not.
  trailingSlashes: false,
  // The navigation links to display in the header.
  navLinks: [
    {
      name: 'Blog',
      url: '/',
    },
    {
      name: 'Archive',
      url: '/posts',
    },
    {
      name: 'About',
      url: '/about',
    },
    {
      name: 'GitHub',
      url: 'https://github.com/Aionw/aionw.github.io',
      external: true,
    },
  ],
  // The theming configuration for the site.
  themes: {
    // The visual palette used by the site and syntax highlighting.
    default: 'snazzy-light',
    // Shiki themes to bundle with the site.
    // https://expressive-code.com/guides/themes/#using-bundled-themes
    include: ['snazzy-light'],
    // Optional overrides for specific themes to customize colors.
    // Their values can be either a literal color (hex, rgb, hsl) or another theme key.
    // See themeKeys list in src/types.ts for available keys to override and reference.
    overrides: {
      'snazzy-light': {
        accent: accentColor,
        heading1: accentColor,
        heading2: accentColor,
        heading3: accentColor,
        heading4: accentColor,
        heading5: accentColor,
        heading6: accentColor,
        link: accentColor,
        separator: accentColor,
      },
    },
  },
  // These are characters available for the character chat feature.
  // To add your own character, add an image file to the top-level `/public` directory
  // Make sure to compress the image to a web-friendly size (<100kb)
  // Try using the excellent https://squoosh.app web app for creating small webp files
  characters: {
    owl: '/owl.webp',
    unicorn: '/unicorn.webp',
    duck: '/duck.webp',
  },
}

export default config
