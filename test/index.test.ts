// You can import your modules
// import index from '../src/index'
import { Application } from 'probot'
import myProbotApp from '../src/index'
import * as gh from "@octokit/rest";
import { advanceBy, advanceTo } from 'jest-date-mock';

import checkSuiteRequestedEvent from "./events/check_suite/requested.json"
import checkSuiteRerequestedEvent from "./events/check_suite/rerequested.json"
import checkRunRerequestedEvent from "./events/check_run/rerequested.json"
import checkRunRequestedActionEvent from "./events/check_run/requested_action.json"
import checkRunCreatedEvent from "./events/check_run/created.json"

import reposCompareCommits_200 from "./responses/repos/compareCommits__200.json"
import reposgetContent_200 from "./responses/repos/getContent__200.json"
import reposgetContent_200_unformatted from "./responses/repos/getContent__200__unformatted.json"
import reposUpdateFile_200 from "./responses/repos/updateFile__200.json"
import gitdataCreateReference_201 from "./responses/gitdata/createReference__201.json"
import pullRequestsCreate_201 from "./responses/pullRequests/create__201.json"

import { CHECKS_NAME } from '../src/utils';
import template from './templates/pullRequest';

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

describe('tests for file-analysis (check_run)', () => {
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
    await app.receive(checkRunCreatedEvent)

    const params: gh.ChecksUpdateParams = { owner: "claasahl", repo: "prettiest-bot", check_run_id: "15222485", status: "in_progress"};
    expect(github.checks.update).toHaveBeenCalledWith(params)
  })

  test('compares before/after commits for check_run', async () => {
    await app.receive(checkRunCreatedEvent)

    const params: gh.ReposCompareCommitsParams = { owner: "claasahl", repo: "prettiest-bot", base: "923547128e3e9fe26c4192bb45fcf125dae92c4b", head: "52c67357a6b1858226c131d13d7d44e8303fd426"};
    expect(github.repos.compareCommits).toHaveBeenCalledWith(params)
  })

  test('retrieves contents for file-version for check_run', async () => {
    await app.receive(checkRunCreatedEvent)

    // TODO app.receive already completes when the event has been received, but not when then event has been processed
    await new Promise(resolve => setTimeout(resolve, 2000))

    const params: gh.ReposGetContentParams = { owner: "claasahl", repo: "prettiest-bot", path: "test/utils.test.ts", ref: "52c67357a6b1858226c131d13d7d44e8303fd426"};
    expect(github.repos.getContent).toHaveBeenCalledWith(params)
  })

  test('completes file-analysis with correct conclusion', async () => {
    advanceTo(new Date(2018, 5, 27, 0, 0, 0));
    await app.receive(checkRunCreatedEvent)

    // TODO app.receive already completes when the event has been received, but not when then event has been processed
    await new Promise(resolve => setTimeout(resolve, 2000))

    const params: gh.ChecksUpdateParams = { owner: "claasahl", repo: "prettiest-bot", check_run_id: "15222485", status: "completed", conclusion: "success", output: {summary: "Pretty. Keep up the **good work**.", title: "Prettier", text: undefined}, actions: [], completed_at: new Date().toISOString()};
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
        compareCommits: jest.fn().mockResolvedValue(reposCompareCommits_200),
        getContent: jest.fn().mockResolvedValue(reposgetContent_200),
        updateFile: jest.fn().mockResolvedValue(reposUpdateFile_200)
      },
      gitdata: {
        createReference: jest.fn().mockResolvedValue(gitdataCreateReference_201)
      },
      pullRequests: {
        create: jest.fn().mockResolvedValue(pullRequestsCreate_201)
      }
    }
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github)
  })

  test("'fix' action should create branch", async () => {
    await app.receive(checkRunRequestedActionEvent)

    const params: gh.GitdataCreateReferenceParams = {owner: "claasahl", repo: "prettiest-bot", ref: "refs/heads/prettier/develop", sha: "develop"}
    expect(github.gitdata.createReference).toHaveBeenCalledWith(params)
  })

  test('compares before/after commits for relevant check_run', async () => {
    await app.receive(checkRunRequestedActionEvent)

    const params: gh.ReposCompareCommitsParams = { owner: "claasahl", repo: "prettiest-bot", base: "a137828f79b51c516391b0d125b8df492fdfb3ce", head: "bb4d2ed9702c4c4340db50f74fc451657fe48e57"};
    expect(github.repos.compareCommits).toHaveBeenCalledWith(params)
  })

  test('retrieves contents for file-version for relevant check_run', async () => {
    await app.receive(checkRunRequestedActionEvent)

    const params: gh.ReposGetContentParams = { owner: "claasahl", repo: "prettiest-bot", path: "test/utils.test.ts", ref: "refs/heads/prettier/develop"};
    expect(github.repos.getContent).toHaveBeenCalledWith(params)
  })

  test('create pull request for fixed files', async () => {
    github.repos.getContent = jest.fn().mockResolvedValue(reposgetContent_200_unformatted)
    await app.receive(checkRunRequestedActionEvent)

    const body = template("https://github.com/claasahl/prettiest-bot/runs/16344324", 1, "claasahl")
    const params: gh.PullRequestsCreateParams = { owner: "claasahl", repo: "prettiest-bot", base: "develop", head: "refs/heads/prettier/develop", title: "Prettified branch: develop", maintainer_can_modify: true, body};
    expect(github.pullRequests.create).toHaveBeenCalledWith(params)
  })

  test('create "empty" pull request when no files need fixing', async () => {
    await app.receive(checkRunRequestedActionEvent)

    const body = template("https://github.com/claasahl/prettiest-bot/runs/16344324", 0, "claasahl")
    const params: gh.PullRequestsCreateParams = { owner: "claasahl", repo: "prettiest-bot", base: "develop", head: "refs/heads/prettier/develop", title: "Prettified branch: develop", maintainer_can_modify: true, body};
    expect(github.pullRequests.create).toHaveBeenCalledWith(params)
  })

  test('format and update files that need fixing', async () => {
    github.repos.getContent = jest.fn().mockResolvedValue(reposgetContent_200_unformatted)
    await app.receive(checkRunRequestedActionEvent)

    const content = "Ly8gWW91IGNhbiBpbXBvcnQgeW91ciBtb2R1bGVzCi8vIGltcG9ydCBpbmRleCBmcm9tICcuLi9zcmMvaW5kZXgnCgppbXBvcnQgKiBhcyBSeCBmcm9tICJyeGpzIjsKaW1wb3J0IHsgb2ZFdmVudCwgb2ZFdmVudEZpbHRlciB9IGZyb20gIi4uL3NyYy91dGlscyI7CgpkZXNjcmliZSgib2ZFdmVudEZpbHRlciAvIG9mRXZlbnQiLCAoKSA9PiB7CiAgdGVzdCgidGhhdCAnKicgbWF0Y2hlcyBhbnkgZXZlbnQiLCBhc3luYyAoKSA9PiB7CiAgICBleHBlY3Qob2ZFdmVudEZpbHRlcigiKiIpKGZha2VFdmVudCgic29tZSBldmVudCIsICJzb21lIGFjdGlvbiIpKSkudG9CZSgKICAgICAgdHJ1ZQogICAgKTsKICAgIGV4cGVjdChvZkV2ZW50RmlsdGVyKCIqIikoZmFrZUV2ZW50KCJzb21lIG90aGVyIGV2ZW50IikpKS50b0JlKHRydWUpOwogIH0pOwoKICB0ZXN0KCJ0aGF0IGV2ZW50IG5hbWUgbWF0Y2hlcyIsIGFzeW5jICgpID0+IHsKICAgIGV4cGVjdChvZkV2ZW50RmlsdGVyKCJwdXNoIikoZmFrZUV2ZW50KCJwdXNoIiwgInNvbWUgYWN0aW9uIikpKS50b0JlKHRydWUpOwogICAgZXhwZWN0KG9mRXZlbnRGaWx0ZXIoInB1c2giKShmYWtlRXZlbnQoInB1c2giKSkpLnRvQmUodHJ1ZSk7CiAgICBleHBlY3Qob2ZFdmVudEZpbHRlcigicHVzaCIpKGZha2VFdmVudCgiY2hlY2tfc3VpdGUiKSkpLnRvQmUoZmFsc2UpOwogIH0pOwoKICB0ZXN0KCJ0aGF0IGV2ZW50IG5hbWUgYW5kIGFjdGlvbiBtYXRjaCIsIGFzeW5jICgpID0+IHsKICAgIGV4cGVjdCgKICAgICAgb2ZFdmVudEZpbHRlcigiY2hlY2tfcnVuLmNyZWF0ZWQiKShmYWtlRXZlbnQoImNoZWNrX3J1biIsICJjcmVhdGVkIikpCiAgICApLnRvQmUodHJ1ZSk7CiAgICBleHBlY3QoCiAgICAgIG9mRXZlbnRGaWx0ZXIoImNoZWNrX3J1bi5jcmVhdGVkIikoZmFrZUV2ZW50KCJjaGVja19ydW4iLCAicmVyZXF1ZXN0ZWQiKSkKICAgICkudG9CZShmYWxzZSk7CiAgICBleHBlY3Qob2ZFdmVudEZpbHRlcigiY2hlY2tfcnVuLmNyZWF0ZWQiKShmYWtlRXZlbnQoImNoZWNrX3J1biIpKSkudG9CZSgKICAgICAgZmFsc2UKICAgICk7CiAgfSk7CgogIHRlc3QoInRoYXQgbWF0Y2hlZCBldmVudHMgYXJlIGtlcHQiLCBhc3luYyAoKSA9PiB7CiAgICBjb25zdCBldmVudDEgPSBmYWtlRXZlbnQoInB1c2giLCAiYWN0aW9uIik7CiAgICBjb25zdCBldmVudDIgPSBmYWtlRXZlbnQoImFub3RoZXIgZXZlbnQiKTsKICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IFJ4Lm9mKGV2ZW50MSwgZXZlbnQyKQogICAgICAucGlwZShvZkV2ZW50KCJwdXNoIikpCiAgICAgIC50b1Byb21pc2UoKTsKICAgIGV4cGVjdChyZXN1bHQpLnRvQmUoZXZlbnQxKTsKICB9KTsKCiAgdGVzdCgidGhhdCB1bm1hdGNoZWQgZXZlbnRzIGFyZSBkcm9wcGVkIiwgYXN5bmMgKCkgPT4gewogICAgY29uc3QgZXZlbnQxID0gZmFrZUV2ZW50KCJldmVudCIsICJhY3Rpb24iKTsKICAgIGNvbnN0IGV2ZW50MiA9IGZha2VFdmVudCgiYW5vdGhlciBldmVudCIpOwogICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgUngub2YoZXZlbnQxLCBldmVudDIpCiAgICAgIC5waXBlKG9mRXZlbnQoInB1c2giKSkKICAgICAgLnRvUHJvbWlzZSgpOwogICAgZXhwZWN0KHJlc3VsdCkudG9CZSh1bmRlZmluZWQpOwogIH0pOwoKICBmdW5jdGlvbiBmYWtlRXZlbnQobmFtZTogc3RyaW5nLCBhY3Rpb24/OiBzdHJpbmcpIHsKICAgIHJldHVybiB7IGV2ZW50OiBuYW1lLCBwYXlsb2FkOiB7IGFjdGlvbiB9IH07CiAgfQp9KTsK"
    const params: gh.ReposUpdateFileParams = { owner: "claasahl", repo: "prettiest-bot", message: "formatted file: test/utils.test.ts", path: "test/utils.test.ts", branch: "refs/heads/prettier/develop", sha: "7d6e8ee3e4c26b6d5d305fa3fe985ddf7c0f87ea", content};
    expect(github.repos.updateFile).toHaveBeenCalledWith(params)
  })
})

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with probot:
// https://probot.github.io/docs/testing/
