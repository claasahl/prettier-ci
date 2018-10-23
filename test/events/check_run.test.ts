import { mocked } from "ts-jest/utils";
import { Context } from "probot";
import { LoggerWithTarget } from "probot/lib/wrap-logger";
import * as mockdate from "mockdate";

import * as CheckRun from "../../src/events/check_run";
import CheckRunRerequested from "../fixtures/events/check_run.rerequested.json";
import CheckRunCreated from "../fixtures/events/check_run.created.json";
import { createParams } from "../../src/checks_params";

import * as git from "isomorphic-git";
jest.mock("isomorphic-git");
const mockedGit = mocked(git);

// import * as shelljs from "shelljs";
// jest.mock("shelljs")
// const mockedShelljs = mocked(shelljs)

describe("tests for 'check_run.*'-events", async () => {
  const github: any = {
    checks: {
      create: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue(0)
    }
  };
  const log: LoggerWithTarget = new (jest.fn<LoggerWithTarget>())();

  test("'.rerequested' should create 'check_run'", async () => {
    await CheckRun.rerequested(new Context(CheckRunRerequested, github, log));
    expect(github.checks.create).toHaveBeenCalledTimes(1);
    expect(github.checks.create).toHaveBeenCalledWith({
      ...createParams(),
      owner: "username",
      repo: "repository",
      head_sha: "CCCCCCCCCCCCCCCCCCCCCCCCCC"
    });
  });

  test("'.created' should create 'check_run'", async () => {
    // mockedShelljs.test.mockReturnValue(false)
    const completed_at = "2010-05-28T15:29:41.839Z";
    mockdate.set(completed_at);
    await CheckRun.created(new Context(CheckRunCreated, github, log));
    mockdate.reset();

    expect(github.checks.update).toHaveBeenCalledTimes(2);
    expect(github.checks.update).toHaveBeenCalledWith({
      check_run_id: 42,
      status: "in_progress",
      owner: "username",
      repo: "repository"
    });
    expect(github.checks.update).toHaveBeenCalledWith({
      check_run_id: 42,
      status: "completed",
      owner: "username",
      repo: "repository",
      conclusion: "failure",
      completed_at
    });

    expect(mockedGit.clone).toHaveBeenCalledTimes(1);
    expect(mockedGit.clone).toBeCalledWith({
      dir: "./repos/username/repository",
      url: "https://some.url/repo.git"
    });
    expect(mockedGit.checkout).toHaveBeenCalledTimes(1);
    expect(mockedGit.checkout).toHaveBeenCalledWith({
      dir: "./repos/username/repository",
      ref: "DDDDDDDDDDDDDDD"
    });

    // expect(mockedShelljs.test).toHaveBeenCalledTimes(1)
    // expect(mockedShelljs.exec).toHaveBeenCalledTimes(1)
    // expect(mockedShelljs.rm).toHaveBeenCalledTimes(1)
  });
});
