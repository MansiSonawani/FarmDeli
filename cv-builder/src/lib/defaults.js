import { uid } from './id'

// Every section has a `kind` that decides how it is edited and rendered:
//   text    – one rich-text block (profile / summary)
//   entries – a list of dated entries (experience, education, ...)
//   tags    – a list of short items with an optional level (skills, languages, ...)
export const SECTION_TYPES = {
  summary: {
    label: 'Profile',
    kind: 'text',
    column: 'main',
    placeholder: 'Two or three sentences about who you are and what you are great at.',
  },
  experience: {
    itemLabel: 'position',
    label: 'Professional Experience',
    kind: 'entries',
    column: 'main',
    fields: { title: 'Job title', subtitle: 'Employer', location: 'City, Country' },
    dates: true,
  },
  education: {
    itemLabel: 'education',
    label: 'Education',
    kind: 'entries',
    column: 'main',
    fields: { title: 'Degree', subtitle: 'School', location: 'City, Country' },
    dates: true,
  },
  projects: {
    itemLabel: 'project',
    label: 'Projects',
    kind: 'entries',
    column: 'main',
    fields: { title: 'Project name', subtitle: 'Role or technology', link: 'Link' },
    dates: true,
  },
  certificates: {
    itemLabel: 'certificate',
    label: 'Certificates',
    kind: 'entries',
    column: 'side',
    fields: { title: 'Certificate', subtitle: 'Issuer' },
    dates: true,
  },
  awards: {
    itemLabel: 'award',
    label: 'Awards',
    kind: 'entries',
    column: 'side',
    fields: { title: 'Award', subtitle: 'Issuer' },
    dates: true,
  },
  volunteering: {
    itemLabel: 'role',
    label: 'Volunteering',
    kind: 'entries',
    column: 'main',
    fields: { title: 'Role', subtitle: 'Organisation', location: 'City, Country' },
    dates: true,
  },
  skills: {
    itemLabel: 'skill',
    label: 'Skills',
    kind: 'tags',
    column: 'side',
    fields: { name: 'Skill', info: 'Details (optional)' },
    levels: ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert'],
  },
  languages: {
    itemLabel: 'language',
    label: 'Languages',
    kind: 'tags',
    column: 'side',
    fields: { name: 'Language', info: 'Details (optional)' },
    levels: ['', 'Basic', 'Conversational', 'Fluent', 'Native'],
  },
  interests: {
    itemLabel: 'interest',
    label: 'Interests',
    kind: 'tags',
    column: 'side',
    fields: { name: 'Interest', info: 'Details (optional)' },
    levels: null,
  },
  custom: {
    itemLabel: 'entry',
    label: 'Custom Section',
    kind: 'entries',
    column: 'main',
    fields: { title: 'Title', subtitle: 'Subtitle', location: 'Location', link: 'Link' },
    dates: true,
  },
}

export const DEFAULT_STYLE = {
  template: 'classic',
  pageSize: 'A4',
  layout: 'one', // one | left | right   (left/right = sidebar position)
  sidebarWidth: 34, // % of the inner page width
  colorMode: 'accent', // accent | sidebar | header
  accentColor: '#1d4ed8',
  fontFamily: 'Inter',
  headingFontFamily: 'Inter',
  fontSize: 9.5, // pt
  lineHeight: 1.4,
  margin: 14, // mm
  columnGap: 8, // mm
  sectionGap: 5, // mm
  entryGap: 3, // mm
  headerAlign: 'left', // left | center
  nameSize: 24, // pt
  showPhoto: true,
  photoShape: 'circle', // circle | rounded | square
  headingStyle: 'underline', // underline | plain | bar | box
  headingUppercase: true,
  dateFormat: 'MMM YYYY', // MMM YYYY | MM/YYYY | YYYY
  showIcons: true,
  tagStyle: 'pills', // pills | list | bars | comma
}

export function newEntry() {
  return {
    id: uid(),
    title: '',
    subtitle: '',
    location: '',
    link: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
  }
}

export function newTag() {
  return { id: uid(), name: '', info: '', level: 0 }
}

export function newSection(type) {
  const def = SECTION_TYPES[type]
  return {
    id: uid(),
    type,
    title: def.label,
    visible: true,
    column: def.column,
    content: '',
    items: def.kind === 'entries' ? [newEntry()] : def.kind === 'tags' ? [newTag()] : [],
  }
}

export function emptyResume(email = '') {
  return {
    personal: {
      fullName: '',
      jobTitle: '',
      email,
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      photo: '',
    },
    sections: ['summary', 'experience', 'education', 'skills', 'languages'].map(newSection),
  }
}

// Fictional example content used for the "start with an example" option and
// for template thumbnails.
export function sampleResume() {
  const section = (type, extra) => ({ ...newSection(type), ...extra })
  return {
    personal: {
      fullName: 'Maya Lindqvist',
      jobTitle: 'Senior Product Designer',
      email: 'maya.lindqvist@example.com',
      phone: '+46 70 123 45 67',
      location: 'Stockholm, Sweden',
      website: 'mayalindqvist.design',
      linkedin: 'linkedin.com/in/mayalindqvist',
      photo: '',
    },
    sections: [
      section('summary', {
        content:
          'Product designer with 8+ years of experience shaping B2B and consumer products from first sketch to launch. I turn messy problems into calm, usable interfaces and love working closely with engineers and researchers.',
      }),
      section('experience', {
        items: [
          {
            ...newEntry(),
            title: 'Senior Product Designer',
            subtitle: 'Northwind Logistics',
            location: 'Stockholm',
            startDate: '2021-03',
            current: true,
            description:
              '- Led the redesign of the shipment tracking app used by **40,000** drivers, cutting support tickets by 32%\n- Built and maintained a design system of 120+ components shared by four product teams\n- Mentored three junior designers and introduced weekly design critiques',
          },
          {
            ...newEntry(),
            title: 'Product Designer',
            subtitle: 'Brightleaf Studio',
            location: 'Gothenburg',
            startDate: '2018-01',
            endDate: '2021-02',
            description:
              '- Designed onboarding flows for a fintech client that lifted activation from 41% to 58%\n- Ran 60+ usability sessions and turned findings into prioritised product roadmaps',
          },
          {
            ...newEntry(),
            title: 'UX Designer',
            subtitle: 'Fjord Media',
            location: 'Uppsala',
            startDate: '2016-06',
            endDate: '2017-12',
            description:
              '- Created wireframes and prototypes for editorial tools used by 200 journalists\n- Introduced accessibility reviews into the release checklist',
          },
        ],
      }),
      section('education', {
        items: [
          {
            ...newEntry(),
            title: 'MSc Interaction Design',
            subtitle: 'Chalmers University of Technology',
            location: 'Gothenburg',
            startDate: '2014-09',
            endDate: '2016-06',
            description: 'Thesis on trust signals in delivery-tracking interfaces.',
          },
          {
            ...newEntry(),
            title: 'BSc Media Technology',
            subtitle: 'Linköping University',
            location: 'Norrköping',
            startDate: '2011-09',
            endDate: '2014-06',
          },
        ],
      }),
      section('projects', {
        items: [
          {
            ...newEntry(),
            title: 'Open Tokens',
            subtitle: 'Open-source design token toolkit',
            link: 'github.com/mayal/open-tokens',
            startDate: '2022',
            description: 'Small CLI that syncs design tokens between Figma and code; 1.2k stars.',
          },
        ],
      }),
      section('skills', {
        items: [
          ['Product strategy', 4],
          ['Interaction design', 4],
          ['Design systems', 4],
          ['Prototyping', 3],
          ['User research', 3],
          ['HTML & CSS', 2],
        ].map(([name, level]) => ({ ...newTag(), name, level })),
      }),
      section('languages', {
        items: [
          ['Swedish', 4],
          ['English', 3],
          ['German', 1],
        ].map(([name, level]) => ({ ...newTag(), name, level })),
      }),
      section('certificates', {
        items: [
          {
            ...newEntry(),
            title: 'Certified Usability Analyst',
            subtitle: 'Human Factors International',
            startDate: '2019',
          },
        ],
      }),
      section('interests', {
        items: ['Trail running', 'Ceramics', 'Board games'].map((name) => ({ ...newTag(), name })),
      }),
    ],
  }
}
