import { Context } from "probot";
import { LoggerWithTarget } from "probot/lib/wrap-logger";

import * as CheckSuite from "../../src/events/check_suite";
import CheckSuiteRequested from "../fixtures/events/check_suite.requested.json";
import CheckSuiteRerequested from "../fixtures/events/check_suite.rerequested.json";
import { createParams } from "../../src/checks_params";
import { DEFAULT_CONFIG } from "../../src/config";

describe("tests for 'check_suite.*'-events", async () => {
  const github: any = {
    checks: {
      create: jest.fn().mockResolvedValue(0)
    }
  };
  const log: LoggerWithTarget = new (jest.fn<LoggerWithTarget>())();

  test("'.requested' should create 'check_run'", async () => {
    await CheckSuite.requested(
      new Context(CheckSuiteRequested, github, log),
      DEFAULT_CONFIG
    );
    expect(github.checks.create).toHaveBeenCalledTimes(1);
    expect(github.checks.create).toHaveBeenCalledWith({
      ...createParams(DEFAULT_CONFIG),
      owner: "username",
      repo: "repository",
      head_sha: "AAAAAAAAAAAAAAAAAAA"
    });
  });

  test("'.rerequested' should create 'check_run'", async () => {
    await CheckSuite.rerequested(
      new Context(CheckSuiteRerequested, github, log),
      DEFAULT_CONFIG
    );
    expect(github.checks.create).toHaveBeenCalledTimes(1);
    expect(github.checks.create).toHaveBeenCalledWith({
      ...createParams(DEFAULT_CONFIG),
      owner: "username",
      repo: "repository",
      head_sha: "BBBBBBBBBBBBBBBBBBBB"
    });
  });
});
