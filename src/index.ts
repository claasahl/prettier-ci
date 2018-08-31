import { Application } from 'probot'
import { ReposGetContentParams, Response, ReposUpdateFileParams } from '@octokit/rest';
import * as prettier from "prettier";
import atob from 'atob';
import btoa from 'btoa';

// FIXME this just to keep "eslint-plugin-typescript" from complaining about unused references
Application.toString()

export = (app: Application) => {
  function accumulateFiles(accumulated: string[], current: string[]): string[] {
    return [...accumulated, ...current];
  }
  function getFiles(pushPayload: any): string[] {
    const commits: any[] = pushPayload.commits;
    const addedFiles = commits.map(commit => commit.added).reduce(accumulateFiles);
    const modifiedFiles = commits.map(commit => commit.modified).reduce(accumulateFiles);
    return [...addedFiles, ...modifiedFiles];
  }

  // Your code here
  app.log('Yay, the app was loaded!')

  app.on(`*`, async context => {
    context.log({event: context.event, action: context.payload.action})
  })

  app.on('push', async context => {
    context.log(JSON.stringify(context, null, 2))
    const files = getFiles(context.payload);
    context.log(files);

    const owner = context.payload.repository.owner.name;
    const repo = context.payload.repository.name;
    const ref = context.payload.ref;
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
        const sha = contentResponse.data.sha;
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
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
