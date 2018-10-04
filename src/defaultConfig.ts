import { Config } from "./types";

export const DEFAULT_CONFIG: Config = {
    CHECKS_NAME: "Prettier-CI",
    REFERENCE_PREFIX: "refs/heads/prettier/",
    COMMIT_MESSAGE_PREFIX: "formatted file: ",
    PULL_REQUEST_TITLE_PREFIX: "Prettified branch: "
}