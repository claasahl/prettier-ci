import { Application, Context } from "probot";
import { LoggerWithTarget } from "probot/lib/wrap-logger";
// Requiring our app implementation
import myProbotApp from '../../src'
import * as CheckSuite from '../../src/events/check_suite'

import a from "../fixtures/events/check_suite.requested.json";

describe("tests for 'check_suite.*'-events", async () => {
    let app: Application
    let github: any
    let log: LoggerWithTarget;

    beforeEach(() => {
        app = new Application()
        // Initialize the app based on the code from index.ts
        app.load(myProbotApp)
        // This is an easy way to mock out the GitHub API
        github = {
            issues: {
                createComment: jest.fn().mockReturnValue(Promise.resolve({}))
            },
            checks: {
                create: jest.fn().mockResolvedValue(0),
            }
        }
        // Passes the mocked out GitHub API into out app instance
        app.auth = () => Promise.resolve(github)

        log = app.log
    })

    test("'.requested' should create 'check_run'", async () => {
        await CheckSuite.requested(new Context(a, github, log))
        expect(github.checks.create).toHaveBeenCalled()
    })
})