import { Application } from "probot";
import * as check_run from "./events/check_run";
import * as check_suite from "./events/check_suite";

export = (app: Application) => {
  // Your code here
  app.log("Yay, the app was loaded!");

  app.on(`*`, async context => {
    context.log({ event: context.event, action: context.payload.action });
  });

  app.on("check_suite.requested", check_suite.requested);
  app.on("check_suite.rerequested", check_suite.requested);
  app.on("check_run.rerequested", check_run.rerequested);
  app.on("check_run.created", check_run.created);
  app.on("check_run.requested_action", check_run.requested_action);

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
