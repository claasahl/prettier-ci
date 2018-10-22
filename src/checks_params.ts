import { ChecksCreateParams, ChecksUpdateParams } from "@octokit/rest";

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
type SimplifiedChecksCreateParams = Omit<ChecksCreateParams, "owner" | "repo" | "head_sha">;
type SimplifiedChecksUpdateParams = Omit<ChecksUpdateParams, "owner" | "repo" | "check_run_id">;

export function createParams(): SimplifiedChecksCreateParams {
    return {
        name: "prettier-ci"
    }
}

export function inProgressParams(): SimplifiedChecksUpdateParams {
    return {
        status: "in_progress"
    }
}

export function successParams(): SimplifiedChecksUpdateParams {
    const completed_at = new Date().toISOString();
    return {
        status: "completed",
        conclusion: "success",
        completed_at
    }
}

export function failureParams(): SimplifiedChecksUpdateParams {
    const completed_at = new Date().toISOString();
    return {
        status: "completed",
        conclusion: "failure",
        completed_at
    }
}

export function cancelledParams(): SimplifiedChecksUpdateParams {
    const completed_at = new Date().toISOString();
    return {
        status: "completed",
        conclusion: "cancelled",
        completed_at
    }
}