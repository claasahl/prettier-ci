import { Application, Context } from 'probot'
import * as check_run from './events/check_run'
import * as check_suite from './events/check_suite'
import { Config, Mode } from './types';
import { DEFAULT_CONFIG } from './defaultConfig';

import { PartialChecks } from './checks/partial';
import { CompleteChecks } from './checks/complete';
import { BaseChecks } from './checks/base';

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
 
  app.on("check_suite.requested", withConfig(check_suite.requested))
  app.on("check_suite.rerequested", withConfig(check_suite.requested))
  app.on("check_run.rerequested", withConfig(check_run.rerequested))
  app.on("check_run.created", withConfig(onCheckRun))
  app.on("check_run.requested_action", withConfig(check_run.requested_action))
  
  // For more information on building apps:
  // https://probot.github.io/docs/
  
  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

async function onCheckRun(context: Context, config: Config) {
  let mode: Mode = config.mode;
  if(config.mode === Mode.auto) {
    const largeRepository = context.payload.repository.size > 10000
    mode = largeRepository ? Mode.partial : Mode.complete
  }
  
  let checks: BaseChecks;
  if(mode === Mode.partial) {
    checks = new PartialChecks(context, config)
  } else if(mode === Mode.complete) {
    checks = new CompleteChecks(context, config)
  } else {
    throw new Error("unsupported mode: " + mode)
  }
  await checks.onCheckRun();
}