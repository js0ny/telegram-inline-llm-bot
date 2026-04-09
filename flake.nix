{
  description = "TypeScript Telegram Bot Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    supportedSystems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
    forEachSystem = nixpkgs.lib.genAttrs supportedSystems;
  in {
    devShells = forEachSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            pnpm
            typescript
            typescript-language-server
          ];

          shellHook = ''
            echo "Telegram Bot (TypeScript) 开发环境已加载。"
            echo "Node 版本: $(node -v)"
            echo "pnpm 版本: $(pnpm -v)"
          '';
        };
      }
    );

    packages = forEachSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        default = pkgs.stdenv.mkDerivation {
          pname = "tg-inline-llm-bot";
          version = "1.1.0";

          src = ./.;

          nativeBuildInputs = [
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.pnpm.configHook
            pkgs.makeWrapper
          ];

          pnpmDeps = pkgs.pnpm.fetchDeps {
            pname = "tg-inline-llm-bot";
            version = "1.0.0";
            src = ./.;
            fetcherVersion = 3;
            hash = "sha256-tttHXMpxKl+d6/vPdlfyGo4I70HNUaeOJMTuqjUbjhQ=";
          };

          buildPhase = ''
            runHook preBuild
            pnpm run build
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall

            mkdir -p $out/lib/bot $out/bin

            cp -r dist $out/lib/bot/

            makeWrapper ${pkgs.nodejs_22}/bin/node $out/bin/tg-inline-llm-bot \
              --add-flags "$out/lib/bot/dist/bot.js" \
              --set NODE_ENV production

            runHook postInstall
          '';
        };
      }
    );

    nixosModules.default = {
      config,
      lib,
      pkgs,
      ...
    }:
      with lib; let
        cfg = config.services.tg-inline-llm-bot;
      in {
        options.services.tg-inline-llm-bot = {
          enable = mkEnableOption "Telegram Inline LLM Bot";
          package = mkOption {
            type = types.package;
            default = self.packages.${pkgs.system}.default;
            description = "The tg-inline-llm-bot package to use.";
          };
          model = mkOption {
            type = types.str;
            default = "openai/gpt-5.4";
            example = "openai/gpt-5.4";
            description = "The model used in the bot";
          };
          apiBase = mkOption {
            type = types.str;
            default = "https://openrouter.ai/api/v1";
            example = "https://openrouter.ai/api/v1";
            description = "The api base for the model";
          };
          extraEnvironment = lib.mkOption {
            type = lib.types.attrsOf lib.types.str;
            default = {};
            description = "Extra plain-text environment variables for the service.";
          };

          envFile = mkOption {
            type = types.nullOr types.path;
            default = null;
            example = "/etc/tgbot/.env";
            description = ''
              Path to the environment file containing API_KEY, BASE_URL, MODEL, BOT_TOKEN and ALLOWED_USER_ID.
              Refer to .env.example of this project for more informations.
              Note that this has lower priority than other declared config.
            '';
          };
        };
        config = mkIf cfg.enable {
          systemd.services.tg-inline-llm-bot = {
            description = "Telegram Inline LLM Bot";
            after = ["network-online.target"];
            wantedBy = ["multi-user.target"];

            environment =
              {
                MODEL = cfg.model;
                BASE_URL = cfg.apiBase;
              }
              // cfg.extraEnvironment;

            serviceConfig =
              {
                ExecStart = lib.getExe cfg.package;
                Restart = "always";
                DynamicUser = true;
                ProtectSystem = "strict";
                ProtectHome = true;
                PrivateTmp = true;
                NoNewPrivileges = true;
              }
              // lib.optionalAttrs (cfg.envFile != null) {
                EnvironmentFile = cfg.envFile;
              };
          };
        };
      };
  };
}
