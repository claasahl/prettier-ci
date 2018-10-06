import { Config } from "./types";

export const DEFAULT_CONFIG: Config = {
    REFERENCE_PREFIX: "refs/heads/prettier/",
    COMMIT_MESSAGE_PREFIX: "formatted file: ",
    PULL_REQUEST_TITLE_PREFIX: "Prettified branch: ",
    checks: {
        name: "Prettier-CI",
        output: {
            title: "Prettier-CI",
        },
        actions: {
            fix: {
                identifier: "fix",
                label: "Fix",
                description: "Make files *prettier*.",
            }
        }
    }
}