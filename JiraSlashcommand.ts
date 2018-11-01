import { IHttp, IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IApp } from '@rocket.chat/apps-engine/definition/IApp';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { CommandEnum } from './enums/CommandEnum';
import { getUrlAndAuthToken, startNewMessageWithDefaultSenderConfig } from './helpers';


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

        let text = `Not implemented ${argument}`;

        if (!argument) {
            const { url, token } = await getUrlAndAuthToken(read, '/rest/api/3/project/search');
            const response = await http.get(`${url}`, { headers: { Authorization: `JWT ${token}` } });
            msg.addAttachment({ title: { value: url }, text: response.content });
            this.app.getLogger().debug('processConnectCommand', { response });
        }

        msg.setText(text);

        modify.getCreator().finish(msg);
    }
}
