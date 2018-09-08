import * as rx from "rxjs"
import * as prettier from "prettier"

export namespace rxPrettier {
    export function check(source: string, options?: prettier.Options): rx.Observable<boolean> {
        return rx.of(prettier.check(source, options))
    }
}