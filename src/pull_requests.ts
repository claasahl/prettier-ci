import { GitHubAPI } from "probot/lib/github";
import { LoggerWithTarget } from "probot/lib/wrap-logger";
import { PullRequestsGetAllParams, GetAllResponseItem } from "@octokit/rest";
import { USER_NAME, USER_TYPE } from "./utils";

interface Common {
    github: GitHubAPI,
    log: LoggerWithTarget,
}
export interface GetPullRequestsParams extends Common {
    owner: string,
    repo: string,
    state: "open" | "closed" | "all",
    base?: string
}
export interface PullRequest {
    id: string,
    title: string,
    state: "open" | "closed",
}
export async function prettierPullRequests(params: GetPullRequestsParams): Promise<PullRequest[]> {
    const {owner, repo, state, base} = params;
    const {github, log} = params;

    const pullRequestsGetAllParams: PullRequestsGetAllParams = {owner, repo, state, base}
    const pullRequestsGetAllResponse = await github.pullRequests.getAll(pullRequestsGetAllParams)
    log(JSON.stringify(pullRequestsGetAllResponse, null, 2))
    return pullRequestsGetAllResponse.data
    .filter(keepMyPullRequests)
    .map(pr => ({id: pr.id as string, title: pr.title as string, state: pr.state as ("open" | "closed")}));
}

function keepMyPullRequests(pullRequest: GetAllResponseItem) {
    return pullRequest.user && pullRequest.user.login.match(USER_NAME) && pullRequest.user.type.match(USER_TYPE);
}

export async function prettierPullRequest() {
    // create branch/reference
    // create pull request
}

