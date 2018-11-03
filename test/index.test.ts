import { mocked } from "ts-jest/utils";
import { Application } from "probot";
// Requiring our app implementation
import myProbotApp from "../src";

import * as CheckSuite from "../src/events/check_suite";
jest.mock("../src/events/check_suite");
const mockedCheckSuite = mocked(CheckSuite);

import * as CheckRun from "../src/events/check_run";
jest.mock("../src/events/check_run");
const mockedCheckRun = mocked(CheckRun);

import checkSuiteRequested from "./fixtures/events/check_suite.requested.json";
import checkSuiteRerequested from "./fixtures/events/check_suite.rerequested.json";
import checkRunRerequested from "./fixtures/events/check_run.rerequested.json";
import checkRunCreated from "./fixtures/events/check_run.created.json";
import { DEFAULT_CONFIG } from "../src/config";

describe("My Probot app", () => {
  let app: Application;
  let github: any;

  beforeEach(() => {
    app = new Application();
    // Initialize the app based on the code from index.ts
    app.load(myProbotApp);
    // This is an easy way to mock out the GitHub API
    github = {
      checks: {
        create: jest.fn().mockResolvedValue(0)
      },
      repos: {
        getContent: jest.fn().mockResolvedValue({data:{size: 0, content: ""}})
      }
    };
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github);
  });

  test("forward 'check_suite.requested'", async () => {
    await app.receive({
      name: "check_suite.requested",
      payload: checkSuiteRequested.payload
    });

    expect(mockedCheckSuite.requested).toHaveBeenCalledTimes(1);
    expect(mockedCheckSuite.requested).toHaveBeenCalledWith(expect.objectContaining({
        payload: checkSuiteRequested.payload
    }), DEFAULT_CONFIG)
  });

  test("forward 'check_suite.rerequested'", async () => {
    await app.receive({
      name: "check_suite.rerequested",
      payload: checkSuiteRerequested.payload
    });

    expect(mockedCheckSuite.rerequested).toHaveBeenCalledTimes(1);
    expect(mockedCheckSuite.rerequested).toHaveBeenCalledWith(expect.objectContaining({
      payload: checkSuiteRerequested.payload
  }), DEFAULT_CONFIG)
  });

  test("forward 'check_run.rerequested'", async () => {
    await app.receive({
      name: "check_run.rerequested",
      payload: checkRunRerequested.payload
    });

    expect(mockedCheckRun.rerequested).toHaveBeenCalledTimes(1);
    expect(mockedCheckRun.rerequested).toHaveBeenCalledWith(expect.objectContaining({
      payload: checkRunRerequested.payload
  }), DEFAULT_CONFIG)
  });

  test("forward 'check_run.created'", async () => {
    await app.receive({
      name: "check_run.created",
      payload: checkRunCreated.payload
    });

    expect(mockedCheckRun.created).toHaveBeenCalledTimes(1);
    expect(mockedCheckRun.created).toHaveBeenCalledWith(expect.objectContaining({
      payload: checkRunCreated.payload
  }), DEFAULT_CONFIG)
  });
});

// For more information about testing with Jest see:
// https://facebook.github.io/jest/
