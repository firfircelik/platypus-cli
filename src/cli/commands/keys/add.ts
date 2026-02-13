import { Args, Flags } from "@oclif/core";
import inquirer from "inquirer";
import { BaseCommand } from "../../base-command.js";
import { validateProviderKey } from "../../../crypto/providers.js";

export default class KeysAdd extends BaseCommand {
  static description = "Add an encrypted API key for a provider";

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
    key: Flags.string({
      char: "k",
      required: false,
      description: "API key (omit to prompt securely)",
    }),
    validate: Flags.boolean({
      default: true,
      description: "Validate key with provider API when supported",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(KeysAdd);
    const rawProvider = args.provider ?? flags.provider;
    if (!rawProvider) {
      this.error(
        "Provider is required. Usage: platypus keys add <provider>\n  e.g. platypus keys add openai",
      );
    }
    const provider = rawProvider.trim().toLowerCase();

    let apiKey = flags.key;
    if (!apiKey) {
      const answer = await inquirer.prompt<{ apiKey: string }>([
        {
          name: "apiKey",
          message: `Enter API key for ${provider}`,
          type: "password",
          mask: "*",
        },
      ]);
      apiKey = answer.apiKey;
    }

    const keyStore = await this.getKeyStore();

    if (flags.validate) {
      const result = await validateProviderKey(provider, apiKey);
      if (!result.valid) {
        this.error(
          `Key validation failed for ${provider}: ${result.error ?? "Unknown error"}`,
        );
      }
    }

    await keyStore.storeKey(provider, apiKey);
    this.log(`Stored encrypted key for provider: ${provider}`);
  }
}
