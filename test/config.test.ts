import { DEFAULT_CONFIG } from "../src/config";

describe("default configuration", () => {
  test("check_run.created", async () => {
    expect(DEFAULT_CONFIG.check_run.create).toEqual({
      name: "prettier-ci"
    });
  });

  test("check_run.inProgress", async () => {
    expect(DEFAULT_CONFIG.check_run.inProgress).toEqual({
      status: "in_progress"
    });
  });

  test("check_run.success", async () => {
    expect(DEFAULT_CONFIG.check_run.success).toEqual(
      expect.objectContaining({
        status: "completed",
        conclusion: "success",
        output: expect.anything()
      })
    );
  });

  test("check_run.failure", async () => {
    expect(DEFAULT_CONFIG.check_run.failure).toEqual(
      expect.objectContaining({
        status: "completed",
        conclusion: "failure",
        output: expect.anything()
      })
    );
  });

  test("check_run.cancelled", async () => {
    expect(DEFAULT_CONFIG.check_run.cancelled).toEqual({
      status: "completed",
      conclusion: "cancelled"
    });
  });
});
