import { GitHubAPI } from "probot/lib/github";
import { LoggerWithTarget } from "probot/lib/wrap-logger";
import {
  PullRequestsGetAllParams,
  GetAllResponseItem,
  PullRequestsCreateParams,
  GitdataCreateReferenceParams
} from "@octokit/rest";
import { USER_NAME, USER_TYPE } from "./utils";

interface Common {
  github: GitHubAPI;
  log: LoggerWithTarget;
}
export interface GetPrettierPullRequestsParams extends Common {
  owner: string;
  repo: string;
  state: "open" | "closed" | "all";
  base?: string;
}
export interface PullRequest {
  id: string;
  title: string;
  state: "open" | "closed";
}
export async function getPrettierPullRequests(
  params: GetPrettierPullRequestsParams
): Promise<PullRequest[]> {
  const { owner, repo, state, base } = params;
  const { github, log } = params;

  const pullRequestsGetAllParams: PullRequestsGetAllParams = {
    owner,
    repo,
    state,
    base
  };
  const pullRequestsGetAllResponse = await github.pullRequests.getAll(
    pullRequestsGetAllParams
  );
  log(JSON.stringify(pullRequestsGetAllResponse, null, 2));
  return pullRequestsGetAllResponse.data
    .filter(keepMyPullRequests)
    .map(pr => ({
      id: pr.id as string,
      title: pr.title as string,
      state: pr.state as "open" | "closed"
    }));
}

function keepMyPullRequests(pullRequest: GetAllResponseItem) {
  return (
    pullRequest.user &&
    pullRequest.user.login.match(USER_NAME) &&
    pullRequest.user.type.match(USER_TYPE)
  );
}

export interface CreatePrettierReferenceParams extends Common {
  owner: string;
  repo: string;
  ref: string;
  sha: string;
}
export async function createPrettierReference(
  params: CreatePrettierReferenceParams
) {
  const { owner, repo, ref, sha } = params;
  const { github, log } = params;
  const gitdataCreateReferenceParams: GitdataCreateReferenceParams = {
    owner,
    repo,
    ref,
    sha
  };
  try {
    const gitdataCreateReferenceResponse = await github.gitdata.createReference(
      gitdataCreateReferenceParams
    );
    log(gitdataCreateReferenceResponse);
  } catch (error) {
    log("is this better?", error);
  }
}

export interface CreatePrettierPullRequestParams extends Common {
  owner: string;
  repo: string;
  head: string;
  base: string;
}
export async function createPrettierPullRequest(
  params: CreatePrettierPullRequestParams
) {
  const { owner, repo, head, base } = params;
  const { github, log } = params;

  const title = prettierPullRequestTitle();
  const body = prettierPullRequestBody();
  const pullRequestsCreateParams: PullRequestsCreateParams = {
    owner,
    repo,
    title,
    head,
    base,
    body
  };
  const pullRequestsCreateResponse = await github.pullRequests.create(
    pullRequestsCreateParams
  );
  log(pullRequestsCreateResponse);
}
function prettierPullRequestTitle(): string {
  return "Prettier";
}
function prettierPullRequestBody(): string {
  return "I have formatted these files... Hope it helps.";
}

export async function updatePrettierPullRequest() {}

export interface TestParams extends Common {
  owner: string;
  repo: string;
  ref: string;
  sha: string;
}
export async function test(params: TestParams) {
  const { owner, repo, ref, sha } = params;
  const { github, log } = params;

  const prettierRef = ref + "-" + USER_NAME;
  await createPrettierReference({
    github,
    log,
    owner,
    repo,
    ref: prettierRef,
    sha
  });
  await createPrettierPullRequest({
    github,
    log,
    owner,
    repo,
    head: prettierRef,
    base: ref
  });
}
