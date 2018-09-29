// You can import your modules
// import index from '../src/index'

import * as Rx from "rxjs";
import { ofEvent, ofEventFilter } from "../src/utils";

describe("ofEventFilter / ofEvent", () => {
test("that '*' matches any event", async () => {
expect(ofEventFilter("*")(fakeEvent("some event", "some action"))).toBe(
true
);
expect(ofEventFilter("*")(fakeEvent("some other event"))).toBe(true);
});

test("that event name matches", async () => {
expect(ofEventFilter("push")(fakeEvent("push", "some action"))).toBe(true);
expect(ofEventFilter("push")(fakeEvent("push"))).toBe(true);
expect(ofEventFilter("push")(fakeEvent("check_suite"))).toBe(false);
});

test("that event name and action match", async () => {
expect(
ofEventFilter("check_run.created")(fakeEvent("check_run", "created"))
).toBe(true);
expect(
ofEventFilter("check_run.created")(fakeEvent("check_run", "rerequested"))
).toBe(false);
expect(ofEventFilter("check_run.created")(fakeEvent("check_run"))).toBe(
false
);
});

test("that matched events are kept", async () => {
const event1 = fakeEvent("push", "action");
const event2 = fakeEvent("another event");
const result = await Rx.of(event1, event2)
.pipe(ofEvent("push"))
.toPromise();
expect(result).toBe(event1);
});

test("that unmatched events are dropped", async () => {
const event1 = fakeEvent("event", "action");
const event2 = fakeEvent("another event");
const result = await Rx.of(event1, event2)
.pipe(ofEvent("push"))
.toPromise();
expect(result).toBe(undefined);
});

function fakeEvent(name: string, action?: string) {
return { event: name, payload: { action } };
}
});