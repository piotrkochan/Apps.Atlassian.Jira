import { IHttp, IMessageBuilder, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IApp } from '@rocket.chat/apps-engine/definition/IApp';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { URL } from 'url';

import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
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

            case CommandEnum.Install:
                this.processInstallCommand(context, read, modify);
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

        modify.getNotifier().notifyUser(context.getSender(), msg.getMessage());
    }

    private async processInstallCommand(context: SlashCommandContext, read: IRead, modify: IModify): Promise<void> {
        const sender = await read.getUserReader().getById('rocket.cat');
        const room = context.getRoom();

        const msg = await startNewMessageWithDefaultSenderConfig(modify, read, sender, room);

        // @TODO:
        msg.setText('TODO');

        modify.getNotifier().notifyUser(context.getSender(), msg.getMessage());
    }

    private async processConnectCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const sender = await read.getUserReader().getById('rocket.cat');
        const room = context.getRoom();

        const persistenceRecords = await getConnectedProjects(read.getPersistenceReader(), room);
        const connectedProjects = persistenceRecords.length ? persistenceRecords[0].connectedProjects : {};

        const msg = await startNewMessageWithDefaultSenderConfig(modify, read, sender, room);

        const [, argument] = context.getArguments();

        if (!argument) {
            await this.listProjects(connectedProjects, msg, http, read);
        } else {
            await this.connectProject(connectedProjects, msg, http, read, argument, persis, room);
        }

        modify.getNotifier().notifyUser(context.getSender(), msg.getMessage());
    }

    private async listProjects(connectedProjects: object, msg: IMessageBuilder, http: IHttp, read: IRead): Promise<void> {
        const { url, token } = await getUrlAndAuthToken(read, '/rest/api/3/project/search?expand=description');
        const response = await http.get(url, { headers: { Authorization: `JWT ${token}` } });

        const jiraResponse = JSON.parse(response.content || '{}');
        const messageText: Array<string> = [];
        const availableProjectList: Array<string> = [];
        const connectedProjectList: Array<string> = [];

        if (jiraResponse.total) {
            const { origin: baseUrl } = new URL(url);

            jiraResponse.values.forEach((project) => {
                const item = `- [${project.key} - ${project.name}](${baseUrl}/browse/${project.key}) ${project.description}`;
                if (connectedProjects.hasOwnProperty(project.key)) {
                    connectedProjectList.push(item);
                } else {
                    availableProjectList.push(item);
                }
            });
        }

        if (connectedProjectList.length) {
            messageText.push(`These are the projects already connected to this room :\n ${connectedProjectList.join('\n')}`);
        }

        if (availableProjectList.length) {
            messageText.push(
                `These are the currently available projects for you to connect to:\n ${availableProjectList.join('\n')}

                You can connect to Jira projects by typing \`/jira connect PROJECT_KEY\``);
        } else {
            messageText.push('There are currently no available projects for you to connect :/');
        }

        msg.setText(messageText.join('\n\n'));
    }

    // tslint:disable-next-line:max-line-length
    private async connectProject(connectedProjects: object, msg: IMessageBuilder, http: IHttp, read: IRead, argument: string, persis: IPersistence, room: IRoom): Promise<void> {
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
}
