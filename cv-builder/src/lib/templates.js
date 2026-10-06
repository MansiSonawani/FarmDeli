import { DEFAULT_STYLE } from './defaults'

// A template is just a preset of style settings for the layout engine. Users can
// pick one and then tweak every value in the Customize panel.
export const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    style: {
      layout: 'one',
      colorMode: 'accent',
      accentColor: '#1d4ed8',
      fontFamily: 'Source Serif 4',
      headingFontFamily: 'Source Serif 4',
      headerAlign: 'center',
      headingStyle: 'underline',
      headingUppercase: true,
      tagStyle: 'comma',
      showPhoto: false,
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    style: {
      layout: 'left',
      sidebarWidth: 33,
      colorMode: 'sidebar',
      accentColor: '#1e3a5f',
      fontFamily: 'Inter',
      headingFontFamily: 'Inter',
      headerAlign: 'left',
      headingStyle: 'plain',
      headingUppercase: true,
      tagStyle: 'bars',
      showPhoto: true,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    style: {
      layout: 'one',
      colorMode: 'accent',
      accentColor: '#111827',
      fontFamily: 'IBM Plex Sans',
      headingFontFamily: 'IBM Plex Sans',
      headerAlign: 'left',
      headingStyle: 'plain',
      headingUppercase: false,
      tagStyle: 'comma',
      showPhoto: false,
      nameSize: 22,
    },
  },
  {
    id: 'executive',
    name: 'Executive',
    style: {
      layout: 'right',
      sidebarWidth: 32,
      colorMode: 'header',
      accentColor: '#7c2d12',
      fontFamily: 'Lato',
      headingFontFamily: 'Playfair Display',
      headerAlign: 'left',
      headingStyle: 'bar',
      headingUppercase: false,
      tagStyle: 'list',
      showPhoto: true,
    },
  },
  {
    id: 'bold',
    name: 'Bold',
    style: {
      layout: 'right',
      sidebarWidth: 34,
      colorMode: 'accent',
      accentColor: '#0f766e',
      fontFamily: 'Poppins',
      headingFontFamily: 'Poppins',
      headerAlign: 'left',
      headingStyle: 'box',
      headingUppercase: true,
      tagStyle: 'pills',
      showPhoto: true,
      fontSize: 9,
    },
  },
  {
    id: 'compact',
    name: 'Compact',
    style: {
      layout: 'left',
      sidebarWidth: 30,
      colorMode: 'accent',
      accentColor: '#6d28d9',
      fontFamily: 'Source Sans 3',
      headingFontFamily: 'Source Sans 3',
      headerAlign: 'left',
      headingStyle: 'underline',
      headingUppercase: true,
      tagStyle: 'pills',
      showPhoto: false,
      fontSize: 9,
      margin: 11,
      sectionGap: 4,
      entryGap: 2.5,
    },
  },
]

export function templateStyle(id) {
  const template = TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
  return { ...DEFAULT_STYLE, ...template.style, template: template.id }
}

export const ACCENT_COLORS = [
  '#111827', '#1e3a5f', '#1d4ed8', '#0369a1', '#0f766e', '#15803d',
  '#4d7c0f', '#a16207', '#c2410c', '#7c2d12', '#be123c', '#9d174d',
  '#6d28d9', '#4338ca', '#475569', '#57534e',
]

export const FONTS = [
  { name: 'Inter', category: 'Sans' },
  { name: 'Lato', category: 'Sans' },
  { name: 'Roboto', category: 'Sans' },
  { name: 'Open Sans', category: 'Sans' },
  { name: 'Source Sans 3', category: 'Sans' },
  { name: 'IBM Plex Sans', category: 'Sans' },
  { name: 'Poppins', category: 'Sans' },
  { name: 'Montserrat', category: 'Sans' },
  { name: 'Merriweather', category: 'Serif' },
  { name: 'Lora', category: 'Serif' },
  { name: 'Source Serif 4', category: 'Serif' },
  { name: 'EB Garamond', category: 'Serif' },
  { name: 'Playfair Display', category: 'Serif' },
]

export function fontStack(name) {
  const font = FONTS.find((f) => f.name === name)
  const fallback = font?.category === 'Serif' ? 'Georgia, serif' : 'Helvetica, Arial, sans-serif'
  return `"${name}", ${fallback}`
}
