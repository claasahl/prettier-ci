import * as gh from "@octokit/rest";
import { Context } from "probot";
import { Projection } from "../types";


export namespace checks {
    export async function create(context: Context, project: Projection<gh.ChecksCreateParams>) {
        const params = project(context)
        const response = await context.github.checks.create(params)
        return {context, response}
    }
    export async function update(context: Context, project: Projection<gh.ChecksUpdateParams>) {
        const params = project(context)
        const response = await context.github.checks.update(params)
        return {context, response}
    }
}

export namespace repos {
    export async function compareCommits(context: Context, project: Projection<gh.ReposCompareCommitsParams>) {
        const params = project(context)
        const response = await context.github.repos.compareCommits(params)
        return {context, response}
    }
    export async function getContent(context: Context, project: Projection<gh.ReposGetContentParams>) {
        const params = project(context)
        const response = await context.github.repos.getContent(params)
        return {context, response}
    }
}
