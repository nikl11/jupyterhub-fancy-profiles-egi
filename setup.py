import os
import shutil
from subprocess import check_call

from setuptools import setup
from setuptools.command.build_py import build_py
from setuptools.command.sdist import sdist

HERE = os.path.dirname(__file__)

DIST_DIR = os.path.join(HERE, "jupyterhub_fancy_profiles", "static", "dist")
SKIP_ENV = "JHFP_SKIP_NPM"


def dist_looks_built():
    """Return True if dist/ exists and contains at least one .js file."""
    if not os.path.isdir(DIST_DIR):
        return False
    for root, _, files in os.walk(DIST_DIR):
        for f in files:
            if f.endswith(".js"):
                return True
    return False


def webpacked_command(command):
    """
    Return a command that inherits from command, but adds webpack JS building.

    npm build is optional:
      - If JHFP_SKIP_NPM=1 (or true/yes/on) -> skip npm build
      - If static/dist already exists -> skip npm build
      - Otherwise, require npm and build assets
    """

    class WebPackedCommand(command):
        description = "build frontend files with webpack (optional)"

        def run(self):
            # 1) Explicit skip (production workflow: dist is prebuilt & committed)
            if os.environ.get(SKIP_ENV, "").lower() in ("1", "true", "yes", "on"):
                return super().run()

            # 2) If dist already exists, do not force npm
            if dist_looks_built():
                return super().run()

            # 3) Otherwise we must build, and that requires npm
            npm = shutil.which("npm")
            if not npm:
                raise RuntimeError(
                    "npm not found, and static/dist is not built.\n"
                    "Either:\n"
                    f"  - build assets locally (npm install && npm run webpack) and commit {DIST_DIR}\n"
                    f"  - OR set {SKIP_ENV}=1 if you intentionally ship prebuilt assets\n"
                    "  - OR install nodejs/npm in the build environment\n"
                )

            check_call([npm, "install", "--progress=false", "--unsafe-perm"], cwd=HERE)
            check_call([npm, "run", "webpack"], cwd=HERE)

            return super().run()

    return WebPackedCommand


setup(
    cmdclass={
        "sdist": webpacked_command(sdist),
        "build_py": webpacked_command(build_py),
    },
)
