import { GitHubAPI } from 'probot/lib/github'
import { LoggerWithTarget } from 'probot/lib/wrap-logger'
import * as gh from '@octokit/rest'
import { Context } from 'probot';

export type Overwrite < T1 , T2 > = Pick<T1, Exclude<keyof T1, keyof T2>> & T2

export interface Config {
    REFERENCE_PREFIX: string;
    COMMIT_MESSAGE_PREFIX: string;
    PULL_REQUEST_TITLE_PREFIX: string;
    checks: {
        name: string,
        output: {
            title: string,
            summary: string
        }
        actions: {
            fix: {
                identifier: string,
                label: string,
                description: string,
            }
        }
    }
}

export interface Common {
    github: GitHubAPI,
    log: LoggerWithTarget,
}

export interface Projection<T> {(context: Context, config: Config): T }

export type ChecksCreateParams = Common & Overwrite<gh.ChecksCreateParams, { name?: string, status?: 'queued' | 'in_progress' | 'completed' }>

export interface ChecksCreateResult {
    params: ChecksCreateParams,
    created: boolean
}

export type ChecksUpdateParams = Common & Overwrite<gh.ChecksUpdateParams, { name?: string}>
export interface ChecksUpdateResult {
    params: ChecksUpdateParams,
    updated: boolean
}

export type ReposCompareCommitsParams = Common & gh.ReposCompareCommitsParams

export interface ReposCompareCommitsResult {
    params: ReposCompareCommitsParams,
    files: {
        sha: string,
        name: string,
        status: 'added' | 'modified' | 'deleted'
    }[]
}

export type ReposGetContentParams = Common & gh.ReposGetContentParams

export interface ReposGetContentResult {
    params: ReposGetContentParams,
    content?: string
}

export interface ProbotEvent {
    event: string;
    payload: {
        action?: string
    }
}
