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
  };
}
