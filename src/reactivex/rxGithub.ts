import * as Rx from "rxjs";
import * as gh from "@octokit/rest";
import { Context } from "probot";
import { Projection } from "../types";

export namespace rxChecks {
  export function create(
    context: Context,
    project: Projection<gh.ChecksCreateParams>
  ) {
    const params = project(context);
    const ctx = Rx.of(context);
    const response = Rx.from(context.github.checks.create(params));
    return Rx.combineLatest(ctx, response, (context, response) => ({
      context,
      response
    }));
  }
  export function update(
    context: Context,
    project: Projection<gh.ChecksUpdateParams>
  ) {
    const params = project(context);
    const ctx = Rx.of(context);
    const response = Rx.from(context.github.checks.update(params));
    return Rx.combineLatest(ctx, response, (context, response) => ({
      context,
      response
    }));
  }
}

export namespace rxRepos {
  export function compareCommits(
    context: Context,
    project: Projection<gh.ReposCompareCommitsParams>
  ) {
    const params = project(context);
    const ctx = Rx.of(context);
    const response = Rx.from(context.github.repos.compareCommits(params));
    return Rx.combineLatest(ctx, response, (context, response) => ({
      context,
      response
    }));
  }
  export function getContent(
    context: Context,
    project: Projection<gh.ReposGetContentParams>
  ) {
    const params = project(context);
    const ctx = Rx.of(context);
    const response = Rx.from(context.github.repos.getContent(params));
    return Rx.combineLatest(ctx, response, (context, response) => ({
      context,
      response
    }));
  }
}
