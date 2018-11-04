import { ChecksCreateParams, ChecksUpdateParams } from "@octokit/rest";

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type SimplifiedChecksCreateParams = Omit<
    ChecksCreateParams,
    "owner" | "repo" | "head_sha"
    >;
export type SimplifiedChecksUpdateParams = Omit<
    ChecksUpdateParams,
    "owner" | "repo" | "check_run_id"
    >;

export interface Config {
    check_run: {
        create: SimplifiedChecksCreateParams,
        inProgress: SimplifiedChecksUpdateParams,
        success: SimplifiedChecksUpdateParams,
        failure: SimplifiedChecksUpdateParams,
        cancelled: SimplifiedChecksUpdateParams
    }
}