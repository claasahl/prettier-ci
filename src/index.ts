import { Application } from "probot";
import * as CheckSuite from "./events/check_suite";
import * as CheckRun from "./events/check_run";
import MemoryFileSystem from "memory-fs";

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

// add lstat + lstatSync to memory-fs
// see https://linux.die.net/man/2/lstat
(MemoryFileSystem as any).prototype["lstatSync"] = MemoryFileSystem.prototype.statSync;
(MemoryFileSystem as any).prototype["lstat"] = MemoryFileSystem.prototype.stat;
