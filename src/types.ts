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

export interface Projection<T> {(context: Context, config: Config): T }
