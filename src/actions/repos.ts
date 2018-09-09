import {
  ReposCompareCommitsParams,
  ReposCompareCommitsResult,
  ReposGetContentParams,
  ReposGetContentResult
} from "../types";
import {} from "probot/lib/github";
import atob from "atob";

export async function compareCommits(
  params: ReposCompareCommitsParams
): Promise<ReposCompareCommitsResult> {
  const { github, log, ...compareParams } = params;
  try {
    const response = await github.repos.compareCommits(compareParams);
    const files = response.data.files.map((file: any) => ({
      sha: file.sha,
      name: file.filename,
      status: file.status
    }));
    return { params, files };
  } catch (error) {
    log("error while comparing commits", compareParams, error);
  }
  return { params, files: [] };
}

export async function getContent(
  params: ReposGetContentParams
): Promise<ReposGetContentResult> {
  const { github, log, ...getContentParams } = params;
  try {
    const response = await github.repos.getContent(getContentParams);
    if (response.data.encoding === "base64") {
      const content = atob(response.data.content);
      return { params, content };
    } else {
      log("contents are not base64 encoded", getContentParams);
    }
  } catch (error) {
    log("error while getting content", getContentParams, error);
  }
  return { params };
}
