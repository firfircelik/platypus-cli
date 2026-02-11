{
  description = "Platypus CLI - Multi-agent orchestration for software development teams";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
      pkgsFor = system: import nixpkgs { inherit system; };
    in {
      packages = forAllSystems (system: let
        pkgs = pkgsFor system;
      in {
        default = pkgs.callPackage ./default.nix {};
      });

      apps = forAllSystems (system: let
        pkgs = pkgsFor system;
      in {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/platypus";
        };
      });

      devShells = forAllSystems (system: let
        pkgs = pkgsFor system;
      in {
        default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            npm
          ];
        };
      });

      overlay = final: prev: {
        platypus = self.packages.${final.system}.default;
      };

      nixosModules.default = { config, lib, pkgs, ... }:
        with lib;
        let cfg = config.services.platypus;
        in {
          options.services.platypus = {
            enable = mkEnableOption "Platypus CLI";
          };

          config = mkIf cfg.enable {
            environment.systemPackages = [ self.packages.${pkgs.system}.default ];
          };
        };
    };
}
