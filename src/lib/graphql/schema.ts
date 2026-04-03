export const typeDefs = /* GraphQL */ `
  enum TrackingStatus {
    ACTIVE
    INACTIVE
    PENDING
  }

  enum AccountType {
    GITHUB
    JIRA
    PAGERDUTY
    CALENDAR
  }

  type Account {
    type: AccountType!
    handle: String!
    connected: Boolean!
  }

  type Team {
    id: ID!
    name: String!
  }

  type Developer {
    id: ID!
    name: String!
    email: String!
    avatar: String!
    title: String!
    department: String!
    hiredAt: String!
    teams: [Team!]!
    trackingStatus: TrackingStatus!
    accounts: [Account!]!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type DeveloperEdge {
    node: Developer!
    cursor: String!
  }

  type DevelopersConnection {
    edges: [DeveloperEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type Query {
    developers(
      first: Int
      after: String
      search: String
      team: String
      trackingStatus: TrackingStatus
      accountType: AccountType
    ): DevelopersConnection!
    developer(id: ID!): Developer
    teams: [Team!]!
  }
`
