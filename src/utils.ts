import * as Rx from 'rxjs'
import { filter } from 'rxjs/operators'
import { ProbotEvent } from './types'

export const USER_NAME = process.env.name || 'prettier'
export const USER_TYPE = 'bot'

export function ofEvent<T extends ProbotEvent> (event: string): Rx.MonoTypeOperatorFunction<T> {
  return filter(ofEventFilter(event))
}

export function ofEventFilter<T extends ProbotEvent> (event: string) {
  return (context: T) => event === '*' || context.event === event || (context.event + '.' + context.payload.action) === event
}
