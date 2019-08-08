workflow "Build" {
  on = "push"
  resolves = ["GitHub Action for npm"]
}

action "checkout" {
  uses = "actions/checkout@master"
}

action "actions/setup-node@master" {
  uses = "actions/setup-node@master"
  needs = ["checkout"]
}

action "GitHub Action for npm" {
  uses = "actions/npm@master"
  needs = ["actions/setup-node@master"]
  args = "install"
}
