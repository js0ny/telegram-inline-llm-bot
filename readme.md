# Simple Telegram Inline LLM Query Bot

Build and run

```bash
nix develop
pnpm i
npx tsx bot.ts
```

See [.env.example](./.env.example) for configuration.

## Deploy 

### Using NixOS flake

```nix
# flake.nix
{
  inputs = {
    telegram-inline-llm-bot = {
      url = "github:js0ny/telegram-inline-llm-bot";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
}
```

In your NixOS Configuration:

```nix
services.tg-inline-llm-bot = {
  enable = true;
  apiBase = "https://openrouter.ai/v1";
  model = "openai/gpt-5.4";
  envFile = "/etc/secrets/tg-inline-llm-bot.env";
};
```
