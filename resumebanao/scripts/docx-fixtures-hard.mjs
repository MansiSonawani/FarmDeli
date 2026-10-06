// Harder Word fixtures for the import accuracy tests: layouts that the first three fixtures (and the rules
// written alongside them) do not cover. Three more made-up people; each has the answer the importer should give.
import {
  AlignmentType,
  Document,
  LevelFormat,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  Tab,
  TabStopType,
  TextRun,
  WidthType,
} from 'docx'

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (value) => {
  if (!value) return ''
  const [year, month] = value.split('-')
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year
}
const numeric = (value) => {
  const [year, month] = value.split('-')
  return month ? `${month}/${year}` : year
}

const numbering = {
  config: [
    { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT }] },
  ],
}
const para = (children, options = {}) => new Paragraph({ children, ...options })
const run = (text, options = {}) => new TextRun({ text, ...options })
const listItem = (text) => para([run(text)], { numbering: { reference: 'b', level: 0 } })
const lines = (description) =>
  description
    .split('\n')
    .filter(Boolean)
    .map((l) => l.replace(/^- /, ''))

// ---------------------------------------------------------------------------------------------
// D: capitals name, contact in a table, "Company — Title" headers, location | dates line, "–" bullets typed by hand,
//    skills grouped with semicolons, a References section that must be ignored.
const personD = {
  personal: {
    fullName: 'Sofia Reyes',
    jobTitle: 'Full Stack Developer',
    email: 'sofia.reyes@example.es',
    phone: '+34 612 345 678',
    location: 'Madrid, Spain',
    website: 'sofiareyes.dev',
    linkedin: 'linkedin.com/in/sofiareyes',
  },
  sections: [
    {
      type: 'experience',
      title: 'Work Experience',
      items: [
        entry({
          title: 'Full Stack Developer',
          subtitle: 'Helix Software',
          location: 'Madrid, Spain',
          startDate: '2020-01',
          current: true,
          description: bullets(
            'Rebuilt the customer dashboard in React, cutting load time by 60%',
            'Mentored four junior developers',
          ),
        }),
        entry({
          title: 'Web Developer',
          subtitle: 'Mediterraneo Digital',
          location: 'Valencia, Spain',
          startDate: '2016-09',
          endDate: '2019-12',
          description: bullets('Delivered 25 client websites on time', 'Introduced automated testing to the agency'),
        }),
      ],
    },
    {
      type: 'education',
      title: 'Education',
      items: [
        entry({
          title: 'BSc Software Engineering',
          subtitle: 'Universidad Ejemplo',
          startDate: '2012',
          endDate: '2016',
        }),
      ],
    },
    {
      type: 'skills',
      title: 'Skills',
      items: ['JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'Django'].map((n) => tag(n)),
    },
    { type: 'languages', title: 'Languages', items: [tag('Spanish', 4), tag('English', 3), tag('German', 1)] },
  ],
}

function renderD(d) {
  const p = d.personal
  const caps = (t) =>
    para([run(t.toUpperCase(), { bold: true, size: 26 })], {
      spacing: { before: 240, after: 60 },
      border: { bottom: { style: 'single', size: 6, color: '999999', space: 1 } },
    })
  const cell = (text) => new TableCell({ width: { size: 3000, type: WidthType.DXA }, children: [para([run(text)])] })
  const children = [
    para([run(p.fullName.toUpperCase(), { bold: true, size: 48 })], { alignment: AlignmentType.CENTER }),
    para([run(p.jobTitle, { size: 26 })], { alignment: AlignmentType.CENTER }),
    new Table({
      rows: [new TableRow({ children: [cell(p.email), cell(p.phone), cell(p.location)] })],
      width: { size: 9000, type: WidthType.DXA },
    }),
    para([run(`${p.website}  ${p.linkedin}`)], { alignment: AlignmentType.CENTER }),
  ]
  for (const s of d.sections) {
    children.push(caps(s.title))
    if (s.type === 'experience') {
      for (const e of s.items) {
        children.push(para([run(`${e.subtitle} — ${e.title}`, { bold: true })]))
        children.push(
          para([
            run(`${e.location} | ${fmt(e.startDate)} – ${e.current ? 'Present' : fmt(e.endDate)}`, { italics: true }),
          ]),
        )
        for (const l of lines(e.description)) children.push(para([run(`– ${l}`)]))
      }
    }
    if (s.type === 'education') {
      for (const e of s.items) {
        children.push(para([run(`${e.subtitle} — ${e.title}`, { bold: true })]))
        children.push(para([run(`${e.startDate} – ${e.endDate}`)]))
      }
    }
    if (s.type === 'skills') {
      children.push(para([run('Languages: ', { bold: true }), run('JavaScript, TypeScript, Python; ')]))
      children.push(para([run('Frameworks: ', { bold: true }), run('React, Node.js, Django')]))
    }
    if (s.type === 'languages') children.push(para([run('Spanish (Native), English (C1), German (A2)')]))
  }
  children.push(caps('References'))
  children.push(para([run('References available upon request.')]))
  return new Document({ sections: [{ children }] })
}

// ---------------------------------------------------------------------------------------------
// E: "Title | Company | 03/2019 – Current" on one line, numeric dates, bulleted summary and skills,
//    qualifications with a single year after a dash, interests, no website.
const personE = {
  personal: {
    fullName: 'Tom Hendricks',
    jobTitle: 'Operations Manager',
    email: 'tom.hendricks@example.co.uk',
    phone: '07700 900456',
    location: 'Leeds, UK',
    website: '',
    linkedin: 'linkedin.com/in/tomhendricks',
  },
  sections: [
    {
      type: 'summary',
      title: 'Professional Summary',
      content: bullets(
        'Operations manager with ten years in rail and freight logistics',
        'Track record of cutting costs while improving safety',
        'Comfortable leading teams of up to 60',
      ),
    },
    {
      type: 'experience',
      title: 'Career History',
      items: [
        entry({
          title: 'Operations Manager',
          subtitle: 'Northern Rail Services',
          startDate: '2019-03',
          current: true,
          description: bullets('Reduced overtime costs by 18% through better rostering', 'Led a 60 person depot team'),
        }),
        entry({
          title: 'Shift Supervisor',
          subtitle: 'Pennine Logistics',
          startDate: '2014',
          endDate: '2019',
          description: bullets('Supervised 25 drivers across two sites'),
        }),
      ],
    },
    {
      type: 'education',
      title: 'Qualifications',
      items: [
        entry({ title: 'MSc Supply Chain Management', subtitle: 'University of Leeds', endDate: '2013' }),
        entry({ title: 'NEBOSH General Certificate', endDate: '2018' }),
      ],
    },
    {
      type: 'skills',
      title: 'Skills',
      items: ['Rostering', 'Budgeting', 'Health and safety', 'Lean methods'].map((n) => tag(n)),
    },
    { type: 'interests', title: 'Interests', items: ['Cycling', 'Football', 'Cooking'].map((n) => tag(n)) },
  ],
}

function renderE(d) {
  const p = d.personal
  const heading = (t) => para([run(t, { bold: true, size: 28 })], { spacing: { before: 240, after: 80 } })
  const children = [
    para([run(p.fullName, { bold: true, size: 44 })]),
    para([run(p.jobTitle, { size: 26 })]),
    para([run(`${p.location} • ${p.phone} • ${p.email}`)]),
    para([run(p.linkedin)]),
  ]
  for (const s of d.sections) {
    children.push(heading(s.title))
    if (s.type === 'summary') for (const l of lines(s.content)) children.push(listItem(l))
    if (s.type === 'experience') {
      for (const e of s.items) {
        const when = e.current ? `${numeric(e.startDate)} – Current` : `${numeric(e.startDate)} – ${numeric(e.endDate)}`
        children.push(para([run(`${e.title} | ${e.subtitle} | ${when}`, { bold: true })]))
        for (const l of lines(e.description)) children.push(listItem(l))
      }
    }
    if (s.type === 'education') {
      for (const e of s.items) children.push(para([run([e.title, e.subtitle, e.endDate].filter(Boolean).join(' – '))]))
    }
    if (s.type === 'skills') for (const t of s.items) children.push(listItem(t.name))
    if (s.type === 'interests') children.push(para([run(s.items.map((t) => t.name).join(', '))]))
  }
  return new Document({ numbering, sections: [{ children }] })
}

// ---------------------------------------------------------------------------------------------
// F: dates first ("2021 – Present <tab> Product Manager, Orbit Apps"), plain bold headings, middle-dot skills,
//    a certificate given as "PMP — 2022".
const personF = {
  personal: {
    fullName: 'Aisha Khan',
    jobTitle: 'Product Manager',
    email: 'aisha.khan@example.com',
    phone: '+1 (415) 555-0132',
    location: 'San Francisco, CA',
    website: 'aishakhan.io',
    linkedin: '',
  },
  sections: [
    {
      type: 'experience',
      title: 'Experience',
      items: [
        entry({
          title: 'Product Manager',
          subtitle: 'Orbit Apps',
          startDate: '2021',
          current: true,
          description: bullets(
            'Launched the mobile app to 300k users in six months',
            'Owned a roadmap shared by three engineering teams',
          ),
        }),
        entry({
          title: 'Associate Product Manager',
          subtitle: 'Cobalt Systems',
          startDate: '2018',
          endDate: '2021',
          description: bullets('Ran weekly customer interviews and turned them into specs'),
        }),
      ],
    },
    {
      type: 'education',
      title: 'Education',
      items: [
        entry({
          title: 'BS Computer Science',
          subtitle: 'State University of Example',
          startDate: '2014',
          endDate: '2018',
        }),
      ],
    },
    { type: 'certificates', title: 'Certifications', items: [entry({ title: 'PMP', startDate: '2022' })] },
    { type: 'skills', title: 'Skills', items: ['Roadmapping', 'Analytics', 'SQL', 'Figma'].map((n) => tag(n)) },
  ],
}

function renderF(d) {
  const p = d.personal
  const heading = (t) => para([run(t, { bold: true })], { spacing: { before: 240, after: 60 } })
  const stops = [{ type: TabStopType.LEFT, position: 2200 }]
  const row = (when, text) =>
    para([run(when, { bold: true }), new TextRun({ children: [new Tab(), text] })], { tabStops: stops })
  const children = [
    para([run(p.fullName, { bold: true, size: 40 })]),
    para([run(p.jobTitle)]),
    para([run(`${p.email}  |  ${p.phone}  |  ${p.location}  |  ${p.website}`)]),
  ]
  for (const s of d.sections) {
    children.push(heading(s.title))
    if (s.type === 'experience' || s.type === 'education') {
      for (const e of s.items) {
        const when = `${e.startDate} – ${e.current ? 'Present' : e.endDate}`
        children.push(row(when, `${e.title}, ${e.subtitle}`))
        for (const l of lines(e.description)) children.push(listItem(l))
      }
    }
    if (s.type === 'certificates') for (const e of s.items) children.push(para([run(`${e.title} — ${e.startDate}`)]))
    if (s.type === 'skills') children.push(para([run(s.items.map((t) => t.name).join(' · '))]))
  }
  return new Document({ numbering, sections: [{ children }] })
}

export const hardDocxFixtures = [
  ['person-d', personD, renderD],
  ['person-e', personE, renderE],
  ['person-f', personF, renderF],
]
