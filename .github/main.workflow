workflow "Build" {
  on = "push"
  resolves = ["app.build"]
}

action "app.build" {
  uses = "actions/docker/cli@master"
  args = "build -f Dockerfile -t app-$GITHUB_SHA:latest ."
}
