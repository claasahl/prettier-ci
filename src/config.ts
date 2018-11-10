import { Config } from "./types";

export const DEFAULT_CONFIG: Config = {
  check_run: {
    create: {
      name: "prettier-ci"
    },
    inProgress: { status: "in_progress" },
    success: {
      status: "completed",
      conclusion: "success",
      output: {
        title: "Summary",
        summary: pugSummary(),
        text: pugText()
      }
    },
    failure: {
      status: "completed",
      conclusion: "failure",
      output: {
        title: "Summary",
        summary: pugSummary(),
        text: pugText()
      }
    },
    cancelled: {
      status: "completed",
      conclusion: "cancelled"
    }
  }
};

function pugSummary(): string {
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
if noFiles === 0
  | No files were modified, added or removed.
else if failed.length === 0 && noFiles === 1
  | Keep up the **good work**. Your file is neatly formatted.
else if failed.length === 0 && noFiles > 1
  | Keep up the **good work**. All #{noFiles} files were neatly formatted.
else
  | Found #{files(failed.length)} which could be *prettier*`;
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

|
|
| **These files are not yet formatted (i.e. they 'failed'):**
if failed.length > 0
  each file in failed
    |
    | * #{file}
else
  |
  | #{files(failed.length)}

|
|
| **These files were ignored (i.e. they were 'skipped'):**
if skipped.length > 0
  each file in skipped
    |
    | * #{file}
else
  |
  | #{files(skipped.length)}

|
|
| **These files are already formatted (i.e. they 'passed'):**
if passed.length > 0
  each file in passed
    |
    | * #{file}
else
  |
  | #{files(passed.length)}
`;
}
