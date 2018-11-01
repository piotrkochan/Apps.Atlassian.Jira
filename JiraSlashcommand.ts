import { IHttp, IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IApp } from '@rocket.chat/apps-engine/definition/IApp';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { CommandEnum } from './enums/CommandEnum';
import { getUrlAndAuthToken, startNewMessageWithDefaultSenderConfig } from './helpers';

import { URL } from 'url';

export class JiraSlashcommand implements ISlashCommand {
    public command = 'jira';
    public i18nParamsExample = 'slashcommand_params';
    public i18nDescription = '';
    public providesPreview = false;

    constructor(private readonly app: IApp) { }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): Promise<void> {
        const [command] = context.getArguments();

        if (!command) {
            return this.processHelpCommand(context, read, modify);
        }

        switch (command) {
            case CommandEnum.Connect:
                this.processConnectCommand(context, read, modify, http);
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
            \`/jira connect\` Connects to a Jira instance
            \`/jira ISSUEKEY-123\` Show information about a specific issues
            \`/jira help\` Shows this message`;

        msg.setText(text);

        modify.getCreator().finish(msg);
    }

    private async processConnectCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): Promise<void> {
        const sender = await read.getUserReader().getById('rocket.cat');
        const room = context.getRoom();

        const msg = await startNewMessageWithDefaultSenderConfig(modify, read, sender, room);

        const [, argument] = context.getArguments();

        if (!argument) {
            const { url, token } = await getUrlAndAuthToken(read, '/rest/api/3/project/search?expand=description');
            const response = await http.get(url, { headers: { Authorization: `JWT ${token}` } });

            const jiraResponse = JSON.parse(response.content || '{}');
            let messageText: string;

            if (jiraResponse.total) {
                const { origin: baseUrl } = new URL(url);

                jiraResponse.values.forEach((project) => msg.addAttachment({
                    title: {
                        value: `${project.key} - ${project.name}`,
                        link: `${baseUrl}/browse/${project.key}`,
                    },
                    text: project.description,
                }));

                messageText =
                    `You can connect to additional projects by typing \`/jira connect PROJECT_KEY\`

                    These are the currently available projects for you to connect to:`;
            } else {
                messageText = 'There are currently no available projects for you to connect :/';
            }

            msg.setText(messageText);

            this.app.getLogger().debug('processConnectCommand', { response });
        } else {
            const { url, token } = await getUrlAndAuthToken(read, `/rest/api/3/project/search?query=${argument}`);
            const response = await http.get(url, { headers: { Authorization: `JWT ${token}` } });

            const jiraResponse = JSON.parse(response.content || '{}');

            msg.addAttachment({ text: JSON.stringify(jiraResponse, null, 4)});
        }

        modify.getCreator().finish(msg);
    }
}
