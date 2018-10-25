import { ChecksCreateParams, ChecksUpdateParams } from "@octokit/rest";
import * as pug from "pug";

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
type SimplifiedChecksCreateParams = Omit<
  ChecksCreateParams,
  "owner" | "repo" | "head_sha"
>;
type SimplifiedChecksUpdateParams = Omit<
  ChecksUpdateParams,
  "owner" | "repo" | "check_run_id"
>;

export function createParams(): SimplifiedChecksCreateParams {
  return {
    name: "prettier-ci"
  };
}

export function inProgressParams(): SimplifiedChecksUpdateParams {
  return {
    status: "in_progress"
  };
}

export function successParams(skipped: string[], passed: string[], failed: string[]): SimplifiedChecksUpdateParams {
  const completed_at = new Date().toISOString();
  return {
    status: "completed",
    conclusion: "success",
    completed_at,
    output: {
      title: "Summary",
      summary: pug.render(pugSummary(), {skipped, passed, failed}),
      text: pug.render(pugText(), {skipped, passed, failed})
    }
  };
}

export function failureParams(skipped: string[], passed: string[], failed: string[]): SimplifiedChecksUpdateParams {
  const completed_at = new Date().toISOString();
  return {
    status: "completed",
    conclusion: "failure",
    completed_at,
    output: {
      title: "Summary",
      summary: pug.render(pugSummary(), {skipped, passed, failed}),
      text: pug.render(pugText(), {skipped, passed, failed})
    }
  };
}

export function cancelledParams(): SimplifiedChecksUpdateParams {
  const completed_at = new Date().toISOString();
  return {
    status: "completed",
    conclusion: "cancelled",
    completed_at
  };
}

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

| **Failed:**
each file in failed
  |
  | * #{file}

| **Skipped:**
each file in skipped
  |
  | * #{file}

| **Passed:**
each file in passed
  |
  | * #{file}
`
}