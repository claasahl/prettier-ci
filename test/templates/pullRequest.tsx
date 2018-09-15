export default function template(url: string, files: number, user: string) {
  return `This [check run](${url}) identified ${files} ${
    files == 1 ? "file" : "files"
  }, which ${files == 1 ? "needs" : "need"} formatting.

@${user} requested these files to be fixed.`;
}
