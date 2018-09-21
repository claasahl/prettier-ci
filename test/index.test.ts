// You can import your modules
// import index from '../src/index'
import { Application } from 'probot'
import myProbotApp from '../src/index'
import * as gh from "@octokit/rest";

import checkSuiteRequestedEvent from "./events/check_suite/requested.json"
import checkSuiteRerequestedEvent from "./events/check_suite/rerequested.json"
import checkRunRerequestedEvent from "./events/check_run/rerequested.json"
import { CHECKS_NAME } from '../src/utils';

describe('tests conditions for triggering a file-analysis', () => {
  let app, github

  beforeEach(() => {
    app = new Application()
    // Initialize the app based on the code from index.js
    app.load(myProbotApp)
    // This is an easy way to mock out the GitHub API
    github = {
      checks: {
        create: jest.fn().mockReturnValue(Promise.resolve({})),
        update: jest.fn().mockReturnValue(Promise.resolve({}))
      }
    }
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github)
  })

  test('creates check when check_suite is requested', async () => {
    await app.receive(checkSuiteRequestedEvent)

    const params: gh.ChecksCreateParams = { owner: "claasahl", repo: "prettiest-bot", name: CHECKS_NAME, head_sha: "39a53e909e101414ee8880321bf0079e4dd7d767" };
    expect(github.checks.create).toHaveBeenCalledWith(params)
  })

  test('creates check when check_suite is rerequested', async () => {
    await app.receive(checkSuiteRerequestedEvent)

    const params: gh.ChecksCreateParams = { owner: "claasahl", repo: "prettiest-bot", name: CHECKS_NAME, head_sha: "bb4d2ed9702c4c4340db50f74fc451657fe48e57" };
    expect(github.checks.create).toHaveBeenCalledWith(params)
  })

  test('creates check when check_run is rerequested', async () => {
    await app.receive(checkRunRerequestedEvent)

    const params: gh.ChecksCreateParams = { owner: "claasahl", repo: "prettiest-bot", name: CHECKS_NAME, head_sha: "fad5b3a8a9602fd31279d8c707e5a0de3c4cd640" };
    expect(github.checks.create).toHaveBeenCalledWith(params)
  })
})

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with probot:
// https://probot.github.io/docs/testing/
