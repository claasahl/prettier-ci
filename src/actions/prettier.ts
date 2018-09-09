import * as prettier from "prettier";

export async function check(
  content: string,
  options: prettier.Options
): Promise<boolean> {
  return prettier.check(content, options);
}
