import { mocked } from 'ts-jest/utils';
import { Application } from 'probot'
// Requiring our app implementation
import myProbotApp from '../src'
import * as CheckSuite from "../src/events/check_suite";

import checkSuiteRequested from './fixtures/events/check_suite.requested.json';
import checkSuiteRerequested from './fixtures/events/check_suite.rerequested.json';

jest.mock("../src/events/check_suite")
const mockedCheckSuite = mocked(CheckSuite)

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
    app.auth = () => Promise.resolve(github);
  })

  test("forward 'check_suite.requested'", async () => {
    await app.receive({
      name: 'check_suite.requested',
      payload: checkSuiteRequested
    })

    expect(mockedCheckSuite.requested).toHaveBeenCalledTimes(1)
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/
