// Word (.docx) fixtures for the resume import tests. Three made-up people, three different layouts.
// Used by make-import-fixtures.mjs; each fixture comes with the answer the importer should produce.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { hardDocxFixtures } from './docx-fixtures-hard.mjs'
import { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph, Tab, TabStopType, TextRun } from 'docx'

const entry = (e) => ({
  title: '',
  subtitle: '',
  location: '',
  link: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  ...e,
})
const tag = (name, level = 0) => ({ name, info: '', level })
const bullets = (...lines) => lines.map((l) => `- ${l}`).join('\n')

const numbering = {
  config: [
    {
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT }],
    },
  ],
}
const TAB_STOP = [{ type: TabStopType.RIGHT, position: 9800 }]
const para = (children, options = {}) => new Paragraph({ children, ...options })
const run = (text, options = {}) => new TextRun({ text, ...options })
const bullet = (text) => para([run(text)], { numbering: { reference: 'bullets', level: 0 } })
const split = (a, b, options = {}) =>
  para([run(a, options), new TextRun({ children: [new Tab(), b] })], { tabStops: TAB_STOP })

// ---------------------------------------------------------------------------------------------
// A: Word heading styles, bold title + right-aligned dates, real bullet lists, comma-separated skills.
const personA = {
  personal: {
    fullName: 'Daniel Okafor',
    jobTitle: 'Backend Engineer',
    email: 'daniel.okafor@example.com',
    phone: '+44 7700 900123',
    location: 'London, United Kingdom',
    website: 'danielokafor.dev',
    linkedin: 'linkedin.com/in/danielokafor',
  },
  sections: [
    {
      type: 'summary',
      title: 'Profile',
      content:
        'Backend engineer with six years of experience building reliable payment and messaging services in Go and Python.',
    },
    {
      type: 'experience',
      title: 'Experience',
      items: [
        entry({
          title: 'Senior Backend Engineer',
          subtitle: 'Kestrel Payments',
          location: 'London',
          startDate: '2021-03',
          current: true,
          description: bullets(
            'Cut payment settlement latency by 45% by moving batch jobs to an event-driven pipeline',
            'Led a team of four engineers and introduced weekly incident reviews',
            'Designed the idempotency layer used by all public APIs',
          ),
        }),
        entry({
          title: 'Backend Engineer',
          subtitle: 'Harbour Messaging',
          location: 'Bristol',
          startDate: '2018-09',
          endDate: '2021-02',
          description: bullets(
            'Built a notification service handling 20 million messages a day',
            'Migrated the team from a monolith to services on Kubernetes',
          ),
        }),
        entry({
          title: 'Software Engineering Intern',
          subtitle: 'Brightwater Systems',
          location: 'Reading',
          startDate: '2017-06',
          endDate: '2017-09',
          description: bullets('Wrote integration tests for a billing platform'),
        }),
      ],
    },
    {
      type: 'education',
      title: 'Education',
      items: [
        entry({
          title: 'BSc Computer Science',
          subtitle: 'University of Exampleton',
          location: 'Bristol',
          startDate: '2014-09',
          endDate: '2018-06',
        }),
      ],
    },
    {
      type: 'skills',
      title: 'Skills',
      items: ['Go', 'Python', 'PostgreSQL', 'Kubernetes', 'Terraform', 'gRPC'].map((n) => tag(n)),
    },
    {
      type: 'languages',
      title: 'Languages',
      items: [tag('English', 4), tag('Yoruba', 3)],
    },
  ],
}

function renderA(d) {
  const p = d.personal
  const heading = (text) => para([run(text)], { heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 80 } })
  const children = [
    para([run(p.fullName, { bold: true, size: 44 })]),
    para([run(p.jobTitle, { size: 26 })]),
    para([run(`${p.email} | ${p.phone} | ${p.location} | ${p.website} | ${p.linkedin}`)]),
  ]
  const when = (e) => `${fmt(e.startDate)} – ${e.current ? 'Present' : fmt(e.endDate)}`
  for (const s of d.sections) {
    children.push(heading(s.title))
    if (s.type === 'summary') children.push(para([run(s.content)]))
    if (s.type === 'experience' || s.type === 'education') {
      for (const e of s.items) {
        children.push(split(e.title, when(e), { bold: true }))
        children.push(split(e.subtitle, e.location, { italics: true }))
        for (const line of e.description.split('\n').filter(Boolean)) children.push(bullet(line.replace(/^- /, '')))
      }
    }
    if (s.type === 'skills') children.push(para([run(s.items.map((t) => t.name).join(', '))]))
    if (s.type === 'languages') {
      for (const t of s.items)
        children.push(para([run(`${t.name} – ${['', 'Basic', 'Conversational', 'Fluent', 'Native'][t.level]}`)]))
    }
  }
  return new Document({ numbering, sections: [{ children }] })
}

// ---------------------------------------------------------------------------------------------
// B: no heading styles (bold ALL CAPS paragraphs), employer first, typed "•" bullets, "Label: a, b" skills.
const personB = {
  personal: {
    fullName: 'Priya Raman',
    jobTitle: 'Data Analyst',
    email: 'priya.raman@example.org',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India',
    website: '',
    linkedin: 'linkedin.com/in/priyaraman',
  },
  sections: [
    {
      type: 'summary',
      title: 'Profile',
      content:
        'Analyst who turns messy retail data into decisions. Strong in SQL, dashboards and clear written summaries for non-technical teams.',
    },
    {
      type: 'experience',
      title: 'Work Experience',
      items: [
        entry({
          title: 'Senior Data Analyst',
          subtitle: 'Lumen Retail Analytics',
          location: 'Bengaluru, India',
          startDate: '2022-01',
          current: true,
          description: bullets(
            'Built weekly sales dashboards used by 40 store managers',
            'Reduced reporting time from two days to two hours with automated SQL pipelines',
          ),
        }),
        entry({
          title: 'Data Analyst',
          subtitle: 'Northfield Consumer Insights',
          location: 'Chennai, India',
          startDate: '2018-07',
          endDate: '2021-12',
          description: bullets(
            'Analysed survey data for 15 consumer brands',
            'Presented findings to client leadership every quarter',
          ),
        }),
      ],
    },
    {
      type: 'education',
      title: 'Education',
      items: [
        entry({
          title: 'MSc Statistics',
          subtitle: 'Indian Institute of Example Sciences',
          location: 'Chennai, India',
          startDate: '2016-08',
          endDate: '2018-05',
        }),
        entry({
          title: 'BSc Mathematics',
          subtitle: 'St. Example College',
          location: 'Madurai, India',
          startDate: '2013-06',
          endDate: '2016-04',
        }),
      ],
    },
    {
      type: 'certificates',
      title: 'Certifications',
      items: [
        entry({ title: 'Certified Data Analyst', subtitle: 'Example Data Institute', startDate: '2021' }),
        entry({ title: 'Tableau Desktop Specialist', subtitle: 'Example Visual Academy', startDate: '2020' }),
      ],
    },
    {
      type: 'skills',
      title: 'Skills',
      items: ['Python', 'R', 'SQL', 'Tableau', 'Power BI', 'Excel'].map((n) => tag(n)),
    },
    {
      type: 'interests',
      title: 'Interests',
      items: ['Chess', 'Carnatic music', 'Hiking'].map((n) => tag(n)),
    },
  ],
}

function renderB(d) {
  const p = d.personal
  const caps = (text) => para([run(text.toUpperCase(), { bold: true })], { spacing: { before: 240, after: 80 } })
  const children = [
    para([run(p.fullName, { bold: true, size: 40 })]),
    para([run(p.jobTitle)]),
    para([run(p.email)]),
    para([run(`${p.phone} | ${p.location}`)]),
    para([run(p.linkedin)]),
  ]
  const when = (e) => `${fmt(e.startDate)} – ${e.current ? 'Present' : fmt(e.endDate)}`
  const skillLines = {
    Python: 'Programming',
    R: 'Programming',
    SQL: 'Programming',
    Tableau: 'Tools',
    'Power BI': 'Tools',
    Excel: 'Tools',
  }
  for (const s of d.sections) {
    children.push(caps(s.title))
    if (s.type === 'summary') children.push(para([run(s.content)]))
    if (s.type === 'experience' || s.type === 'education') {
      for (const e of s.items) {
        children.push(para([run(e.subtitle, { bold: true })]))
        children.push(para([run(e.title)]))
        children.push(para([run(`${when(e)} | ${e.location}`)]))
        for (const line of e.description.split('\n').filter(Boolean))
          children.push(para([run(`• ${line.replace(/^- /, '')}`)]))
      }
    }
    if (s.type === 'certificates') {
      for (const e of s.items) children.push(split(`${e.title} — ${e.subtitle}`, e.startDate))
    }
    if (s.type === 'skills') {
      for (const label of ['Programming', 'Tools']) {
        const names = s.items.filter((t) => skillLines[t.name] === label).map((t) => t.name)
        children.push(para([run(`${label}: `, { bold: true }), run(names.join(', '))]))
      }
    }
    if (s.type === 'interests') children.push(para([run(s.items.map((t) => t.name).join(', '))]))
  }
  return new Document({ sections: [{ children }] })
}

// ---------------------------------------------------------------------------------------------
// C: compact one-line entries ("Title, Company, City (dates)"), single-year dates, inline languages.
const personC = {
  personal: {
    fullName: 'Lucas Martin',
    jobTitle: 'Marketing Manager',
    email: 'lucas.martin@example.fr',
    phone: '+33 6 12 34 56 78',
    location: 'Lyon, France',
    website: '',
    linkedin: '',
  },
  sections: [
    {
      type: 'summary',
      title: 'Summary',
      content: 'Marketing manager focused on brand growth for consumer and cultural organisations.',
    },
    {
      type: 'experience',
      title: 'Experience',
      items: [
        entry({
          title: 'Marketing Manager',
          subtitle: 'Bleu Horizon Media',
          location: 'Lyon',
          startDate: '2019-06',
          current: true,
          description: bullets(
            'Grew newsletter subscribers from 8,000 to 31,000 in two years',
            'Managed an annual campaign budget of 400k EUR',
          ),
        }),
        entry({
          title: 'Marketing Specialist',
          subtitle: 'Atelier Nord',
          location: 'Paris',
          startDate: '2016',
          endDate: '2019',
          description: bullets('Ran social media for four retail brands'),
        }),
      ],
    },
    {
      type: 'education',
      title: 'Education',
      items: [
        entry({
          title: 'MSc Marketing',
          subtitle: 'EM Example Business School',
          location: 'Lyon',
          endDate: '2016',
        }),
      ],
    },
    {
      type: 'languages',
      title: 'Languages',
      items: [tag('French', 4), tag('English', 3), tag('Spanish', 1)],
    },
    {
      type: 'awards',
      title: 'Awards',
      items: [
        entry({ title: 'Digital Campaign of the Year', subtitle: 'Example Marketing Awards', startDate: '2022' }),
      ],
    },
    {
      type: 'volunteering',
      title: 'Volunteering',
      items: [
        entry({
          title: 'Volunteer Coordinator',
          subtitle: 'Lyon Food Bank',
          startDate: '2018',
          endDate: '2020',
        }),
      ],
    },
  ],
}

function renderC(d) {
  const p = d.personal
  const heading = (text) => para([run(text)], { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 60 } })
  const children = [
    para([run(p.fullName, { bold: true, size: 40 })], { alignment: AlignmentType.CENTER }),
    para([run(p.jobTitle)], { alignment: AlignmentType.CENTER }),
    para([run(`${p.email} · ${p.phone} · ${p.location}`)], { alignment: AlignmentType.CENTER }),
  ]
  const range = (e) => {
    if (e.current) return `${fmt(e.startDate)} – Present`
    if (e.startDate && e.endDate) return `${fmt(e.startDate)} – ${fmt(e.endDate)}`
    return fmt(e.startDate || e.endDate)
  }
  const line = (e) => [e.title, e.subtitle, e.location].filter(Boolean).join(', ')
  for (const s of d.sections) {
    children.push(heading(s.title))
    if (s.type === 'summary') children.push(para([run(s.content)]))
    if (s.type === 'experience' || s.type === 'volunteering') {
      for (const e of s.items) {
        children.push(para([run(`${line(e)} `, { bold: true }), run(`(${range(e)})`)]))
        for (const l of e.description.split('\n').filter(Boolean)) children.push(bullet(l.replace(/^- /, '')))
      }
    }
    if (s.type === 'education') {
      for (const e of s.items) children.push(para([run(`${line(e)} — ${range(e)}`)]))
    }
    if (s.type === 'awards') {
      for (const e of s.items) children.push(para([run(`${[e.title, e.subtitle].join(', ')} — ${range(e)}`)]))
    }
    if (s.type === 'languages') {
      const name = ['', 'Basic', 'Conversational', 'Fluent', 'Native']
      children.push(para([run(s.items.map((t) => `${t.name} (${name[t.level]})`).join(', '))]))
    }
  }
  return new Document({ numbering, sections: [{ children }] })
}

// ---------------------------------------------------------------------------------------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmt(value) {
  if (!value) return ''
  const [year, month] = value.split('-')
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year
}

export async function buildDocxFixtures(dir) {
  const fixtures = [
    ['person-a', personA, renderA],
    ['person-b', personB, renderB],
    ['person-c', personC, renderC],
    ...hardDocxFixtures,
  ]
  const written = []
  for (const [name, data, render] of fixtures) {
    writeFileSync(join(dir, `${name}.docx`), await Packer.toBuffer(render(data)))
    const expected = {
      personal: data.personal,
      sections: data.sections.map((s) => ({ ...s, items: s.items ?? [] })),
    }
    writeFileSync(join(dir, `${name}.expected.json`), JSON.stringify(expected, null, 2) + '\n')
    written.push({ file: `${name}.docx`, expected: `${name}.expected.json`, dateFormat: 'MMM YYYY' })
  }
  return written
}
