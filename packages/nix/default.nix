{ lib, stdenv, fetchurl, nodejs, makeWrapper }:

stdenv.mkDerivation rec {
  pname = "platypus";
  version = "1.0.0";

  src = fetchurl {
    url = "https://registry.npmjs.org/platypus-cli/-/platypus-cli-${version}.tgz";
    sha256 = "REPLACE_WITH_ACTUAL_HASH";
  };

  nativeBuildInputs = [ makeWrapper ];

  buildInputs = [ nodejs ];

  installPhase = ''
    runHook preInstall

    # Create installation directory
    mkdir -p $out/lib/node_modules/platypus-cli
    cp -r * $out/lib/node_modules/platypus-cli/

    # Create bin directory
    mkdir -p $out/bin

    # Link the main binary
    ln -s $out/lib/node_modules/platypus-cli/bin/platypus.js $out/bin/platypus

    # Make executable
    chmod +x $out/bin/platypus

    # Wrap with node
    wrapProgram $out/bin/platypus \
      --prefix PATH : ${nodejs}/bin

    runHook postInstall
  '';

  meta = with lib; {
    description = "Multi-agent orchestration CLI for autonomous software development teams";
    homepage = "https://github.com/firfircelik/platypus-cli";
    license = licenses.mit;
    maintainers = with maintainers; [ platypus ];
    platforms = platforms.unix;
    mainProgram = "platypus";
  };
}
