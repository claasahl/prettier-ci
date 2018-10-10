import { Config, Mode } from "./types";

export const DEFAULT_CONFIG: Config = {
    mode: Mode.auto,
    checks: {
        name: "Prettier-CI",
        output: {
            title: "Prettier-CI",
            summary: pugSummary(),
            text: pugText()
        },
        actions: {
            fix: {
                identifier: "fix",
                label: "Fix",
                description: "Make files *prettier*.",
            }
        }
    },
    pullRequests: {
        branch: pugBranch(),
        title: pugTitle(),
        body: pugBody(),
        maintainer_can_modify: true
    },
    commitMessage: pugCommitMessage(),
    errors: {
        checks: {
            action_not_supported: pugActionNotSupported()
        },
        repos: {
            encoding_not_supported: pugEncodingNotSupported()
        }
    }
}

function pugSummary(): string {
    return `
- const failedResults = results.filter(result => !result.passed)
- const passed = failedResults.length === 0
if passed
  | Pretty. Keep up the **good work**.
else
  | Found #{failedResults.length} files which could be *prettier*`;
}

function pugText(): string {
    return `
- const failedResults = results.filter(result => !result.passed)
- const passed = failedResults.length === 0
unless passed
  | Here is a list of files which be *prettier*.
  each result in failedResults
    |
    | * #{result.file}`
}

function pugActionNotSupported(): string {
    return `| unsupported action requested '#{event.requested_action.identifier}'`
}

function pugEncodingNotSupported(): string {
    return `unsupported encoding '#{encoding}' for file '#{file}'`
}

function pugBranch(): string {
    return `| refs/heads/prettier/#{event.check_run.check_suite.head_branch}`;
}

function pugTitle(): string {
    return `| Prettified branch: '#{event.check_run.check_suite.head_branch}'`
}

function pugBody(): string {
    return `
- const failedResults = results.filter(result => !result.passed)
| This [check run](#{event.check_run.html_url}) identified #{failedResults.length} #{failedResults.length == 1 ? "file" : "files"}, which #{failedResults.length == 1 ? "needs" : "need"} formatting.
|
| @#{event.sender.login} requested these files to be fixed.`
}

function pugCommitMessage(): string {
    return `| formatted file: #{params.path}`;
}
