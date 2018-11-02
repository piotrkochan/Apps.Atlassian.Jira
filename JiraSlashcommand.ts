import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IApp } from '@rocket.chat/apps-engine/definition/IApp';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { URL } from 'url';

import { CommandEnum } from './enums/CommandEnum';
import {
    getConnectedProjects,
    getUrlAndAuthToken,
    persistConnectedProjects,
    startNewMessageWithDefaultSenderConfig,
} from './helpers';

export class JiraSlashcommand implements ISlashCommand {
    public command = 'jira';
    public i18nParamsExample = 'slashcommand_params';
    public i18nDescription = '';
    public providesPreview = false;

    constructor(private readonly app: IApp) { }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [command] = context.getArguments();

        if (!command) {
            return this.processHelpCommand(context, read, modify);
        }

        switch (command) {
            case CommandEnum.Connect:
                this.processConnectCommand(context, read, modify, http, persis);
                break;

            case CommandEnum.Help:
                this.processHelpCommand(context, read, modify);
                break;

            default:
                // @TODO try to find an issue on Jira, the user might have typed an issue key
                break;
        }

    }

    private async processHelpCommand(context: SlashCommandContext, read: IRead, modify: IModify): Promise<void> {
        const sender = await read.getUserReader().getById('rocket.cat');
        const room = context.getRoom();

        const msg = await startNewMessageWithDefaultSenderConfig(modify, read, sender, room);
        const text =
            `These are the commands I can understand:
            \`/jira install\` Instructions to install the app on a Jira instance
            \`/jira connect\` Connects this room to a Jira project
            \`/jira ISSUEKEY-123\` Show information about a specific issues
            \`/jira help\` Shows this message`;

        msg.setText(text);

        modify.getCreator().finish(msg);
    }

    private async processConnectCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const sender = await read.getUserReader().getById('rocket.cat');
        const room = context.getRoom();

        const connectedProjects = await getConnectedProjects(read.getPersistenceReader(), room);

        const msg = await startNewMessageWithDefaultSenderConfig(modify, read, sender, room);

        const [, argument] = context.getArguments();

        if (!argument) {
            const { url, token } = await getUrlAndAuthToken(read, '/rest/api/3/project/search?expand=description');
            const response = await http.get(url, { headers: { Authorization: `JWT ${token}` } });

            const jiraResponse = JSON.parse(response.content || '{}');
            let messageText: string;

            if (jiraResponse.total) {
                const { origin: baseUrl } = new URL(url);

                jiraResponse.values.forEach((project) => {
                    if (connectedProjects.hasOwnProperty(project.key)) { return; }

                    msg.addAttachment({
                        title: {
                            value: `${project.key} - ${project.name}`,
                            link: `${baseUrl}/browse/${project.key}`,
                        },
                        text: project.description,
                    });
                });

                messageText =
                    `You can connect to Jira projects by typing \`/jira connect PROJECT_KEY\`

                    These are the currently available projects for you to connect to:`;
            } else {
                messageText = 'There are currently no available projects for you to connect :/';
            }

            msg.setText(messageText);

        } else {
            const { url, token } = await getUrlAndAuthToken(read, `/rest/api/3/project/search?query=${argument}&expand=description`);
            const response = await http.get(url, { headers: { Authorization: `JWT ${token}` } });

            const jiraResponse = JSON.parse(response.content || '{}');
            let messageText: string;

            if (jiraResponse.total) {
                const [ project ] = jiraResponse.values;
                const { id, self, key, name, description } = project;

                connectedProjects[key] = { id, self, key, name };
                await persistConnectedProjects(persis, room, connectedProjects);

                const { origin: baseUrl } = new URL(url);

                msg.addAttachment({
                    title: {
                        value: `${key} - ${name}`,
                        link: `${baseUrl}/browse/${key}`,
                    },
                    text: description,
                });

                messageText = `Jira project *${name}* successfully connected! This room will now be notified of certain events in the project`;
            } else {
                messageText = `Project with key "${argument}" could not be found`;
            }

            msg.setText(messageText);
        }

        modify.getCreator().finish(msg);
    }
}
