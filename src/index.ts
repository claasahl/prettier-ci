import { Application, Context } from 'probot'
import { ReposGetContentParams, Response, ReposUpdateFileParams, GitdataGetReferenceParams, GitdataCreateReferenceParams, GitdataUpdateReferenceParams, ChecksCreateParams, ChecksUpdateParams, ReposGetCommitParams } from '@octokit/rest';
import * as prettier from "prettier";
import atob from 'atob';
import btoa from 'btoa';

// FIXME this just to keep "eslint-plugin-typescript" from complaining about unused references
Application.toString();

export = (app: Application) => {
  function accumulateFiles(accumulated: string[], current: string[]): string[] {
    return [...accumulated, ...current];
  }
  function getFiles(pushPayload: any): string[] {
    const commits: any[] = pushPayload.commits;
    const addedFiles = commits
      .map(commit => commit.added)
      .reduce(accumulateFiles);
    const modifiedFiles = commits
      .map(commit => commit.modified)
      .reduce(accumulateFiles);
    return [...addedFiles, ...modifiedFiles];
  }
  
  async function createOrGetPrettierReference(context: Context): Promise<string> {
    const owner = context.payload.repository.owner.name;
    const repo = context.payload.repository.name;
    const baseRef = context.payload.ref;
    const sha = context.payload.after;

    const ref: string = baseRef + "-prettier";
    const getReferenceParams: GitdataGetReferenceParams = {owner, repo, ref};
    const response = await context.github.gitdata.getReference(getReferenceParams).catch(reason => ({status: 500}));
    if(response.status === 200) {
      context.log("reference already existed", ref);
      return ref;
    } else {
      const createReferenceParams: GitdataCreateReferenceParams = {owner, repo, ref, sha};
      const response = await context.github.gitdata.createReference(createReferenceParams);
      if(response.status === 200) {
        context.log("reference created", ref);
        return ref;
      }
    }
    context.log("reference did not exist, nor could it be created", ref);
    return Promise.reject();
  }
  async function updatePrettierReference(context: Context, ref: string): Promise<boolean> {
    const owner = context.payload.repository.owner.name;
    const repo = context.payload.repository.name;
    const sha = context.payload.after;

    const updateRefParams: GitdataUpdateReferenceParams = {owner, repo, ref, sha, force: true};
    const response = await context.github.gitdata.updateReference(updateRefParams);
    return response.status === 200;
  }
  function isPrettierReference(ref: string): boolean {
    return ref.endsWith("-prettier");
  }

  // Your code here
  app.log("Yay, the app was loaded!");

  app.on(`*`, async context => {
    context.log({ event: context.event, action: context.payload.action });
  });

  
  app.on("push", async context => {
    if(!isPrettierReference(context.payload.ref)) {
      // this event handler is only concerned with formatting files in "prettier"
      context.log("Got 'push'-event on normal reference");
      const prettierRef = await createOrGetPrettierReference(context);
      const updatedPrettierRef = await updatePrettierReference(context, prettierRef);
      context.log("updated prettier reference", prettierRef, updatedPrettierRef);
    } else {
      // this event handler is only concerned with keeping "prettier" references up-to-date
      context.log("Got 'push'-event on prettier reference");
      const files = getFiles(context.payload);
      context.log(files);
      
      const owner = context.payload.repository.owner.name;
      const repo = context.payload.repository.name;
      const ref = context.payload.ref;
      const sha = context.payload.after;
      for(const path of files) {
        const params: ReposGetContentParams = {ref, path, owner, repo};
        context.log("Inspecting file", params);
        const options = {filepath: path};
        
        const contentResponse: Response<any> = await context.github.repos.getContent(params);
        if(contentResponse.status === 200 && contentResponse.data.encoding === "base64") {
          context.log("Retrieved file", params);
          const content = atob(contentResponse.data.content);

          if(!prettier.check(content, options)) {
            context.log("Found formatting issues in file", params);
            
            const formatted: string = prettier.format(content, options);
            const message = "a sprinkle eye candy";
            const bla: ReposUpdateFileParams = {content: btoa(formatted), owner, repo, path, message, branch: ref, sha};
            const updateResponse = await context.github.repos.updateFile(bla);
            context.log(updateResponse)
          } else {
            context.log("No formatting issues in file", params);
          }
        } else {
          context.log("Failed to retrieve file or encoding is not base64", params, contentResponse);
        }
      }
    }
  })

  app.on("check_suite", check_suite);

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

function repoOwner(context: Context): string {
  const {name, login} = context.payload.repository.owner;
  return name || login;
}
function repoName(context: Context): string {
  return context.payload.repository.name;
}

async function check_suite(context: Context): Promise<void> {
  const action: string = context.payload.action;
  if (action.match("(re)?requested")) {
    const checksCreateParams: ChecksCreateParams = { 
      owner: repoOwner(context),
       repo: repoName(context),
        name: "prettier",
        head_sha: context.payload.check_suite.head_sha,
         status: "in_progress" };
         context.log(JSON.stringify(checksCreateParams, null, 2))
         // TODO error handling
    const checksCreateResponse = await context.github.checks.create(checksCreateParams);
    context.log(JSON.stringify(checksCreateResponse, null, 2))

    const reposGetCommitParams: ReposGetCommitParams = {
      owner: repoOwner(context),
      repo: repoName(context),
      sha: context.payload.check_suite.head_sha,
    }
    const reposGetCommitResponse = await context.github.repos.getCommit(reposGetCommitParams);

    let files: string[] = [];
    if(reposGetCommitResponse.data.files) {
    for(const file of reposGetCommitResponse.data.files) {
        const params: ReposGetContentParams = {
          owner: repoOwner(context),
      repo: repoName(context),
      path: file.filename,
          ref: reposGetCommitResponse.data.sha};
        context.log("Inspecting file", params);
        const options = {filepath: file.filename};
        
        const contentResponse: Response<any> = await context.github.repos.getContent(params);
        if(contentResponse.data.encoding === "base64") {
          context.log("Retrieved file", params);
          const content = atob(contentResponse.data.content);

          if(!prettier.check(content, options)) {
            context.log("Found formatting issues in file", params);
            files.push(file.filename);
          } else {
            context.log("No formatting issues in file", params);
          }
        } else {
          context.log("Failed to retrieve file or encoding is not base64", params, contentResponse);
        }
    }
  }

  const summary = files.length === 0 ? "Pretty. Keep up the **good work**." : `Found ${files.length} files which could be *prettier*`;
  let text: string | undefined = undefined;
  if(files.length > 0) {
    text = "Here is a list of files which be *prettier*.\r\n"
    files.sort().forEach(filename => {
      text += `* ${filename}\r\n`
    })
  }
    const checksUpdateParams: ChecksUpdateParams = {
      owner: repoOwner(context),
      repo: repoName(context),
      check_run_id: checksCreateResponse.data.id as string,
       name: "prettier",
       status: "completed",
       conclusion: files.length === 0 ? "success" : "failure",
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
  }
}
