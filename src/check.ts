import { Context } from "probot";
import { Response, ReposGetContentParams } from "@octokit/rest";
import atob from "atob";
import prettier from "prettier";

export interface CheckFilesParams {
  context: Context;
  owner: string;
  repo: string;
  sha: string;
  files: string[];
}
export interface CheckFilesResult {
  owner: string;
  repo: string;
  sha: string;
  files: string[];
  passed: boolean;
  results: CheckFileResult[];
}
export enum Error {
  NOT_BASE64_ENCODED,
  NOT_FORMATTED_WITH_PRETTIER,
  NOT_ABLE_TO_CHECK_CONTENTS
}
export interface CheckFileParams {
  context: Context;
  owner: string;
  repo: string;
  sha: string;
  file: string;
}
export interface CheckFileResult {
  /**
   * Owner of the repository.
   */
  owner: string;
  repo: string;
  sha: string;
  file: string;
  passed: boolean;
  errors: Error[];
}

/**
 * Fetches files from the specified repository and check wheather they have been formatted with prettier.
 * @param params TODO document CheckFilesParams and CheckFilesResult
 */
export async function checkFiles(
  params: CheckFilesParams
): Promise<CheckFilesResult> {
  const { context, owner, repo, sha, files } = params;
  const results: CheckFileResult[] = [];
  let passed = true;
  for (const file of files) {
    const result = await checkFile({ context, owner, repo, sha, file });
    passed = passed && result.passed;
    results.push(result);
  }
  return { owner, repo, sha, files, passed, results };
}

/**
 * Fetches a file from the specified repository and checks wheather it has been formatted with prettier.
 * @param params TODO document CheckFileParams and CheckFileResult
 */
export async function checkFile(
  params: CheckFileParams
): Promise<CheckFileResult> {
  const { context, owner, repo, sha, file } = params;
  const prettierOptions = { filepath: file };
  const errors: Error[] = [];

  try {
    const reposGetContentParams: ReposGetContentParams = {
      owner,
      repo,
      path: file,
      ref: sha
    };
    const contentResponse: Response<
      any
    > = await context.github.repos.getContent(reposGetContentParams);
    if (contentResponse.data.encoding === "base64") {
      const content = atob(contentResponse.data.content);
      if (!prettier.check(content, prettierOptions)) {
        errors.push(Error.NOT_FORMATTED_WITH_PRETTIER);
      }
    } else {
      errors.push(Error.NOT_BASE64_ENCODED);
    }
  } catch (error) {
    context.log(params, Error.NOT_ABLE_TO_CHECK_CONTENTS, error);
    errors.push(Error.NOT_ABLE_TO_CHECK_CONTENTS);
  }
  return {
    owner,
    repo,
    sha,
    file,
    passed: errors.length === 0,
    errors
  };
}
