// You can import your modules
// import index from '../src/index'
import { Application, Context } from 'probot'
import myProbotApp from '../src/index'
import * as gh from "@octokit/rest";
import { advanceTo } from 'jest-date-mock';

import checkSuiteRequestedEvent from "./events/check_suite/requested.json"
import checkSuiteRerequestedEvent from "./events/check_suite/rerequested.json"
import checkRunRerequestedEvent from "./events/check_run/rerequested.json"
import checkRunRequestedActionEvent from "./events/check_run/requested_action.json"
import checkRunCreatedEvent from "./events/check_run/created.json"

import reposCompareCommits_200 from "./responses/repos/compareCommits__200.json"
import reposgetContent_200 from "./responses/repos/getContent__200.json"
import reposUpdateFile_200 from "./responses/repos/updateFile__200.json"
import gitdataCreateReference_201 from "./responses/gitdata/createReference__201.json"
import pullRequestsCreate_201 from "./responses/pullRequests/create__201.json"
import pullRequestsMerge_200 from "./responses/pullRequests/merge__200.json"

import template from './templates/pullRequest';
import * as fs from 'fs';
import * as prettier from "prettier"
import { DEFAULT_CONFIG } from '../src/defaultConfig';

describe('tests conditions for triggering a file-analysis', () => {
  let app, github

  beforeEach(() => {
    app = new Application()
    // Initialize the app based on the code from index.js
    app.load(myProbotApp)
    // This is an easy way to mock out the GitHub API
    github = {
      checks: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({})
      }
    }
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github)
    // Ensures that a valid configuration is available in our app instance
    Context.prototype.config = jest.fn().mockResolvedValue(DEFAULT_CONFIG)
  })

  test('creates check when check_suite is requested', async () => {
    await app.receive(checkSuiteRequestedEvent)

    const params: gh.ChecksCreateParams = { owner: "claasahl", repo: "prettier-ci", name: DEFAULT_CONFIG.checks.name, head_sha: "39a53e909e101414ee8880321bf0079e4dd7d767" };
    expect(github.checks.create).toHaveBeenCalledWith(params)
  })

  test('creates check when check_suite is rerequested', async () => {
    await app.receive(checkSuiteRerequestedEvent)

    const params: gh.ChecksCreateParams = { owner: "claasahl", repo: "prettier-ci", name: DEFAULT_CONFIG.checks.name, head_sha: "bb4d2ed9702c4c4340db50f74fc451657fe48e57" };
    expect(github.checks.create).toHaveBeenCalledWith(params)
  })

  test('creates check when check_run is rerequested', async () => {
    await app.receive(checkRunRerequestedEvent)

    const params: gh.ChecksCreateParams = { owner: "claasahl", repo: "prettier-ci", name: DEFAULT_CONFIG.checks.name, head_sha: "fad5b3a8a9602fd31279d8c707e5a0de3c4cd640" };
    expect(github.checks.create).toHaveBeenCalledWith(params)
  })
})

describe('tests for file-analysis (check_run) in a large repository', () => {
  let app, github, event

  beforeEach(() => {
    // make repository appear large
    event = {...checkRunCreatedEvent}
    event.payload.repository.size = 9999999

    app = new Application()
    // Initialize the app based on the code from index.js
    app.load(myProbotApp)
    // This is an easy way to mock out the GitHub API
    github = {
      checks: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({})
      },
      repos: {
        compareCommits: jest.fn().mockResolvedValue(reposCompareCommits_200),
        getContent: jest.fn().mockResolvedValue(reposgetContent_200)
      }
    }
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github)
  })

  test('mark check as "in_progress" when check_run is created', async () => {
    await app.receive(event)

    const params: gh.ChecksUpdateParams = { owner: "claasahl", repo: "prettier-ci", check_run_id: "15222485", status: "in_progress"};
    expect(github.checks.update).toHaveBeenCalledWith(params)
  })

  test('compares before/after commits for check_run', async () => {
    await app.receive(event)

    const params: gh.ReposCompareCommitsParams = { owner: "claasahl", repo: "prettier-ci", base: "923547128e3e9fe26c4192bb45fcf125dae92c4b", head: "52c67357a6b1858226c131d13d7d44e8303fd426"};
    expect(github.repos.compareCommits).toHaveBeenCalledWith(params)
  })

  test('retrieves contents for file-version for check_run', async () => {
    await app.receive(event)

    // TODO app.receive already completes when the event has been received, but not when then event has been processed
    await new Promise(resolve => setTimeout(resolve, 2000))

    let params: gh.ReposGetContentParams = { owner: "claasahl", repo: "prettier-ci", path: "test/utils.test.ts", ref: "52c67357a6b1858226c131d13d7d44e8303fd426"};
    expect(github.repos.getContent).toHaveBeenCalledWith(params)

    params = { owner: "claasahl", repo: "prettier-ci", path: "some.file", ref: "52c67357a6b1858226c131d13d7d44e8303fd426"};
    expect(github.repos.getContent).not.toHaveBeenCalledWith(params)
  })

  test('completes file-analysis with correct conclusion (success)', async () => {
    advanceTo(new Date(2018, 5, 27, 0, 0, 0));
    await app.receive(event)

    // TODO app.receive already completes when the event has been received, but not when then event has been processed
    await new Promise(resolve => setTimeout(resolve, 2000))

    const params: gh.ChecksUpdateParams = { owner: "claasahl", repo: "prettier-ci", check_run_id: "15222485", status: "completed", conclusion: "success", output: {summary: "Pretty. Keep up the **good work**.", title: DEFAULT_CONFIG.checks.output.title, text: ""}, actions: [], completed_at: new Date().toISOString()};
    expect(github.checks.update).toHaveBeenLastCalledWith(params)
  })

  test('completes file-analysis with correct conclusion (failure)', async () => {
    github.repos.compareCommits = jest.fn().mockImplementation(mockReposCompareCommits("./test/templates/unformatted.ts", "./test/templates/unformatted.json"))
    github.repos.getContent = jest.fn().mockImplementation(mockReposGetContentUnformatted)
    advanceTo(new Date(2018, 5, 27, 0, 0, 0));
    await app.receive(event)

    // TODO app.receive already completes when the event has been received, but not when then event has been processed
    await new Promise(resolve => setTimeout(resolve, 2000))

    const text = `Here is a list of files which be *prettier*.
* ./test/templates/unformatted.ts
* ./test/templates/unformatted.json`
    const params: gh.ChecksUpdateParams = { owner: "claasahl", repo: "prettier-ci", check_run_id: "15222485", status: "completed", conclusion: "failure", output: {summary: "Found 2 files which could be *prettier*", title: DEFAULT_CONFIG.checks.output.title, text}, actions: [{identifier: "fix", label: "Fix", description: "Make files *prettier*."}], completed_at: new Date().toISOString()};
    expect(github.checks.update).toHaveBeenLastCalledWith(params)
  })
})

describe("test for pull request (fix of errors in check_run)", () => {
  let app, github

  beforeEach(() => {
    app = new Application()
    // Initialize the app based on the code from index.js
    app.load(myProbotApp)
    // This is an easy way to mock out the GitHub API
    github = {
      repos: {
        compareCommits: jest.fn().mockImplementation(mockReposCompareCommits("./test/templates/unformatted.json")),
        getContent: jest.fn().mockImplementation(mockReposGetContentFormatted),
        updateFile: jest.fn().mockResolvedValue(reposUpdateFile_200)
      },
      gitdata: {
        createReference: jest.fn().mockResolvedValue(gitdataCreateReference_201)
      },
      pullRequests: {
        create: jest.fn().mockResolvedValue(pullRequestsCreate_201),
        merge: jest.fn().mockResolvedValue(pullRequestsMerge_200)
      }
    }
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github)
  })

  test("'fix' action should create branch", async () => {
    await app.receive(checkRunRequestedActionEvent)

    const params: gh.GitdataCreateReferenceParams = {owner: "claasahl", repo: "prettier-ci", ref: "refs/heads/prettier/develop", sha: "bb4d2ed9702c4c4340db50f74fc451657fe48e57"}
    expect(github.gitdata.createReference).toHaveBeenCalledWith(params)
  })

  test('compares before/after commits for relevant check_run', async () => {
    await app.receive(checkRunRequestedActionEvent)

    const params: gh.ReposCompareCommitsParams = { owner: "claasahl", repo: "prettier-ci", base: "a137828f79b51c516391b0d125b8df492fdfb3ce", head: "bb4d2ed9702c4c4340db50f74fc451657fe48e57"};
    expect(github.repos.compareCommits).toHaveBeenCalledWith(params)
  })

  test('retrieves contents for file-version for relevant check_run', async () => {
    await app.receive(checkRunRequestedActionEvent)

    const params: gh.ReposGetContentParams = { owner: "claasahl", repo: "prettier-ci", path: "./test/templates/unformatted.json", ref: "refs/heads/prettier/develop"};
    expect(github.repos.getContent).toHaveBeenCalledWith(params)
  })

  test('create pull request for fixed file (singular)', async () => {
    github.repos.getContent = jest.fn().mockImplementation(mockReposGetContentUnformatted)
    await app.receive(checkRunRequestedActionEvent)

    const body = template("https://github.com/claasahl/prettier-ci/runs/16344324", 1, "claasahl")
    const params: gh.PullRequestsCreateParams = { owner: "claasahl", repo: "prettier-ci", base: "develop", head: "refs/heads/prettier/develop", title: "Prettified branch: 'develop'", maintainer_can_modify: DEFAULT_CONFIG.pullRequests.maintainer_can_modify, body};
    expect(github.pullRequests.create).toHaveBeenCalledWith(params)
  })

  test('create pull request for fixed files (plural)', async () => {
    github.repos.compareCommits = jest.fn().mockImplementation(mockReposCompareCommits("./test/templates/unformatted.ts", "./test/templates/unformatted.json"))
    github.repos.getContent = jest.fn().mockImplementation(mockReposGetContentUnformatted)
    await app.receive(checkRunRequestedActionEvent)

    const body = template("https://github.com/claasahl/prettier-ci/runs/16344324", 2, "claasahl")
    const params: gh.PullRequestsCreateParams = { owner: "claasahl", repo: "prettier-ci", base: "develop", head: "refs/heads/prettier/develop", title: "Prettified branch: 'develop'", maintainer_can_modify: DEFAULT_CONFIG.pullRequests.maintainer_can_modify, body};
    expect(github.pullRequests.create).toHaveBeenCalledWith(params)
  })

  test('create "empty" pull request when no files need fixing', async () => {
    await app.receive(checkRunRequestedActionEvent)

    const body = template("https://github.com/claasahl/prettier-ci/runs/16344324", 0, "claasahl")
    const params: gh.PullRequestsCreateParams = { owner: "claasahl", repo: "prettier-ci", base: "develop", head: "refs/heads/prettier/develop", title: "Prettified branch: 'develop'", maintainer_can_modify: DEFAULT_CONFIG.pullRequests.maintainer_can_modify, body};
    expect(github.pullRequests.create).toHaveBeenCalledWith(params)
  })

  test('format and update files that need fixing', async () => {
    github.repos.compareCommits = jest.fn().mockImplementation(mockReposCompareCommits("./test/templates/unformatted.ts", "./test/templates/unformatted.json"))
    github.repos.getContent = jest.fn().mockImplementation(mockReposGetContentUnformatted)
    await app.receive(checkRunRequestedActionEvent)

    let content = btoa(prettier.format(fs.readFileSync("./test/templates/unformatted.ts").toString(), {filepath: "./test/templates/unformatted.ts"}))
    let params: gh.ReposUpdateFileParams = { owner: "claasahl", repo: "prettier-ci", message: "formatted file: ./test/templates/unformatted.ts", path: "./test/templates/unformatted.ts", branch: "refs/heads/prettier/develop", sha: "7d6e8ee3e4c26b6d5d305fa3fe985ddf7c0f87ea", content};
    expect(github.repos.updateFile).toHaveBeenCalledWith(params)

    content = btoa(prettier.format(fs.readFileSync("./test/templates/unformatted.json").toString(), {filepath: "./test/templates/unformatted.json"}))
    params = { owner: "claasahl", repo: "prettier-ci", message: "formatted file: ./test/templates/unformatted.json", path: "./test/templates/unformatted.json", branch: "refs/heads/prettier/develop", sha: "7d6e8ee3e4c26b6d5d305fa3fe985ddf7c0f87ea", content};
    expect(github.repos.updateFile).toHaveBeenCalledWith(params)
  })

  test('automatically attempt to merge pull request', async () => {
    github.repos.compareCommits = jest.fn().mockImplementation(mockReposCompareCommits("./test/templates/unformatted.ts", "./test/templates/unformatted.json"))
    github.repos.getContent = jest.fn().mockImplementation(mockReposGetContentUnformatted)
    await app.receive(checkRunRequestedActionEvent)

    const params: gh.PullRequestsMergeParams = { owner: "claasahl", repo: "prettier-ci", number: 3};
    expect(github.pullRequests.merge).toHaveBeenCalledWith(params)
  })
})

function mockReposCompareCommits(...files: string[]) {
  return async () => {
    const base = reposCompareCommits_200;
    base.data.files = files.map(file => ({filename: file, status: "modified"}))
    return base
  }
}

async function mockReposGetContentFormatted(params: gh.ReposGetContentParams) {
  const base = reposgetContent_200;
  const unformatted = fs.readFileSync(params.path).toString()
  const formatted = prettier.format(unformatted, {filepath: params.path})
  base.data.name = params.path
  base.data.path = params.path
  base.data.content = btoa(formatted)
  return base
}

async function mockReposGetContentUnformatted(params: gh.ReposGetContentParams) {
  const base = reposgetContent_200;
  const unformatted = fs.readFileSync(params.path).toString()
  base.data.name = params.path
  base.data.path = params.path
  base.data.content = btoa(unformatted)
  return base
}

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with probot:
// https://probot.github.io/docs/testing/
