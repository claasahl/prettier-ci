import { Context } from "probot";

import * as Rx from "rxjs";
import { filter } from "rxjs/operators";

export const USER_NAME = process.env.name || "prettier";
export const USER_TYPE = "bot";

export function ofEvent(event: string): Rx.MonoTypeOperatorFunction<Context> {
    return filter(context => event === "*" || context.event === event || (context.event + "." + context.payload.action) === event);
}