import { test, getPrettierPullRequests } from './pull_requests';
import { Application, Context } from 'probot'
import { ChecksCreateParams, ChecksUpdateParams, ReposCompareCommitsParams } from '@octokit/rest';
import { checkFiles } from './check';
import * as check_run from "./events/check_run";
import * as check_suite from "./events/check_suite";

// FIXME this just to keep "eslint-plugin-typescript" from complaining about unused references
Application.toString();

export = (app: Application) => {
  // Your code here
  app.log("Yay, the app was loaded!");

  app.on(`*`, async context => {
    context.log({ event: context.event, action: context.payload.action });
  });
  
  app.on("push_____", push)
  app.on("check_suite.requested_____", check_suite__requested);

  app.on("check_suite.requested", check_suite.requested);
  app.on("check_run.created", check_run.created);
  app.on("check_run.rerequested", check_run.rerequested);

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

async function push(context: Context): Promise<void> {
  const owner = repoOwner(context);
    const repo = repoName(context);
  const ref = context.payload.ref;
  const sha = context.payload.after;
  const pullRequests = await getPrettierPullRequests({github: context.github, log: context.log, owner, repo, state: "open", base: ref});
  if(!pullRequests || pullRequests.length === 0) {
    test({github: context.github, log: context.log, owner, repo, ref, sha})
  }
}




function repoOwner(context: Context): string {
  const {name, login} = context.payload.repository.owner;
  return name || login;
}
function repoName(context: Context): string {
  return context.payload.repository.name;
}

async function check_suite__requested(context: Context): Promise<void> {
    const owner = repoOwner(context);
    const repo = repoName(context);
    const sha = context.payload.check_suite.head_sha;

    const checksCreateParams: ChecksCreateParams = { 
      owner,
       repo,
        name: "prettier",
        head_sha: sha,
         status: "in_progress" };
         context.log(JSON.stringify(checksCreateParams, null, 2))
         // TODO error handling
    const checksCreateResponse = await context.github.checks.create(checksCreateParams);
    context.log(JSON.stringify(checksCreateResponse, null, 2))

    const reposCompareCommitsParams: ReposCompareCommitsParams = {owner, repo, base: context.payload.check_suite.before, head: context.payload.check_suite.after};
    const reposCompareCommitsResponse = await context.github.repos.compareCommits(reposCompareCommitsParams);

    
    if(reposCompareCommitsResponse.data.files) {
      const results = await checkFiles({
        context,
        owner,
      repo,
      sha,
      files: reposCompareCommitsResponse.data.files.filter((file: any) => file.status != "deleted").map((file: any) => file.filename)
      })

      const failedResults = results.results.filter(result => !result.passed);
  const summary = results.passed ? "Pretty. Keep up the **good work**." : `Found ${failedResults.length} files which could be *prettier*`;
  let text: string | undefined = undefined;
  if(!results.passed) {
    text = "Here is a list of files which be *prettier*.\r\n"
    failedResults.forEach(result => {
      // TODO possibly create an issue if error != NOT_FORMATTED_WITH_PRETTIER
      text += `* [${result.file}](https://github.com/${owner}/${repo}/blob/${sha}/${result.file})\r\n`
    })
  }
    const checksUpdateParams: ChecksUpdateParams = {
      owner,
      repo,
      check_run_id: checksCreateResponse.data.id as string,
       name: "prettier",
       status: "completed",
       conclusion: results.passed ? "success" : "failure",
       completed_at: new Date().toISOString(),
       output: {
         title: "Prettier",
         summary,
         text
       }
    }
    context.log(JSON.stringify(checksUpdateParams, null, 2))
    // TODO error handling
    const checksUpdateResponse = await context.github.checks.update(checksUpdateParams);
    context.log(JSON.stringify(checksUpdateResponse, null, 2))
  } else {
    context.log("commit did not reference any files")
  }
}
