import type { BundledShikiTheme } from 'astro-expressive-code'
import type { CollectionEntry, DataEntryMap } from 'astro:content'

export interface Collation<CollectionType extends keyof DataEntryMap> {
  title: string
  url: string
  titleSlug: string
  entries: CollectionEntry<CollectionType>[]
}

export interface CollationGroup<CollectionType extends keyof DataEntryMap> {
  title: string
  url: string
  collations: Collation<CollectionType>[]
  // Return this.collations to allow chaining
  sortCollationsAlpha(): Collation<CollectionType>[]
  sortCollationsMostRecent(): Collation<CollectionType>[]
  sortCollationsLargest(): Collation<CollectionType>[]
  add(item: CollectionEntry<CollectionType>, rawKey: string): void
  match(title: string): Collation<CollectionType> | undefined
  matchMany(titles: string[]): Collation<CollectionType>[] | undefined
}

export type NavLink = {
  name: string
  url: string
  external?: boolean
}

export type AdmonitionType = 'tip' | 'note' | 'important' | 'caution' | 'warning'

export const themeKeys = [
  'foreground',
  'background',
  'accent',
  // Markdown styles
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'list',
  'separator',
  'italic',
  'link',
  // For admonition styling
  'note',
  'tip',
  'important',
  'caution',
  'warning',
  // Terminal colors for user customization only, not used by default
  'blue',
  'green',
  'red',
  'yellow',
  'magenta',
  'cyan',
] as const

export type ThemeKey = (typeof themeKeys)[number]

// const example: TextmateStyles = {
//   foreground: ['editor.foreground'],
//   background: ['editor.background'],
// }
export type TextmateStyles = {
  [key in ThemeKey]: string[]
}

// const example: ColorStyles = {
//   foreground: '#000000',
//   background: '#ffffff',
// }
export type ColorStyles = {
  [key in ThemeKey]: string
}

// const example: ThemesWithColorStyles = {
//   'github-light': {
//     foreground: '#24292e',
//     background: '#ffffff',
//   },
// }
export type ThemesWithColorStyles = Partial<Record<BundledShikiTheme, ColorStyles>>
export type ThemeOverrides = Partial<Record<BundledShikiTheme, Partial<ColorStyles>>>

export interface ThemesConfig {
  default: BundledShikiTheme
  include: BundledShikiTheme[]
  overrides?: ThemeOverrides
}

export interface SiteConfig {
  site: string
  title: string
  description: string
  author: string
  socialCardAvatarImage: string
  tags: string[]
  trailingSlashes: boolean
  themes: ThemesConfig
  navLinks: NavLink[]
  characters: Record<string, string>
}
