import {
    IConfigurationExtend,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api/IApi';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IMessage, IPostMessageSent } from '@rocket.chat/apps-engine/definition/messages';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';

import { settings } from './app-settings';
import { InstallEndpoint } from './endpoints/install';
import { ManifestEndpoint } from './endpoints/manifest';
import { OnCommentEndpoint } from './endpoints/onComment';
import { OnIssueEndpoint } from './endpoints/onIssue';
import { PostMessageSentHandler } from './handlers/PostMessageSentHandler';
import { JiraSlashcommand } from './JiraSlashcommand';

export class JiraApp extends App implements IPostMessageSent {
    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
    }

    public async executePostMessageSent(message: IMessage, read: IRead, http: IHttp, persistence: IPersistence, modify: IModify): Promise<void> {
        const handler = new PostMessageSentHandler(this, read, http, persistence, modify);

        await handler.run(message);
    }

    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        await configuration.api.provideApi({
            visibility: ApiVisibility.PRIVATE,
            security: ApiSecurity.UNSECURE,
            endpoints: [
                new ManifestEndpoint(this),
                new InstallEndpoint(this),
                new OnIssueEndpoint(this),
                new OnCommentEndpoint(this),
            ],
        });

        await Promise.all(settings.map((setting) => configuration.settings.provideSetting(setting)));

        await configuration.slashCommands.provideSlashCommand(new JiraSlashcommand(this));
    }
}
