import * as rx from 'rxjs'
import { Application } from 'probot'
import * as check_run from './events/check_run'
import * as check_suite from './events/check_suite'

import {flatMap, tap, retry, map} from 'rxjs/operators'
import { ofEvent } from './utils'


export = (app: Application) => {
  // Your code here
  app.log('Yay, the app was loaded!')

  app.on(`*`, async context => {
    const event = rx.of(context).pipe(
      tap(context => context.log({ event: context.event, action: context.payload.action })))
    return rx.race(
      //event.pipe(ofEvent("push")),
      event.pipe(ofEvent('check_suite.requested'), flatMap(check_suite.requested)),
      event.pipe(ofEvent('check_suite.rerequested'), flatMap(check_suite.requested)),
      event.pipe(ofEvent('check_run.rerequested'), flatMap(check_run.rerequested)),
      event.pipe(ofEvent('check_run.created'), flatMap(check_run.created)),
      event.pipe(ofEvent('check_run.requested_action'), flatMap(check_run.requested_action)))
      .pipe(retry(2), map(() => undefined), tap(undefined, e => console.log(e)))
      .toPromise()
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
