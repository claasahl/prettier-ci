import { Context } from "probot";
import { LoggerWithTarget } from "probot/lib/wrap-logger";

import * as CheckRun from '../../src/events/check_run'
import CheckRunRerequested from "../fixtures/events/check_run.rerequested.json";
import { createParams } from "../../src/checks_params";

describe("tests for 'check_run.*'-events", async () => {
    const github: any = {
        checks: {
            create: jest.fn().mockResolvedValue(0),
        }
    }
    const log: LoggerWithTarget = new (jest.fn<LoggerWithTarget>());

    test("'.rerequested' should create 'check_run'", async () => {
        await CheckRun.rerequested(new Context(CheckRunRerequested, github, log))
        expect(github.checks.create).toHaveBeenCalledTimes(1)
        expect(github.checks.create).toHaveBeenCalledWith({
            ...createParams(),
            owner: "username",
            repo: "repository",
            head_sha: "CCCCCCCCCCCCCCCCCCCCCCCCCC"
        })
    })
})