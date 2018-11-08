import { mocked } from "ts-jest/utils";
import { Context } from "probot";
import { LoggerWithTarget } from "probot/lib/wrap-logger";
import * as mockdate from "mockdate";

import * as CheckRun from "../../src/events/check_run";
import CheckRunRerequested from "../fixtures/events/check_run.rerequested.json";
import CheckRunCreated from "../fixtures/events/check_run.created.json";
import * as checks_params from "../../src/checks_params";

import * as git from "isomorphic-git";
jest.mock("isomorphic-git");
const mockedGit = mocked(git);

import * as prettier from "prettier";
jest.mock("prettier");
const mockedPrettier = mocked(prettier);

import * as utils from "../../src/util";
import { DEFAULT_CONFIG } from "../../src/config";
jest.mock("../../src/util");
const mockedUtils = mocked(utils);

describe("tests for 'check_run.*'-events", async () => {
  const github: any = {
    checks: {
      create: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue(0)
    }
  };
  const log: LoggerWithTarget = new (jest.fn<LoggerWithTarget>())();

  test("'.rerequested' should create 'check_run'", async () => {
    await CheckRun.rerequested(new Context(CheckRunRerequested, github, log), DEFAULT_CONFIG);
    expect(github.checks.create).toHaveBeenCalledTimes(1);
    expect(github.checks.create).toHaveBeenCalledWith({
      ...checks_params.createParams(DEFAULT_CONFIG),
      owner: "username",
      repo: "repository",
      head_sha: "CCCCCCCCCCCCCCCCCCCCCCCCCC"
    });
  });

  test("'.created' should run analysis", async () => {
    mockedUtils.removedirp.mockResolvedValue({});
    mockedUtils.readdirp.mockReturnValue(["whatever.bla", "package.json"]);

    mockedPrettier.getFileInfo.mockImplementation(file => ({
      ignored: false,
      inferredParser: file == "package.json" ? "json" : null
    }));
    mockedPrettier.check.mockReturnValue(false);
    const completed_at = "2010-05-28T15:29:41.839Z";
    mockdate.set(completed_at);
    await CheckRun.created(new Context(CheckRunCreated, github, log), DEFAULT_CONFIG);

    expect(github.checks.update).toHaveBeenCalledTimes(2);
    expect(github.checks.update).toHaveBeenCalledWith({
      ...checks_params.inProgressParams(DEFAULT_CONFIG),
      check_run_id: 42,
      owner: "username",
      repo: "repository"
    });
    expect(github.checks.update).toHaveBeenCalledWith({
      ...checks_params.failureParams(DEFAULT_CONFIG, ["whatever.bla"], [], ["package.json"]),
      check_run_id: 42,
      owner: "username",
      repo: "repository"
    });

    expect(mockedGit.clone).toHaveBeenCalledTimes(1);
    expect(mockedGit.clone).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: "./repos/username-repository-42/",
        url: "https://some.url/repo.git",
        fs: expect.anything()
      })
    );
    expect(mockedGit.checkout).toHaveBeenCalledTimes(1);
    expect(mockedGit.checkout).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: "./repos/username-repository-42/",
        ref: "DDDDDDDDDDDDDDD",
        fs: expect.anything()
      })
    );

    expect(mockedUtils.removedirp).toHaveBeenCalledTimes(1)
    expect(mockedUtils.removedirp).toHaveBeenCalledWith("./repos/username-repository-42/")
    mockdate.reset();
  });

  test("'.created' should cancel analysis (and clean-up) when error occurs", async () => {
    mockedUtils.removedirp.mockResolvedValue({});
    mockedGit.clone.mockRejectedValue(undefined)
    const completed_at = "2010-05-28T15:29:41.839Z";
    mockdate.set(completed_at);
    await CheckRun.created(new Context(CheckRunCreated, github, log), DEFAULT_CONFIG);

    expect(github.checks.update).toHaveBeenCalledTimes(2);
    expect(github.checks.update).toHaveBeenCalledWith({
      ...checks_params.inProgressParams(DEFAULT_CONFIG),
      check_run_id: 42,
      owner: "username",
      repo: "repository"
    });
    expect(github.checks.update).toHaveBeenCalledWith({
      ...checks_params.cancelledParams(DEFAULT_CONFIG),
      check_run_id: 42,
      owner: "username",
      repo: "repository"
    });

    expect(mockedGit.clone).toHaveBeenCalledTimes(1);
    expect(mockedGit.clone).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: "./repos/username-repository-42/",
        url: "https://some.url/repo.git",
        fs: expect.anything()
      })
    );
    expect(mockedGit.checkout).toHaveBeenCalledTimes(0);

    expect(mockedUtils.removedirp).toHaveBeenCalledTimes(1)
    expect(mockedUtils.removedirp).toHaveBeenCalledWith("./repos/username-repository-42/")
    mockdate.reset();
  });
});
