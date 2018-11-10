import { Application, Context } from "probot";
import * as CheckSuite from "./events/check_suite";
import * as CheckRun from "./events/check_run";
import { DEFAULT_CONFIG } from "./config";
import { Config } from "./types";

export = (app: Application) => {
  // Your code here
  app.log("Yay, the app was loaded!");

  // #1
  app.on("check_suite.requested", withConfig(CheckSuite.requested));
  app.on("check_suite.rerequested", withConfig(CheckSuite.rerequested));
  app.on("check_run.rerequested", withConfig(CheckRun.rerequested));

  // #2
  app.on("check_run.created", withConfig(CheckRun.created));

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

function withConfig(
  callback: (context: Context, config: Config) => Promise<void>
): (context: Context) => Promise<void> {
  return async context => {
    // TODO ensure that config only contains expected fields (security)
    const config: Config = await context.config(
      "prettier-ci.yml",
      DEFAULT_CONFIG
    );
    callback(context, config);
  };
}
