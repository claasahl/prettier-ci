import { GitHubAPI } from 'probot/lib/github'
import { LoggerWithTarget } from 'probot/lib/wrap-logger'
import * as gh from '@octokit/rest'
import { Context } from 'probot';

export type Overwrite < T1 , T2 > = Pick<T1, Exclude<keyof T1, keyof T2>> & T2

export enum Mode {
    auto,
    complete,
    partial
}
export interface Config {
    mode: Mode,
    checks: {
        name: string,
        output: {
            title: string,
            summary: string,
            text: string
        }
        actions: {
            fix: {
                identifier: string,
                label: string,
                description: string,
            }
        }
    },
    pullRequests: {
        branch: string,
        title: string,
        body: string,
        maintainer_can_modify: boolean
    },
    commitMessage: string,
    errors: {
        checks: {
            action_not_supported: string
        },
        repos: {
            encoding_not_supported: string
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
