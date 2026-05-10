#!/usr/bin/env bash
# Build Chrome and Firefox zip packages for Artblock Brasil.
# Run from the repo root. Outputs artblock-{chrome,firefox}-v<version>.zip.
#
# Usage:
#   ./build.sh                 # build with version from manifest.json
#   ./build.sh patch           # bump patch (1.0.0 -> 1.0.1), then build
#   ./build.sh minor           # bump minor (1.0.0 -> 1.1.0), then build
#   ./build.sh major           # bump major (1.0.0 -> 2.0.0), then build
#   ./build.sh 1.2.3           # set explicit version, then build

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

MANIFESTS=(manifest.json manifest.firefox.json)

if [[ $# -gt 0 ]]; then
  VERSION=$(python3 - "$1" "${MANIFESTS[@]}" <<'PY'
import pathlib, re, sys

spec, *files = sys.argv[1:]
pat = re.compile(r'("version"\s*:\s*")(\d+\.\d+\.\d+)(")')
current = pat.search(pathlib.Path(files[0]).read_text()).group(2)

if re.fullmatch(r"\d+\.\d+\.\d+", spec):
    new = spec
else:
    parts = [int(x) for x in current.split(".")]
    if spec == "patch":
        parts[2] += 1
    elif spec == "minor":
        parts[1] += 1; parts[2] = 0
    elif spec == "major":
        parts[0] += 1; parts[1] = 0; parts[2] = 0
    else:
        sys.exit(f"unknown bump: {spec!r} (expected patch|minor|major|X.Y.Z)")
    new = ".".join(str(x) for x in parts)

for f in files:
    p = pathlib.Path(f)
    text, n = pat.subn(rf"\g<1>{new}\g<3>", p.read_text(), count=1)
    if n != 1:
        sys.exit(f"{f}: expected exactly 1 version match, got {n}")
    p.write_text(text)

print(new)
PY
)
  echo "version set to $VERSION"
else
  VERSION=$(python3 -c "import re; print(re.search(r'\"version\"\s*:\s*\"(\d+\.\d+\.\d+)\"', open('manifest.json').read()).group(1))")
fi

shopt -s nullglob
for old in artblock-brasil-chrome-v*.zip artblock-brasil-firefox-v*.zip; do
  rm -f "$old"
  echo "removed $old"
done
shopt -u nullglob

INCLUDE=(LICENSE background content styles popup icons)

build() {
  local target="$1"      # chrome | firefox
  local manifest="$2"    # path to manifest file to use
  local out="artblock-brasil-${target}-v${VERSION}.zip"

  rm -f "$out"
  local stage
  stage=$(mktemp -d)
  trap 'rm -rf "$stage"' RETURN

  cp "$manifest" "$stage/manifest.json"
  for item in "${INCLUDE[@]}"; do cp -R "$item" "$stage/"; done
  find "$stage" -name .DS_Store -delete

  (cd "$stage" && zip -qr "$ROOT/$out" .)
  rm -rf "$stage"
  echo "built $out ($(du -h "$out" | cut -f1))"
}

build chrome manifest.json
build firefox manifest.firefox.json
