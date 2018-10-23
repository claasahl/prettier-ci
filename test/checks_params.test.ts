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
    const params = ChecksParams.successParams();
    mockdate.reset();
    expect(params).toEqual({
      status: "completed",
      conclusion: "success",
      completed_at
    });
  });
  test("parameters for 'checks.update' [failure]", async () => {
    const completed_at = "2010-05-28T15:29:41.839Z";
    mockdate.set(completed_at);
    const params = ChecksParams.failureParams();
    mockdate.reset();
    expect(params).toEqual({
      status: "completed",
      conclusion: "failure",
      completed_at
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
