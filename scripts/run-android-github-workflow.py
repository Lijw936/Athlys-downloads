#!/usr/bin/env python3
"""Execute the repository's existing Android workflow on Codemagic.

The GitHub Actions workflow remains the single source of truth for build commands.
Codemagic provides checkout, Node, Java and artifact collection; this adapter runs
its shell steps in order and intentionally skips GitHub-specific 'uses:' actions.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError as exc:
    raise SystemExit("PyYAML is required; install it with: python3 -m pip install --user PyYAML") from exc

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "android-mobile.yml"


def main() -> int:
    if not WORKFLOW.is_file():
        raise SystemExit(f"Authoritative workflow not found: {WORKFLOW}")
    config = yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))
    steps = config.get("jobs", {}).get("build", {}).get("steps", [])
    if not steps:
        raise SystemExit("No build steps found in authoritative GitHub Actions workflow")

    env = os.environ.copy()
    env.setdefault("CI", "true")
    env.setdefault("GITHUB_WORKSPACE", str(ROOT))
    env.setdefault("ANDROID_SDK_ROOT", env.get("ANDROID_HOME", ""))
    if env.get("ANDROID_SDK_ROOT"):
        (ROOT / "android").mkdir(exist_ok=True)
        (ROOT / "android" / "local.properties").write_text(
            f"sdk.dir={env['ANDROID_SDK_ROOT']}\n", encoding="utf-8"
        )

    executed = 0
    skipped = 0
    for index, step in enumerate(steps, start=1):
        name = step.get("name") or step.get("uses") or f"step-{index}"
        command = step.get("run")
        if not command:
            skipped += 1
            print(f"\n[Codemagic adapter] Skip GitHub action: {name}", flush=True)
            continue
        print(f"\n[Codemagic adapter] {index}/{len(steps)} — {name}", flush=True)
        result = subprocess.run(
            command,
            shell=True,
            executable="/bin/bash",
            cwd=ROOT,
            env=env,
            check=False,
        )
        if result.returncode:
            print(f"Build step failed ({result.returncode}): {name}", file=sys.stderr)
            return result.returncode
        executed += 1

    apk = ROOT / "Athlys-Android.apk"
    if not apk.is_file() or apk.stat().st_size == 0:
        raise SystemExit("Build workflow completed but Athlys-Android.apk is missing or empty")
    print(
        f"APK created: {apk} ({apk.stat().st_size} bytes); "
        f"shell steps={executed}, GitHub-only actions skipped={skipped}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
