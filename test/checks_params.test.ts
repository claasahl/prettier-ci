import * as ChecksParams from "../src/checks_params";

describe("tests for check_run parameters", async () => {
    test("parameters for 'checks.create'", async () => {
        const params = ChecksParams.createParams();
        expect(params).toEqual({name:"prettier-ci"})
    })
})