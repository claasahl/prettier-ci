import { ChecksCreateParams } from "@octokit/rest";

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
type SimplifiedChecksCreateParams = Omit<ChecksCreateParams, "owner" | "repo" | "head_sha">;
// type SimplifiedChecksUpdateParams = Omit<ChecksUpdateParams, "owner" | "repo" | "check_run_id">;

export function createParams(): SimplifiedChecksCreateParams {
    return {
        name: "prettier-ci"
    }
}