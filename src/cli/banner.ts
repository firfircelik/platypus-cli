/**
 * Platypus CLI Banner
 *
 * Renders "PLATYPUS" in bold ASCII block letters with version info.
 */

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

function getVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(__dirname, "..", "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version ?? "0.0.0";
  } catch {
    try {
      const require = createRequire(import.meta.url);
      const pkg = require("../../package.json");
      return pkg.version ?? "0.0.0";
    } catch {
      return "0.0.0";
    }
  }
}

export const PLATYPUS_ASCII_ART = `
 ████████╗ ██╗      █████╗ ████████╗██╗   ██╗██████╗ ██╗   ██╗███████╗
 ██╔═══██║ ██║     ██╔══██╗╚══██╔══╝╚██╗ ██╔╝██╔══██╗██║   ██║██╔════╝
 ████████║ ██║     ███████║   ██║    ╚████╔╝ ██████╔╝██║   ██║███████╗
 ██╔═════╝ ██║     ██╔══██║   ██║     ╚██╔╝  ██╔═══╝ ██║   ██║╚════██║
 ██║       ███████╗██║  ██║   ██║      ██║   ██║     ╚██████╔╝███████║
 ╚═╝       ╚══════╝╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝      ╚═════╝ ╚══════╝
`;

export function shouldShowPlatypusBanner(): boolean {
  const v = (process.env.PLATYPUS_BANNER ?? "").trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  return true;
}

export function renderPlatypusBanner(input?: { color?: boolean }): string {
  const color =
    input?.color ??
    (Boolean(process.stdout.isTTY) &&
      !(process.env.NO_COLOR && process.env.NO_COLOR.trim().length > 0));

  const c = (s: string, open: string, close = "\x1b[0m") =>
    color ? `${open}${s}${close}` : s;
  const bold = (s: string) => c(s, "\x1b[1m");
  const cyan = (s: string) => c(s, "\x1b[36m");
  const dim = (s: string) => c(s, "\x1b[2m");

  const logo = cyan(
    bold(
      [
        " ████████╗ ██╗      █████╗ ████████╗██╗   ██╗██████╗ ██╗   ██╗███████╗",
        " ██╔═══██║ ██║     ██╔══██╗╚══██╔══╝╚██╗ ██╔╝██╔══██╗██║   ██║██╔════╝",
        " ████████║ ██║     ███████║   ██║    ╚████╔╝ ██████╔╝██║   ██║███████╗",
        " ██╔═════╝ ██║     ██╔══██║   ██║     ╚██╔╝  ██╔═══╝ ██║   ██║╚════██║",
        " ██║       ███████╗██║  ██║   ██║      ██║   ██║     ╚██████╔╝███████║",
        " ╚═╝       ╚══════╝╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝      ╚═════╝ ╚══════╝",
      ].join("\n"),
    ),
  );

  const version = getVersion();
  const ver = dim(`v${version}`);
  const hint = dim("Tip: Add API keys with `platypus keys add openai`");

  return [logo, "", ver, hint, ""].join("\n");
}
