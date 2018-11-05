import {
    HttpStatusCode,
    IHttp,
    IMessageBuilder,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { ApiEndpoint } from '@rocket.chat/apps-engine/definition/api/ApiEndpoint';
import { IApiEndpointInfo } from '@rocket.chat/apps-engine/definition/api/IApiEndpointInfo';

import { WebhookEventEnum } from './enums/WebhookEventEnum';
import { parseJiraDomainFromIssueUrl, startNewMessageWithDefaultSenderConfig } from './lib/helpers';
import { getConnectedProjects } from './lib/persistence';

export class OnCommentEndpoint extends ApiEndpoint {
    public path: string = 'on_comment';

    // tslint:disable-next-line:max-line-length
    public async post(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<IApiResponse> {
        const persistenceRecords = await getConnectedProjects(read.getPersistenceReader());

        if (!persistenceRecords.length) {
            this.app.getLogger().log('Notification received, but there are no connected rooms to send a message');

            return {
                status: HttpStatusCode.OK,
            };
        }

        const sender = await read.getUserReader().getById('rocket.cat');

        if (!sender) {
            this.app.getLogger().error('No `sender` configured for the app');

            return {
                status: HttpStatusCode.OK,
            };
        }

        const messageBuilder = await startNewMessageWithDefaultSenderConfig(modify, read, sender);
        let sendMessage = true;

        switch (request.content.webhookEvent) {
            case WebhookEventEnum.CommentCreated:
                this.processCommentCreatedEvent(request, messageBuilder);
                break;

            case WebhookEventEnum.CommentUpdated:
                this.processCommentUpdatedEvent(request, messageBuilder);
                break;

            default:
                this.app.getLogger().error(`Unknown event received: ${request.content.webhookEvent}`);
                sendMessage = false;
                break;
        }

        if (sendMessage) {
            const { key: projectKey } = request.content.issue.fields.project;

            persistenceRecords.forEach(async (record) => {
                if (!record.connectedProjects.hasOwnProperty(projectKey)) { return; }

                const room = await read.getRoomReader().getById(record.room);

                if (!room) {
                    this.app.getLogger().error(`Invalid room id "${record.room}`);
                    return;
                }

                messageBuilder.setRoom(room);
                modify.getCreator().finish(messageBuilder);
            });
        }

        return {
            status: HttpStatusCode.OK,
        };
    }

    private processCommentCreatedEvent(request: IApiRequest, messageBuilder: IMessageBuilder): void {
        const { issue, comment } = request.content;
        const { updateAuthor: { displayName: from }, body: text } = comment;
        const issueType = issue.fields.issuetype.name;
        const status = issue.fields.status.name;
        const attachment = {
            title: {
                value: `${issue.key}: ${issue.fields.summary}`,
                link:
                    `${parseJiraDomainFromIssueUrl(issue.self)}/browse/${
                        issue.key
                    }?focusedCommentId=${
                        comment.id
                    }&page=com.atlassian.jira.plugin.system.issuetabpanels%3Acomment-tabpanel#comment-${comment.id}`,
            },
            text,
        };

        messageBuilder.setText(`*${from}* commented on a \`${issueType}\` in \`${status}\``);
        messageBuilder.addAttachment(attachment);
    }

    private processCommentUpdatedEvent(request: IApiRequest, messageBuilder: IMessageBuilder): void {
        const { issue, comment } = request.content;
        const { updateAuthor: { displayName: from }, body: text } = comment;
        const issueType = issue.fields.issuetype.name;
        const status = issue.fields.status.name;
        const attachment = {
            title: {
                value: `${issue.key}: ${issue.fields.summary}`,
                link:
                    `${parseJiraDomainFromIssueUrl(issue.self)}/browse/${
                        issue.key
                    }?focusedCommentId=${
                        comment.id
                    }&page=com.atlassian.jira.plugin.system.issuetabpanels%3Acomment-tabpanel#comment-${comment.id}`,
            },
            text,
        };

        messageBuilder.setText(`*${from}* edited a comment on a \`${issueType}\` in \`${status}\``);
        messageBuilder.addAttachment(attachment);
    }
}
