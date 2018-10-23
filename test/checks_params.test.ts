import * as ChecksParams from "../src/checks_params";
import * as mockdate from "mockdate";

describe("tests for check_run parameters", async () => {
  test("parameters for 'checks.create'", async () => {
    const params = ChecksParams.createParams();
    expect(params).toEqual({ name: "prettier-ci" });
  });
  test("parameters for 'checks.update' [in_progress]", async () => {
    const params = ChecksParams.inProgressParams();
    expect(params).toEqual({ status: "in_progress" });
  });
  test("parameters for 'checks.update' [success]", async () => {
    const completed_at = "2010-05-28T15:29:41.839Z";
    mockdate.set(completed_at);
    const params = ChecksParams.successParams(["skipped.env", "also.skipped"], ["formatted.js"], []);
    mockdate.reset();
    expect(params).toEqual({
      status: "completed",
      conclusion: "success",
      completed_at,
      output: {
        summary: "Keep up the **good work**. All 3 files were neatly formatted.",
        text: "I thoroughly checked 3 files. All files are neatly formatted (passed: 1 file, skipped: 2 files). Congratulations!",
        title: "Summary",
      },
    });
  });
  test("parameters for 'checks.update' [failure]", async () => {
    const completed_at = "2010-05-28T15:29:41.839Z";
    mockdate.set(completed_at);
    const params = ChecksParams.failureParams([], [], ["not_formatted.js", "totally_not_formatted.js"]);
    mockdate.reset();
    expect(params).toEqual({
      status: "completed",
      conclusion: "failure",
      completed_at,
      output: {
        summary: "Found 2 files which could be *prettier*",
        text: `I thoroughly checked 2 files. Some files are not neatly formatted, but have no fear! I can fix this, if you tell me to do so.

Here is a list of files which be *prettier* (2 files).
* not_formatted.js
* totally_not_formatted.js

You can instruct me to fix this by clicking on "Fix" at the top of the page.`,
        title: "Summary",
      },
    });
  });
  test("parameters for 'checks.update' [cancelled]", async () => {
    const completed_at = "2010-05-28T15:29:41.839Z";
    mockdate.set(completed_at);
    const params = ChecksParams.cancelledParams();
    mockdate.reset();
    expect(params).toEqual({
      status: "completed",
      conclusion: "cancelled",
      completed_at
    });
  });
});
