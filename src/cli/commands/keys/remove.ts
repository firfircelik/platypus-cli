import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../base-command.js";

export default class KeysRemove extends BaseCommand {
  static description = "Remove a stored API key for a provider";

  static args = {
    provider: Args.string({
      required: false,
      description: "Provider id (e.g. openai, anthropic, google)",
    }),
  };

  static flags = {
    provider: Flags.string({
      char: "p",
      required: false,
      description: "Provider id (e.g. openai)",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(KeysRemove);
    const rawProvider = args.provider ?? flags.provider;
    if (!rawProvider) {
      this.error(
        "Provider is required. Usage: platypus keys remove <provider>\n  e.g. platypus keys remove openai",
      );
    }
    const provider = rawProvider.trim().toLowerCase();
    const store = await this.getKeyStore();
    await store.deleteKey(provider);
    this.log(`Removed key for provider: ${provider}`);
  }
}
