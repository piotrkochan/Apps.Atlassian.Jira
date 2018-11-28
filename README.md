# Apps.Atlassian.Jira
Rocket.Chat App for Atlassian Jira Cloud. This app provides a series of slashcommands to use, receives webhooks from Jira and notifies the subscribed rooms and shows the details of issues whenever someone mentions them.

<p align="center">
  <img alt="Jira App in action" src="https://user-images.githubusercontent.com/1810309/49170812-1c104280-f324-11e8-9825-4f8ac182966a.png">
</p>

## Development Quick Start
Make sure you have https://github.com/RocketChat/Rocket.Chat.Apps-cli installed.

`npm install -g @rocket.chat/apps-cli`

Checkout this repo and install dependencies
```bash
git clone https://github.com/RocketChat/Apps.Atlassian.Jira.git
cd Apps.Atlassian.Jira
npm install
```

You can now make changes and build with

`rc-apps package`

And to deploy it to a local Rocket.Chat server to test the application

`rc-apps deploy -u RC_USER -p RC_PASSWORD --url=http://localhost:3000`

or to update the installation

`rc-apps deploy -f --update -u RC_USER -p RC_PASSWORD --url=http://localhost:3000`
