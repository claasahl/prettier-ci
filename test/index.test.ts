import { Application } from 'probot'
// Requiring our app implementation
import myProbotApp from '../src'

import checkSuiteRequested from './fixtures/events/check_suite.requested.json';

describe('My Probot app', () => {
  let app: Application
  let github: any

  beforeEach(() => {
    app = new Application()
    // Initialize the app based on the code from index.ts
    app.load(myProbotApp)
    // This is an easy way to mock out the GitHub API
    github = {
      checks: {
        create: jest.fn().mockResolvedValue(0),
      }
    }
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github)
  })

  test('creates a comment when an issue is opened', async () => {
    // Simulates delivery of an issues.opened webhook
    await app.receive({
      name: 'check_suite.requested',
      payload: checkSuiteRequested
    })

    // This test passes if the code in your index.ts file calls `context.github.issues.createComment`
    expect(github.checks.create).toHaveBeenCalled()
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/
