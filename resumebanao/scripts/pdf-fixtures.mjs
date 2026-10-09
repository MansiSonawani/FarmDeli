// PDF fixtures made from hand-written HTML (not from the app's own templates), for the import accuracy tests.
// Printed with the same headless browser as the template fixtures. Made-up people only.
import { writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

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
const fmt = (v) => (v ? (v.includes('-') ? `${MONTHS[Number(v.split('-')[1]) - 1]} ${v.split('-')[0]}` : v) : '')
const when = (e) => `${fmt(e.startDate)} – ${e.current ? 'Present' : fmt(e.endDate)}`
const li = (description) =>
  description
    .split('\n')
    .filter(Boolean)
    .map((l) => `<li>${l.replace(/^- /, '')}</li>`)
    .join('')

// ---------------------------------------------------------------------------------------------
// G: a traditional "Word-style" resume. Serif font, centered header, company first with its place on the
//    right, title in italics with the dates on the right, long bullets that wrap, a skills paragraph that wraps.
const personG = {
  personal: {
    fullName: 'Hannah Weber',
    jobTitle: 'Mechanical Engineer',
    email: 'hannah.weber@example.de',
    phone: '+49 151 2345 6789',
    location: 'Munich, Germany',
    website: '',
    linkedin: 'linkedin.com/in/hannahweber',
  },
  sections: [
    {
      type: 'experience',
      title: 'Professional Experience',
      items: [
        entry({
          title: 'Senior Mechanical Engineer',
          subtitle: 'Alpenwerk Maschinenbau GmbH',
          location: 'Munich, Germany',
          startDate: '2020-03',
          current: true,
          description: bullets(
            'Led the mechanical redesign of a hydraulic press line that reduced energy consumption by 22% and cut maintenance downtime across three production sites',
            'Introduced finite element analysis into the standard design review, catching stress problems before prototypes were built',
            'Supervised a team of six engineers and two apprentices',
          ),
        }),
        entry({
          title: 'Mechanical Engineer',
          subtitle: 'Rheinstahl Technik AG',
          location: 'Stuttgart, Germany',
          startDate: '2016-07',
          endDate: '2020-02',
          description: bullets(
            'Designed gearbox housings for agricultural machinery and managed the supplier relationships for castings and machining',
            'Wrote the test procedures used to certify every new product line',
          ),
        }),
      ],
    },
    {
      type: 'education',
      title: 'Education',
      items: [
        entry({
          title: 'MSc Mechanical Engineering',
          subtitle: 'Technical University of Example',
          location: 'Munich, Germany',
          startDate: '2013-10',
          endDate: '2015-09',
          description: 'Thesis on vibration damping in lightweight gearbox housings.',
        }),
      ],
    },
    {
      type: 'skills',
      title: 'Skills',
      items: [
        'SolidWorks',
        'CATIA',
        'ANSYS',
        'MATLAB',
        'Finite element analysis',
        'Technical drawing',
        'Project planning',
        'Supplier management',
        'Lean manufacturing',
        'Python',
      ].map((n) => tag(n)),
    },
    { type: 'languages', title: 'Languages', items: [tag('German', 4), tag('English', 3), tag('French', 1)] },
  ],
}

const pageG = (d) => `<!doctype html><meta charset="utf-8"><style>
@page{size:A4;margin:18mm 20mm}
body{font-family:'Times New Roman',Times,serif;font-size:11pt;line-height:1.25;margin:0}
h1{text-align:center;font-size:21pt;margin:0 0 2pt;letter-spacing:1px}
.c{text-align:center}
h2{font-size:12pt;text-transform:uppercase;border-bottom:1px solid #000;margin:14pt 0 5pt;padding-bottom:1pt}
.row{display:flex;justify-content:space-between}
ul{margin:2pt 0 7pt;padding-left:18pt}
li{margin-bottom:2pt}
</style>
<h1>${d.personal.fullName.toUpperCase()}</h1>
<div class="c">${d.personal.jobTitle}</div>
<div class="c">${d.personal.email} • ${d.personal.phone} • ${d.personal.location}</div>
<div class="c">${d.personal.linkedin}</div>
${d.sections
  .map((s) => {
    let body = ''
    if (s.type === 'experience' || s.type === 'education') {
      body = s.items
        .map(
          (e) => `<div class="row"><b>${e.subtitle}</b><span>${e.location}</span></div>
<div class="row"><i>${e.title}</i><span>${when(e)}</span></div>
${e.description.startsWith('- ') ? `<ul>${li(e.description)}</ul>` : e.description ? `<p style="margin:2pt 0 6pt">${e.description}</p>` : ''}`,
        )
        .join('')
    }
    if (s.type === 'skills') body = `<p>${s.items.map((t) => t.name).join(', ')}</p>`
    if (s.type === 'languages') body = `<p>German (Native), English (Fluent), French (Basic)</p>`
    return `<h2>${s.title}</h2>${body}`
  })
  .join('')}`

// ---------------------------------------------------------------------------------------------
// H: a timeline layout. The dates sit in their own narrow column on the left, details on the right. A hard
//    case for any text-based importer: the dates and the text they belong to are in different columns.
const personH = {
  personal: {
    fullName: 'Marcus Bell',
    jobTitle: 'Sales Director',
    email: 'marcus.bell@example.com',
    phone: '+1 (312) 555-0178',
    location: 'Chicago, IL',
    website: '',
    linkedin: 'linkedin.com/in/marcusbell',
  },
  sections: [
    {
      type: 'experience',
      title: 'Experience',
      items: [
        entry({
          title: 'Sales Director',
          subtitle: 'Lakeshore Equipment Co.',
          startDate: '2019-04',
          current: true,
          description: bullets(
            'Grew regional revenue from 4M to 9M USD in three years',
            'Built a sales team of twelve from scratch',
          ),
        }),
        entry({
          title: 'Account Executive',
          subtitle: 'Prairie Software',
          startDate: '2014-02',
          endDate: '2019-03',
          description: bullets(
            'Closed the largest contract in company history',
            'Ranked first in sales for four years running',
          ),
        }),
      ],
    },
    {
      type: 'education',
      title: 'Education',
      items: [
        entry({
          title: 'BBA Marketing',
          subtitle: 'Midwest State University',
          startDate: '2010-09',
          endDate: '2014-05',
        }),
      ],
    },
    {
      type: 'skills',
      title: 'Skills',
      items: ['Negotiation', 'Forecasting', 'Salesforce', 'Coaching'].map((n) => tag(n)),
    },
  ],
}

const pageH = (d) => `<!doctype html><meta charset="utf-8"><style>
@page{size:A4;margin:16mm 18mm}
body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.35;margin:0}
h1{font-size:26pt;margin:0}
.sub{color:#444;margin:2pt 0 6pt}
h2{font-size:11pt;letter-spacing:2px;text-transform:uppercase;margin:16pt 0 6pt;border-bottom:2px solid #333}
table{width:100%;border-collapse:collapse}
td{vertical-align:top;padding:0 0 9pt}
td.when{width:26%;color:#555;font-size:9pt}
ul{margin:3pt 0 0;padding-left:15pt}
</style>
<h1>${d.personal.fullName}</h1><div class="sub">${d.personal.jobTitle}</div>
<div>${d.personal.email} &nbsp;|&nbsp; ${d.personal.phone} &nbsp;|&nbsp; ${d.personal.location} &nbsp;|&nbsp; ${d.personal.linkedin}</div>
${d.sections
  .map((s) => {
    let body = ''
    if (s.type === 'experience' || s.type === 'education') {
      body = `<table>${s.items
        .map(
          (e) =>
            `<tr><td class="when">${when(e)}</td><td><b>${e.title}</b><br>${e.subtitle}${e.description ? `<ul>${li(e.description)}</ul>` : ''}</td></tr>`,
        )
        .join('')}</table>`
    }
    if (s.type === 'skills') body = `<p>${s.items.map((t) => t.name).join(' • ')}</p>`
    return `<h2>${s.title}</h2>${body}`
  })
  .join('')}`

const pdfFixtures = [
  ['person-g', personG, pageG],
  ['person-h', personH, pageH],
]

export async function buildPdfFixtures(dir, pdfBrowser) {
  const written = []
  for (const [name, data, page] of pdfFixtures) {
    const html = join(dir, `${name}.html`)
    writeFileSync(html, page(data))
    await pdfBrowser.printToPdf(
      pathToFileURL(html).href,
      join(dir, `${name}.pdf`),
      "document.readyState === 'complete'",
    )
    rmSync(html)
    writeFileSync(
      join(dir, `${name}.expected.json`),
      JSON.stringify(
        { personal: data.personal, sections: data.sections.map((s) => ({ ...s, items: s.items ?? [] })) },
        null,
        2,
      ) + '\n',
    )
    written.push({ file: `${name}.pdf`, expected: `${name}.expected.json`, dateFormat: 'MMM YYYY' })
  }
  return written
}
