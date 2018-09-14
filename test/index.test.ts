// You can import your modules
// import index from '../src/index'
import { Application } from "probot";
import myProbotApp from "../src/index";
import * as gh from "@octokit/rest";

import checkSuiteRequestedEvent from "./events/check_suite/requested.json";
import checkSuiteRerequestedEvent from "./events/check_suite/rerequested.json";
import checkRunRerequestedEvent from "./events/check_run/rerequested.json";
import checkRunCreatedEvent from "./events/check_run/created.json";

import reposCompareCommits_200 from "./responses/repos/compareCommits__200.json";
import reposgetContent_200 from "./responses/repos/getContent__200.json";

import { CHECKS_NAME } from "../src/utils";

describe("tests conditions for triggering a file-analysis", () => {
  let app, github;

  beforeEach(() => {
    app = new Application();
    // Initialize the app based on the code from index.js
    app.load(myProbotApp);
    // This is an easy way to mock out the GitHub API
    github = {
      checks: {
        create: jest.fn().mockReturnValue(Promise.resolve({})),
        update: jest.fn().mockReturnValue(Promise.resolve({}))
      }
    };
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github);
  });

  test("creates check when check_suite is requested", async () => {
    await app.receive(checkSuiteRequestedEvent);

    const params: gh.ChecksCreateParams = {
      owner: "claasahl",
      repo: "prettiest-bot",
      name: CHECKS_NAME,
      head_sha: "39a53e909e101414ee8880321bf0079e4dd7d767"
    };
    expect(github.checks.create).toHaveBeenCalledWith(params);
  });

  test("creates check when check_suite is rerequested", async () => {
    await app.receive(checkSuiteRerequestedEvent);

    const params: gh.ChecksCreateParams = {
      owner: "claasahl",
      repo: "prettiest-bot",
      name: CHECKS_NAME,
      head_sha: "bb4d2ed9702c4c4340db50f74fc451657fe48e57"
    };
    expect(github.checks.create).toHaveBeenCalledWith(params);
  });

  test("creates check when check_run is rerequested", async () => {
    await app.receive(checkRunRerequestedEvent);

    const params: gh.ChecksCreateParams = {
      owner: "claasahl",
      repo: "prettiest-bot",
      name: CHECKS_NAME,
      head_sha: "fad5b3a8a9602fd31279d8c707e5a0de3c4cd640"
    };
    expect(github.checks.create).toHaveBeenCalledWith(params);
  });
});

describe("tests for file-analysis", () => {
  let app, github;

  beforeEach(() => {
    app = new Application();
    // Initialize the app based on the code from index.js
    app.load(myProbotApp);
    // This is an easy way to mock out the GitHub API
    github = {
      checks: {
        create: jest.fn().mockReturnValue(Promise.resolve({})),
        update: jest.fn().mockReturnValue(Promise.resolve({}))
      },
      repos: {
        compareCommits: jest
          .fn()
          .mockReturnValue(Promise.resolve(reposCompareCommits_200)),
        getContent: jest
          .fn()
          .mockReturnValue(Promise.resolve(reposgetContent_200))
      }
    };
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github);
  });

  test('mark check as "in_progress" when check_run is created', async () => {
    await app.receive(checkRunCreatedEvent);

    const params: gh.ChecksUpdateParams = {
      owner: "claasahl",
      repo: "prettiest-bot",
      check_run_id: "15222485",
      status: "in_progress"
    };
    expect(github.checks.update).toHaveBeenCalledWith(params);
  });

  test("compares before/after commits when check_run is created", async () => {
    await app.receive(checkRunCreatedEvent);

    const params: gh.ReposCompareCommitsParams = {
      owner: "claasahl",
      repo: "prettiest-bot",
      base: "923547128e3e9fe26c4192bb45fcf125dae92c4b",
      head: "52c67357a6b1858226c131d13d7d44e8303fd426"
    };
    expect(github.repos.compareCommits).toHaveBeenCalledWith(params);
  });

  test("retrieves contents for version that was present when check_run is created", async () => {
    await app.receive(checkRunCreatedEvent);

    // TODO app.receive already completes when the event has been received, but not when then event has been processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    const params: gh.ReposGetContentParams = {
      owner: "claasahl",
      repo: "prettiest-bot",
      path: "test/utils.test.ts",
      ref: "7d6e8ee3e4c26b6d5d305fa3fe985ddf7c0f87ea"
    };
    expect(github.repos.getContent).toHaveBeenCalledWith(params);
  });
});

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with probot:
// https://probot.github.io/docs/testing/
