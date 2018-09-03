import { GitHubAPI } from "probot/lib/github";
import { LoggerWithTarget } from "probot/lib/wrap-logger";
import * as gh from "@octokit/rest";

type Overwrite<T1, T2> = Pick<T1, Exclude<keyof T1, keyof T2>> & T2;

export interface Common {
    github: GitHubAPI,
    log: LoggerWithTarget,
}

export type ChecksCreateParams = Common & Overwrite<gh.ChecksCreateParams, { name?: string, status?: "queued" | "in_progress" | "completed" }>;

export interface ChecksCreateResult {
    params: ChecksCreateParams,
    created: boolean
}

export type ChecksUpdateParams = Common & Overwrite<gh.ChecksUpdateParams, { name?: string}>;
export interface ChecksUpdateResult {
    params: ChecksUpdateParams,
    updated: boolean
}

export type ReposCompareCommitsParams = Common & gh.ReposCompareCommitsParams;

export interface ReposCompareCommitsResult {
    params: ReposCompareCommitsParams,
    files: {
        sha: string,
        name: string,
        status: "added" | "modified" | "deleted"
    }[]
}

export type ReposGetContentParams = Common & gh.ReposGetContentParams;

export interface ReposGetContentResult {
    params: ReposGetContentParams,
    content?: string
}