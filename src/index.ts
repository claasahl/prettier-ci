import { Application, Context } from 'probot'
import * as check_run from './events/check_run'
import * as check_suite from './events/check_suite'
import { Config } from './types';
import { DEFAULT_CONFIG } from './defaultConfig';

import * as jsonwebtoken from "jsonwebtoken"
import {findPrivateKey} from "probot/lib/private-key"
import * as fs from "fs"
import * as git from "isomorphic-git"
import { deepStrictEqual } from 'assert';

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
    }
    var payload = {
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000),
      iss: options.id // GitHub App ID
    };
    const jwt = jsonwebtoken.sign(payload, options.cert, { algorithm: 'RS256' })
    context.github.authenticate({type: "app", token: jwt})
    const response = await context.github.apps.createInstallationToken({installation_id: context.payload.installation.id})
    context.log(response)
    const {token} = response.data
    git.plugins.set('fs', fs)

    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const url = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
    const dir = `../repos/${owner}/${repo}`
    if(!fs.existsSync("./repos")) {
      fs.mkdirSync("./repos")
    }
    if(!fs.existsSync(`./repos/${owner}`)) {
      fs.mkdirSync(`./repos/${owner}`)
    }
    if(!fs.existsSync(`./repos/${owner}/${repo}`)) {
      fs.mkdirSync(`./repos/${owner}/${repo}`)
    }
    git.clone({url, dir})
  })

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
