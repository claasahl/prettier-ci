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
- const noFiles = skipped.length + passed.length + failed.length
if noFiles === 0
  | No files were modified, added or removed.
else if failed.length === 0 && noFiles === 1
  | Keep up the **good work**. Your file is neatly formatted.
else if failed.length === 0 && noFiles > 1
  | Keep up the **good work**. All #{noFiles} files were neatly formatted.
else
  | Found #{failed.length} files which could be *prettier*`;
}

function pugText(): string {
    return `
-
  function files(no) {
    if(no <= 0) {
      return "no files"
    } else if(no === 1) {
      return "1 file"
    } else {
      return no + " files"
    }
  }
- const noFiles = skipped.length + passed.length + failed.length
| I thoroughly checked #{files(noFiles)}.
if failed.length === 0
  |  All files are neatly formatted (passed: #{files(passed.length)}, skipped: #{files(skipped.length)}). Congratulations!
else if failed.length / noFiles < 0.4
  |  Most files are neatly formatted (passed: #{files(passed.length)}, failed: #{files(failed.length)}, skipped: #{files(skipped.length)}).
else if failed.length === 1
  |  Your file is not neatly formatted, but have no fear! I can fix this, if you tell me to do so.
else
  |  Some files are not neatly formatted, but have no fear! I can fix this, if you tell me to do so.
if failed.length === 1
  |
  |
  | This file could be *prettier*:
  |
  | * #{failed[0]}
else if failed.length > 0
  |
  |
  | Here is a list of files which be *prettier* (#{files(failed.length)}).
  each file in failed
    |
    | * #{file}
if failed.length > 0
  |
  |
  | You can instruct me to fix this by clicking on "Fix" at the top of the page.
`
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
