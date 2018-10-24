import { Application } from "probot";
import * as CheckSuite from "./events/check_suite";
import * as CheckRun from "./events/check_run";

export = (app: Application) => {
  // Your code here
  app.log("Yay, the app was loaded!");

  // #1
  app.on("check_suite.requested", CheckSuite.requested);
  app.on("check_suite.rerequested", CheckSuite.rerequested);
  app.on("check_run.rerequested", CheckRun.rerequested);

  // #2
  app.on("check_run.created", CheckRun.created);

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
