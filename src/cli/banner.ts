/**
 * Platypus ASCII Art Banner
 *
 * Renders a duck-billed platypus (Ornithorhynchus anatinus) in ASCII art
 * with optional colors and formatting.
 */

export const PLATYPUS_ASCII_ART = `
   ▄▄▄▄▄▄
  ██▀██▀██▄
 ████▀█▀
 ██▀  ██▀
 ▀  ▀
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
  const yellow = (s: string) => c(s, "\x1b[33m");
  const cyan = (s: string) => c(s, "\x1b[36m");
  const dim = (s: string) => c(s, "\x1b[2m");

  // Render the platypus ASCII art in yellow/bold
  const platypus = yellow(
    bold(
      ["   ▄▄▄▄▄▄", "  ██▀██▀██▄", " ████▀█▀", " ██▀  ██▀", " ▀  ▀"].join("\n"),
    ),
  );

  // Title below the art
  const title = cyan("Platypus CLI");
  const version = dim("v1.0.0");
  const hint = dim("Tip: Add API keys with `platypus keys add <provider>`");

  return [platypus, "", title, version, hint, ""].join("\n");
}
