{
  pkgs ? import <nixpkgs> { },
  withFix ? false,
}:

pkgs.buildNpmPackage {
  name = "demo";
  src = ./.;

  npmDepsHash = "sha256-vUk7srxDSyJkHRJel/pq+4g9ZolSGR3g2y7cNk9p0GA=";
  npmPackFlags = [ "--ignore-scripts" ];

  buildPhase = ''
    runHook preBuild

    npm run build -- ${pkgs.lib.optionalString withFix "fix"}

    runHook postBuild
  '';
}
