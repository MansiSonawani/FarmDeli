import { describe, expect, it } from 'vitest'
import { extractContact, findEmail, findLinkedIn, findPhone, findWebsite, isLocation } from './contact.js'

const line = (text, extra = {}) => ({ text, page: 1, column: 0, bold: false, ...extra })
const zone = (...lines) => [{ column: 0, lines }]

describe('finders', () => {
  it('finds emails', () => {
    expect(findEmail('write to maya.lindqvist@example.com today')).toBe('maya.lindqvist@example.com')
    expect(findEmail('no email here')).toBeNull()
  })

  it.each([
    ['+46 70 123 45 67', '+46 70 123 45 67'],
    ['+44 7700 900123', '+44 7700 900123'],
    ['(555) 123-4567', '(555) 123-4567'],
    ['98765 43210', '98765 43210'],
    ['Tel: 020 7946 0958', '020 7946 0958'],
  ])('finds the phone number in "%s"', (text, expected) => {
    expect(findPhone(text)).toBe(expected)
  })

  it('does not read years, date ranges or short numbers as phones', () => {
    expect(findPhone('2019 - 2021')).toBeNull()
    expect(findPhone('Jan 2019 – 2021')).toBeNull()
    expect(findPhone('12345678')).toBeNull()
    expect(findPhone('Grew sales 120 - 150')).toBeNull()
  })

  it('finds LinkedIn and websites, but not technology names', () => {
    expect(findLinkedIn('https://www.linkedin.com/in/maya-l/')).toBe('linkedin.com/in/maya-l')
    expect(findWebsite('mayalindqvist.design')).toBe('mayalindqvist.design')
    expect(findWebsite('https://www.example.com/me')).toBe('example.com/me')
    expect(findWebsite('Node.js, ASP.NET, Vue.js')).toBeNull()
    expect(findWebsite('maya@example.com')).toBeNull()
  })

  it('recognises places', () => {
    for (const place of [
      'Stockholm, Sweden',
      'Austin, TX 78701',
      'Remote',
      'Bengaluru, India',
      'San Francisco, CA, USA',
    ]) {
      expect(isLocation(place), place).toBe(true)
    }
    for (const notPlace of [
      'Senior Product Designer',
      'Acme Corp, Inc',
      'Software Engineer, Backend',
      'Designed 5 apps, shipped them',
    ]) {
      expect(isLocation(notPlace), notPlace).toBe(false)
    }
  })
})

describe('extractContact', () => {
  it('reads a classic centered header with tab-separated details', () => {
    const personal = extractContact(
      zone(
        line('Maya Lindqvist', { bold: true, fontSize: 24 }),
        line('Senior Product Designer', { fontSize: 12 }),
        line('maya@example.com\t+46 70 123 45 67\tStockholm, Sweden\tmayalindqvist.design', { fontSize: 9 }),
        line('linkedin.com/in/mayalindqvist', { fontSize: 9 }),
      ),
      [],
      '',
    )
    expect(personal).toMatchObject({
      fullName: 'Maya Lindqvist',
      jobTitle: 'Senior Product Designer',
      email: 'maya@example.com',
      phone: '+46 70 123 45 67',
      location: 'Stockholm, Sweden',
      website: 'mayalindqvist.design',
      linkedin: 'linkedin.com/in/mayalindqvist',
    })
  })

  it('reads a pipe-separated line in a Word file', () => {
    const personal = extractContact(
      zone(
        line('Daniel Okafor', { bold: true }),
        line('Backend Engineer'),
        line(
          'daniel@example.com | +44 7700 900123 | London, United Kingdom | danielokafor.dev | linkedin.com/in/danielokafor',
        ),
      ),
      [],
      '',
    )
    expect(personal).toMatchObject({
      fullName: 'Daniel Okafor',
      jobTitle: 'Backend Engineer',
      location: 'London, United Kingdom',
      website: 'danielokafor.dev',
    })
  })

  it('takes the biggest name-like line in a two-column layout and details from the sidebar', () => {
    const personal = extractContact(
      [
        { column: 0, lines: [line('maya@example.com', { fontSize: 9 }), line('Stockholm, Sweden', { fontSize: 9 })] },
        {
          column: 1,
          lines: [
            line('Maya Lindqvist', { fontSize: 24, bold: true }),
            line('Senior Product Designer', { fontSize: 12 }),
          ],
        },
      ],
      [],
      '',
    )
    expect(personal).toMatchObject({
      fullName: 'Maya Lindqvist',
      jobTitle: 'Senior Product Designer',
      email: 'maya@example.com',
      location: 'Stockholm, Sweden',
    })
  })

  it('writes a name typed in capitals as a name', () => {
    expect(extractContact(zone(line('MAYA LINDQVIST', { fontSize: 20 })), [], '').fullName).toBe('Maya Lindqvist')
  })

  it('joins a first and last name set on two lines', () => {
    const personal = extractContact(
      zone(line('Maya', { fontSize: 28 }), line('Lindqvist', { fontSize: 28 }), line('Designer', { fontSize: 12 })),
      [],
      '',
    )
    expect(personal).toMatchObject({ fullName: 'Maya Lindqvist', jobTitle: 'Designer' })
  })

  it('skips "Curriculum Vitae" and does not mistake a job title for a name', () => {
    const personal = extractContact(zone(line('Curriculum Vitae'), line('Priya Raman'), line('Data Analyst')), [], '')
    expect(personal).toMatchObject({ fullName: 'Priya Raman', jobTitle: 'Data Analyst' })
  })

  it('does not take a location or an email as a job title', () => {
    const personal = extractContact(zone(line('Lucas Martin'), line('Lyon, France'), line('lucas@example.fr')), [], '')
    expect(personal.jobTitle).toBe('')
    expect(personal.location).toBe('Lyon, France')
  })

  it('strips labels like "Email:" and "Phone:"', () => {
    const personal = extractContact(
      zone(line('Ada Lovelace'), line('Email: ada@example.com | Phone: +44 20 7946 0958')),
      [],
      '',
    )
    expect(personal).toMatchObject({ email: 'ada@example.com', phone: '+44 20 7946 0958' })
  })

  it('uses contact sections and, failing that, the whole document', () => {
    const fromSection = extractContact(
      zone(line('Ada Lovelace')),
      [line('ada@example.com'), line('+44 20 7946 0958')],
      '',
    )
    expect(fromSection).toMatchObject({ email: 'ada@example.com', phone: '+44 20 7946 0958' })
    const fromText = extractContact(
      zone(line('Ada Lovelace')),
      [],
      'footer: reach ada@example.com\nCall +44 20 7946 0958',
    )
    expect(fromText).toMatchObject({ email: 'ada@example.com', phone: '+44 20 7946 0958' })
  })

  it('leaves fields empty when nothing is found', () => {
    expect(extractContact(zone(line('Experience at work')), [], '')).toMatchObject({
      fullName: '',
      email: '',
      phone: '',
    })
  })
})
