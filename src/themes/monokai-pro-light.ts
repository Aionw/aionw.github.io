import { ExpressiveCodeTheme, loadShikiTheme } from 'astro-expressive-code'

const colorReplacements: Record<string, string> = {
  '#1e1f1c': '#f4f2f4',
  '#272822': '#fcfcfa',
  '#34352f': '#ebe8ec',
  '#3e3d32': '#ebe8ec',
  '#414339': '#ebe8ec',
  '#464741': '#d8d4d9',
  '#66d9ef': '#78dce8',
  '#75715e': '#727072',
  '#88846f': '#727072',
  '#90908a': '#727072',
  '#a6e22e': '#a9dc76',
  '#ae81ff': '#ab9df2',
  '#c2c2bf': '#5b595c',
  '#ccccc7': '#5b595c',
  '#e3e3dd': '#2d2a2e',
  '#e6db74': '#ffd866',
  '#f8f8f0': '#2d2a2e',
  '#f8f8f2': '#2d2a2e',
  '#f92672': '#ff6188',
  '#fd971f': '#fc9867',
}

function replaceColor(color?: string) {
  if (!color) return color

  const replacement = colorReplacements[color.slice(0, 7).toLowerCase()]
  return replacement ? `${replacement}${color.slice(7)}` : color
}

export async function loadMonokaiProLightTheme() {
  const monokai = await loadShikiTheme('monokai')

  return new ExpressiveCodeTheme({
    ...monokai,
    name: 'monokai-pro-light',
    type: 'light',
    bg: '#fcfcfa',
    fg: '#2d2a2e',
    colors: Object.fromEntries(
      Object.entries(monokai.colors).map(([key, color]) => [key, replaceColor(color)]),
    ),
    settings: monokai.settings.map((setting) => ({
      ...setting,
      settings: {
        ...setting.settings,
        foreground: replaceColor(setting.settings.foreground),
      },
    })),
  }).ensureMinSyntaxHighlightingColorContrast()
}
