---
name: tag-release
description: Commit and tag releases of this project with a numeric version, a famous movie villain, a cute animal, and a descriptive suffix. Use when the user requests a release commit or version tag.
---

# Release tags

Use annotated Git tags with this format:

`v-MAJOR.MINOR.PATCH-<movie-villain>-<cute-animal>-<description>`

Use lowercase words separated by hyphens for all three suffixes.
Choose a recognizable movie villain and a cute animal.
The animal name must be one lowercase word, such as `panda`, `otter`, or `kitten`.
The movie villain name must also be one lowercase word, such as `vader`, `joker`, or `sauron`.
Descriptions can contain multiple words separated by hyphens.
Use a short description of the release's main behavior, such as `base-infra` or `javascript-browser`.
Example: `v-0.1.0-vader-panda-base-infra`.
The suffixes are release labels. Package versions contain only `MAJOR.MINOR.PATCH`.

## Select the version

Read existing release tags and the versions in `ui/package.json` and `server/pyproject.toml`.
For the first release, use the existing application version: `0.1.0`.
For later releases, compare the numeric version components, independently of the suffixes.
Increment PATCH for fixes, MINOR for compatible features, and MAJOR for incompatible changes.
Before `1.0.0`, use MINOR for incompatible changes.
Honor a version or suffix explicitly supplied by the user.
Keep the UI, `ui/package-lock.json`, `server/pyproject.toml`, and `server/uv.lock` versions consistent when changing the version.
After a server version change, run `uv lock` in `server/` and commit `server/uv.lock`.
Check that the full tag and its numeric release version have not already been released.

## Create the release

Review the working tree and stage the files that belong to the requested release.
Keep unrelated changes, secrets, runtime files, and build outputs out of the commit.
Run the server tests with `uv run --locked pytest` in `server/`.
Run the UI build, UI unit tests, browser tests, and Python script tests.
Reuse successful checks from the current session when their tested files are unchanged.
Run browser tests from `ui/`. Use the `sample-app-02` profile for any lifecycle actions.
Write a commit message that describes the release's resulting behavior.
Create an annotated tag on that commit. Include the version and a concise release description in the annotation.
Verify that the tag resolves to the release commit and report both identifiers.
Do not replace existing tags.

## Push the release

Always push the release. Do not wait for a separate push request.
Push the release branch to `origin`, then push only the new tag:
`git push origin <branch>` and `git push origin <tag>`.
Do not use `--force`, and do not push other local tags.
If a push fails, stop and report the error. Do not delete or move the tag to make a push succeed.
After the push, verify that `git ls-remote --tags origin <tag>` returns the release commit.
Report the pushed branch, the tag, and the remote URL.
