// Returning a fixed command string (a function, not an array) tells lint-staged
// NOT to append the staged filenames. That matters: when `tsc` is given explicit
// file paths it ignores tsconfig.json and only compiles those files plus their
// import graph, which drops global ambient declarations like src/types.d.ts (the
// Express `Request.context` augmentation). Type-checking the whole project keeps
// those augmentations in scope.
module.exports = {
  "**/*.ts": () => "tsc --noEmit -p tsconfig.build.json",
}
