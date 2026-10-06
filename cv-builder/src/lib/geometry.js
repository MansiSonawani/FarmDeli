import { PAGE_SIZES } from './paginate'

// Page geometry (in mm) and CSS variables for a resume style.
export function pageGeometry(style) {
  const page = PAGE_SIZES[style.pageSize] ?? PAGE_SIZES.A4
  const inner = page.width - 2 * style.margin
  const twoCol = style.layout !== 'one'
  const side = twoCol ? (inner * style.sidebarWidth) / 100 : 0
  const main = twoCol ? inner - side - style.columnGap : inner
  const columns = !twoCol
    ? [{ name: 'main', width: main }]
    : style.layout === 'left'
      ? [
          { name: 'side', width: side },
          { name: 'main', width: main },
        ]
      : [
          { name: 'main', width: main },
          { name: 'side', width: side },
        ]
  const sidebarFilled = twoCol && style.colorMode === 'sidebar'
  return { ...page, inner, columns, twoCol, sidebarFilled }
}

export function cssVars(style) {
  return {
    '--cv-font': `"${style.fontFamily}", Helvetica, Arial, sans-serif`,
    '--cv-heading-font': `"${style.headingFontFamily || style.fontFamily}", Helvetica, Arial, sans-serif`,
    '--cv-font-size': `${style.fontSize}pt`,
    '--cv-line-height': style.lineHeight,
    '--cv-accent': style.accentColor,
    '--cv-name-size': `${style.nameSize}pt`,
    '--cv-name-color': style.colorMode === 'accent' && style.headingStyle !== 'bar' ? '#111827' : undefined,
  }
}
