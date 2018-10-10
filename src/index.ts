import { Application, Context } from 'probot'
import * as check_run from './events/check_run'
import * as check_suite from './events/check_suite'
import { Config } from './types';
import { DEFAULT_CONFIG } from './defaultConfig';

import * as jsonwebtoken from "jsonwebtoken"
import {findPrivateKey} from "probot/lib/private-key"
import * as fs from "fs"
import * as git from "isomorphic-git"
import * as prettier from "prettier"

function withConfig(callback: (context: Context, config: Config) => Promise<void>): (context: Context) => Promise<void> {
  return async context => {
    const config = await context.config("prettier-ci.yml", DEFAULT_CONFIG);
    return callback(context, config);
  }
}

export = (app: Application) => {
  // Your code here
  app.log('Yay, the app was loaded!')

  app.on(`*`, async context => {
    context.log({ event: context.event, action: context.payload.action })
  })
  
  app.on("check_suite.completed", async context => {
    var options = {
      id: process.env.APP_ID,
      cert: findPrivateKey()
    };
    var payload = {
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000),
      iss: options.id // GitHub App ID
    };
    const jwt = jsonwebtoken.sign(payload, options.cert, {
      algorithm: "RS256"
    });
    context.github.authenticate({ type: "app", token: jwt });
    const response = await context.github.apps.createInstallationToken({
      installation_id: context.payload.installation.id
    });
    context.log(response);
    const { token } = response.data;
    git.plugins.set("fs", fs);

    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const url = `https://github.com/${owner}/${repo}.git`;
    const dir = `../repos/${owner}/${repo}`;
    if (!fs.existsSync(dir)) {
      await git.clone({ url, dir, ref: "develop", username: "x-access-token", password: token });
    } else {
      await git.fetch({dir, username: "x-access-token", password: token });
      await git.checkout({ dir, ref: "remotes/origin/develop" });
      await git.deleteBranch({dir, ref: "develop"})
      await git.checkout({dir, ref: "develop"})
      //await git.checkout({dir, ref: "9b22733cacbde8c00a5136059a70630b214a12df"})
    }
    const info = prettier.getSupportInfo();
    const extensions = info.languages
      .map(language => language.extensions)
      .reduce((acc, val) => acc.concat(val), []);

    const encoding = "utf8";
    function readDir(dir: string): string[] {
      const files = fs.readdirSync(dir, { encoding });
      for (const file of fs.readdirSync(dir, { encoding })) {
        const lstat = fs.lstatSync(dir + "/" + file);
        if (lstat.isDirectory()) {
          files.push(
            ...readDir(dir + "/" + file).map(entry => file + "/" + entry)
          );
        }
      }
      return files;
    }

    const files = readDir(dir);
    let formattedSources = false;
    for (const file of files) {
      const lstat = fs.lstatSync(dir + "/" + file);
      if (lstat.isFile()) {
        if (
          extensions.filter(extensions => file.endsWith(extensions)).length > 0
        ) {
          const source = fs.readFileSync(dir + "/" + file, { encoding });
          const passed = prettier.check(source, { filepath: file });
          if (!passed) {
            const formattedSource = await prettier.format(source, {
              filepath: file
            });
            fs.writeFileSync(dir + "/" + file, formattedSource);
            await git.add({ filepath: file, dir });
            formattedSources = true;
          }
          console.log(file, passed);
        } else {
          console.log(file, "not supported");
        }
      } else if (lstat.isDirectory()) {
        // TODO recursion
        //files = [...files, ...fs.readdirSync(file, {encoding})]
        console.log(file, "directory");
      }
    }
    if (formattedSources) {
      console.log("committing changes.");
      const author = {
        name: "prettier-ci",
        email: "no@ema.il"
      };
      const message = "formatted sources";
      await git.commit({ dir, author, message });
    } else {
      console.log("no changes. nice!");
    }
  });

  app.on("check_suite.requested", withConfig(check_suite.requested))
  app.on("check_suite.rerequested", withConfig(check_suite.requested))
  app.on("check_run.rerequested", withConfig(check_run.rerequested))
  app.on("check_run.created", withConfig(check_run.created))
  app.on("check_run.requested_action", withConfig(check_run.requested_action))

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
