import { IHttp, IMessageBuilder, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { URL } from 'url';

import { CommandEnum } from '../enums/CommandEnum';
import { JiraApp } from '../index';
import { formatIssueMessage, startNewMessageWithDefaultSenderConfig } from '../lib/helpers';
import { getConnectedProjects, isProjectConnected, persistConnectedProjects } from '../lib/persistence';
import { IJiraError, IJiraIssue, sdk } from '../lib/sdk';

export class JiraSlashcommand implements ISlashCommand {
    public command = 'jira';
    public i18nParamsExample = 'slashcommand_params';
    public i18nDescription = 'slashcommand_description';
    public providesPreview = false;

    constructor(private readonly app: JiraApp) { }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [command] = context.getArguments();

        if (!command) {
            return this.processHelpCommand(context, read, modify);
        }

        switch (command) {
            case CommandEnum.Connect:
                this.processConnectCommand(context, read, modify, http, persis);
                break;

            case CommandEnum.Disconnect:
                this.processDisconnectCommand(context, read, modify, http, persis);
                break;

            case CommandEnum.Help:
                this.processHelpCommand(context, read, modify);
                break;

            case CommandEnum.Install:
                this.processInstallCommand(context, read, modify);
                break;

            default:
                this.processIssueSearch(context, read, modify, http, persis);
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
            \`/jira disconnect\` Disconnects this room from a Jira project
            \`/jira ISSUEKEY-123\` Show information about a specific issues
            \`/jira help\` Shows this message`;

        msg.setText(text);

        modify.getNotifier().notifyUser(context.getSender(), msg.getMessage());
    }

    private async processInstallCommand(context: SlashCommandContext, read: IRead, modify: IModify): Promise<void> {
        const sender = await read.getUserReader().getById('rocket.cat');
        const room = context.getRoom();

        const msg = await startNewMessageWithDefaultSenderConfig(modify, read, sender, room);

        const [manifestEndpoint] = this.app.getAccessors().providedApiEndpoints.filter((endpoint) => endpoint.path === 'manifest.json');
        const siteUrl = await read.getEnvironmentReader().getServerSettings().getValueById('Site_Url');

        msg.setText(
            `These are the steps to install the Jira App in your Jira Cloud instance:

            - Log in to your Jira, as an administrator
            - Go to *Jira Settings* > *Apps* > *Manage apps*
            - Click on *Settings* below the "User-installed apps" list
            - Check the "Enable development mode" checkbox and click on *Save*
            - Click on *Upload app*
            - In the field "From this URL", paste the following URL:
                \`${siteUrl}${manifestEndpoint.computedPath}\`
            - Click on *Upload*

            Done!
            Now this app will be installed on the instance
            The next step is to connect to the available Jira projects so you start receiving notifications`
        );

        modify.getNotifier().notifyUser(context.getSender(), msg.getMessage());
    }

    private async processIssueSearch(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [issueKey] = context.getArguments();
        const jiraResponse = await sdk.getIssue(read, http, issueKey);

        const sender = await read.getUserReader().getById('rocket.cat');
        const room = context.getRoom();

        const msg = await startNewMessageWithDefaultSenderConfig(modify, read, sender, room);

        if ((jiraResponse as IJiraError).errors || !isProjectConnected(read.getPersistenceReader(), (jiraResponse as IJiraIssue).fields.project, room)) {
            msg.setText(`Issue "${issueKey}" not found`);
        } else {
            formatIssueMessage(msg, (jiraResponse as IJiraIssue));
        }

        modify.getNotifier().notifyUser(context.getSender(), msg.getMessage());
    }

    private async processDisconnectCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const sender = await read.getUserReader().getById('rocket.cat');
        const room = context.getRoom();

        const persistenceRecords = await getConnectedProjects(read.getPersistenceReader(), room);
        const connectedProjects = persistenceRecords.length ? persistenceRecords[0].connectedProjects : {};

        const msg = await startNewMessageWithDefaultSenderConfig(modify, read, sender, room);

        const [, argument] = context.getArguments();

        if (!argument) {
            this.listProjectsToDisconnect(connectedProjects, msg, http, read);
        } else {
            await this.disconnectProject(connectedProjects, argument, msg, persis, room);
        }

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
            await this.listProjectsToConnect(connectedProjects, msg, http, read);
        } else {
            await this.connectProject(connectedProjects, msg, http, read, argument, persis, room);
        }

        modify.getNotifier().notifyUser(context.getSender(), msg.getMessage());
    }

    private async listProjectsToConnect(connectedProjects: object, msg: IMessageBuilder, http: IHttp, read: IRead): Promise<void> {
        const jiraResponse = await sdk.listProjects(read, http);

        const messageText: Array<string> = [];
        const availableProjectList: Array<string> = [];
        const connectedProjectList: Array<string> = [];

        const { origin: baseUrl } = new URL(jiraResponse.self);

        if (jiraResponse.total) {
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

                You can connect to Jira projects by typing \`/jira connect PROJECT_KEY\``
            );
        } else {
            messageText.push('There are currently no available projects for you to connect :/');
        }

        msg.setText(messageText.join('\n\n'));
    }

    private async listProjectsToDisconnect(connectedProjects: object, msg: IMessageBuilder, http: IHttp, read: IRead): Promise<void> {
        const projects = Object.values(connectedProjects);

        if (projects.length) {
            const projectText: Array<string> = [];

            projects.forEach((project) => {
                const { origin: baseUrl } = new URL(project.self);

                projectText.push(`[${project.key} - ${project.name}](${baseUrl}/browse/${project.key})`);
            });

            msg.setText(
                `These are the currently connected projects in this room:\n${projectText.join('\n')}

                You can disconnect a Jira project by typing \`/jira disconnect PROJECT_KEY\``
            );
        } else {
            msg.setText('There are no connected projects in this room');
        }
    }

    // tslint:disable-next-line:max-line-length
    private async connectProject(connectedProjects: object, msg: IMessageBuilder, http: IHttp, read: IRead, argument: string, persis: IPersistence, room: IRoom): Promise<void> {
        const jiraResponse = await sdk.getProject(read, http, argument);

        let messageText: string;

        if (jiraResponse.total) {
            const [ project ] = jiraResponse.values;
            const { id, self, key, name, description } = project;

            connectedProjects[key] = { id, self, key, name };
            await persistConnectedProjects(persis, room, connectedProjects);

            const { origin: baseUrl } = new URL(jiraResponse.self);

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

    private async disconnectProject(connectedProjects: object, argument: string, msg: IMessageBuilder, persis: IPersistence, room: IRoom): Promise<void> {
        if (!connectedProjects.hasOwnProperty(argument.toUpperCase())) {
            msg.setText(`Project with key "${argument}" is not connected`);
            return;
        }

        const project = connectedProjects[argument.toUpperCase()];

        delete connectedProjects[argument.toUpperCase()];

        await persistConnectedProjects(persis, room, connectedProjects);

        msg.setText(`Jira project *${project.name}* successfully disconnected! This room will no longer receive notifications about it`);
    }
}
