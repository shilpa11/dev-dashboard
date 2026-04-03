import { Faker, en, base } from '@faker-js/faker'

export type TrackingStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING'
export type AccountType = 'GITHUB' | 'JIRA' | 'PAGERDUTY' | 'CALENDAR'

export interface Account {
  type: AccountType
  handle: string
  connected: boolean
}

export interface Team {
  id: string
  name: string
}

export interface Developer {
  id: string
  name: string
  email: string
  avatar: string
  title: string
  department: string
  hiredAt: string
  teams: Team[]
  trackingStatus: TrackingStatus
  accounts: Account[]
}

const TEAM_NAMES = [
  'Platform',
  'Frontend',
  'Backend',
  'Infrastructure',
  'Data',
  'Security',
  'Mobile',
  'Growth',
  'Developer Experience',
  'AI/ML',
]

const TITLES = [
  'Software Engineer I',
  'Software Engineer II',
  'Senior Software Engineer',
  'Staff Software Engineer',
  'Principal Software Engineer',
  'Engineering Manager',
  'Senior Engineering Manager',
  'Director of Engineering',
]

const DEPARTMENTS = [
  'Engineering',
  'Platform Engineering',
  'Product Engineering',
  'Infrastructure',
]

const TRACKING_STATUSES: TrackingStatus[] = ['ACTIVE', 'INACTIVE', 'PENDING']
const ACCOUNT_TYPES: AccountType[] = ['GITHUB', 'JIRA', 'PAGERDUTY', 'CALENDAR']

function generateTeams(faker: Faker): Team[] {
  const count = faker.number.int({ min: 1, max: 3 })
  const selected = faker.helpers.arrayElements(TEAM_NAMES, count)
  return selected.map((name) => ({
    id: faker.helpers.slugify(name.toLowerCase()),
    name,
  }))
}

function generateAccounts(faker: Faker, name: string): Account[] {
  return ACCOUNT_TYPES.map((type) => {
    const connected = faker.datatype.boolean({ probability: 0.8 })
    let handle = ''
    switch (type) {
      case 'GITHUB':
        handle = faker.internet.username({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] }).toLowerCase()
        break
      case 'JIRA':
        handle = faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] }).toLowerCase()
        break
      case 'PAGERDUTY':
        handle = faker.internet.email({ firstName: name.split(' ')[0] }).toLowerCase()
        break
      case 'CALENDAR':
        handle = faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] }).toLowerCase()
        break
    }
    return { type, handle, connected }
  })
}

function generateDeveloper(faker: Faker, index: number): Developer {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const name = `${firstName} ${lastName}`
  const email = faker.internet.email({ firstName, lastName }).toLowerCase()

  return {
    id: `dev-${String(index + 1).padStart(3, '0')}`,
    name,
    email,
    avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
    title: faker.helpers.arrayElement(TITLES),
    department: faker.helpers.arrayElement(DEPARTMENTS),
    hiredAt: faker.date.between({ from: '2018-01-01', to: '2024-06-01' }).toISOString(),
    teams: generateTeams(faker),
    trackingStatus: faker.helpers.weightedArrayElement([
      { value: 'ACTIVE' as TrackingStatus, weight: 70 },
      { value: 'INACTIVE' as TrackingStatus, weight: 15 },
      { value: 'PENDING' as TrackingStatus, weight: 15 },
    ]),
    accounts: generateAccounts(faker, name),
  }
}

let _developers: Developer[] | null = null

export function getAllDevelopers(): Developer[] {
  if (_developers) return _developers

  const faker = new Faker({ locale: [en, base] })
  faker.seed(42) // deterministic

  _developers = Array.from({ length: 60 }, (_, i) => generateDeveloper(faker, i))
  return _developers
}

export function getAllTeams(): Team[] {
  return TEAM_NAMES.map((name) => ({
    id: slugify(name),
    name,
  }))
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
