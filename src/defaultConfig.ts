import { Config } from "./types";

export const DEFAULT_CONFIG: Config = {
    REFERENCE_PREFIX: "refs/heads/prettier/",
    COMMIT_MESSAGE_PREFIX: "formatted file: ",
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
        title: "Prettified branch: ",
        body: pugBody()
    },
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
if passed
  | Pretty. Keep up the **good work**.
else
  | Found #{failedResults.length} files which could be *prettier*`;
}

function pugText(): string {
    return `
unless passed
  | Here is a list of files which be *prettier*.
  each result in failedResults
    | * #{result.file}`
}

function pugActionNotSupported(): string {
    return `| unsupported action requested '#{context.payload.requested_action.identifier}'`
}

function pugEncodingNotSupported(): string {
    `unsupported encoding '"+result.response.data.encoding+"' for file '"+data.file+"'`
    return `| unsupported action requested '#{context.payload.requested_action.identifier}'`
}

function pugBody(): string {
    return `
- const failedResults = results.filter(result => !result.passed)
| This [check run](#{context.payload.check_run.html_url}) identified #{failedResults.length} #{failedResults.length == 1 ? "file" : "files"}, which #{failedResults.length == 1 ? "needs" : "need"} formatting.
|
| @#{context.payload.sender.login} requested these files to be fixed.`
}