import { Application } from "probot";

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

  // Your code here
  app.log("Yay, the app was loaded!");

  app.on(`*`, async context => {
    context.log({ event: context.event, action: context.payload.action });
  });

  app.on("push", async context => {
    context.log(JSON.stringify(context, null, 2));
    const files = getFiles(context.payload);
    context.log(files);
  });

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
