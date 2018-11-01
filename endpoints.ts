import { HttpStatusCode, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { example, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { ApiEndpoint } from '@rocket.chat/apps-engine/definition/api/ApiEndpoint';
import { IApiEndpointInfo } from '@rocket.chat/apps-engine/definition/api/IApiEndpointInfo';
// import { IApp } from '@rocket.chat/apps-engine/definition/IApp';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { resolve as resolveUrl } from 'url';

import { AppInfoEnum } from './enums/AppInfoEnum';
import * as jwt from './jwt';

// import { IApp } from '@rocket.chat/apps-engine/definition/IApp';
export class ManifestEndpoint extends ApiEndpoint {
    public path: string = 'manifest.json';

    // public constructor(public app: IApp) {}

    public async get(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<IApiResponse> {
        this.app.getLogger().log(request);

        const siteUrl = await read.getEnvironmentReader().getServerSettings().getValueById('Site_Url');

        return this.json({
            status: HttpStatusCode.OK,
            content: {
                baseUrl: resolveUrl(siteUrl, endpoint.basePath),
                key: AppInfoEnum.AppKey,
                name: 'Rocket.Chat',
                description: 'Rocket.Chat integration',
                vendor: {
                    name: 'Rocket.Chat',
                    url: 'https://rocket.chat',
                },
                links: {
                    self: resolveUrl(siteUrl, endpoint.fullPath),
                    // "homepage": "https://atlassian-connect.dynatracelabs.com/atlassian-connect.json"
                },
                scopes: [
                    'read',
                    'write',
                ],
                authentication: {
                    type: 'jwt',
                },
                lifecycle: {
                    installed: '/app-installed-callback',
                },
                modules: {
                    configurePage: {
                        url: '/manifest.json',
                        name: {
                            value: 'Configuration',
                        },
                        key: 'dynatrace-config-page',
                        // https://rocketchat-dev.atlassian.net/plugins/servlet/ac/rocketchat/dynatrace-config-page
                        // https://rocketchat-dev.atlassian.net/plugins/servlet/upm?fragment=upload%2Fcom.chat.rocket.jira.plugin
                    },
                    // jiraIssueTabPanels: [{
                    //     url: '/event-feed?issue={issue.key}',
                    //     conditions: [
                    //         {
                    //             and: [
                    //                 {
                    //                     condition: 'entity_property_exists',
                    //                     params: {
                    //                         entity: 'addon',
                    //                         propertyKey: 'tenant',
                    //                     },
                    //                 },
                    //                 {
                    //                     condition: 'entity_property_exists',
                    //                     params: {
                    //                         entity: 'issue',
                    //                         propertyKey: 'dynatraceProblemId',
                    //                     },
                    //                 },
                    //             ],
                    //         },
                    //     ],
                    //     name: {
                    //         value: 'Dynatrace Events',
                    //     },
                    //     key: 'event-list',
                    // },
                    // {
                    //     url: '/dynatrace-query?issue={issue.key}',
                    //     name: {
                    //         value: 'Dynatrace Analytics',
                    //     },
                    //     key: 'dynatrace-query',
                    // },],
                    webhooks: [
                        {
                            event: 'comment_created',
                            url: '/on_comment?issue={issue.key}',
                        },
                        {
                            event: 'comment_updated',
                            url: '/on_comment?issue={issue.key}',
                        },
                        {
                            event: 'jira:issue_created',
                            url: '/on_issue?issue={issue.key}',
                        },
                        {
                            event: 'jira:issue_updated',
                            url: '/on_issue?issue={issue.key}',
                        },
                    ],
                    // webPanels: [
                    //     {
                    //         key: 'dynatrace-right-panel',
                    //         location: 'atl.jira.view.issue.right.context',
                    //         conditions: [
                    //             {
                    //                 and: [
                    //                     {
                    //                         condition: 'entity_property_exists',
                    //                         params: {
                    //                             entity: 'addon',
                    //                             propertyKey: 'tenant',
                    //                         },
                    //                     },
                    //                     {
                    //                         condition: 'entity_property_exists',
                    //                         params: {
                    //                             entity: 'issue',
                    //                             propertyKey: 'dynatraceProblemId',
                    //                         },
                    //                     },
                    //                 ],
                    //             },
                    //         ],
                    //         name: {
                    //             value: 'Dynatrace Problem',
                    //         },
                    //         url: '/issue-right?project={project.id}&issue={issue.key}',
                    //     },
                    // ],
                    // jiraEntityProperties: [
                    //     {
                    //         keyConfigurations: [
                    //             {
                    //                 extractions: [
                    //                     {
                    //                         objectName: 'pid',
                    //                         type: 'string',
                    //                         alias: 'dynatraceProblemId',
                    //                     },
                    //                     {
                    //                         objectName: 'problem',
                    //                         type: 'string',
                    //                         alias: 'dynatraceProblem',
                    //                     },
                    //                     {
                    //                         objectName: 'tags',
                    //                         type: 'text',
                    //                         alias: 'dynatraceTags',
                    //                     },
                    //                     {
                    //                         objectName: 'impact',
                    //                         type: 'string',
                    //                         alias: 'dynatraceImpact',
                    //                     },
                    //                     {
                    //                         objectName: 'severity',
                    //                         type: 'string',
                    //                         alias: 'dynatraceSeverity',
                    //                     },
                    //                     {
                    //                         objectName: 'hasRootCause',
                    //                         type: 'string',
                    //                         alias: 'dynatraceHasRootCause',
                    //                     },
                    //                     {
                    //                         objectName: 'status',
                    //                         type: 'string',
                    //                         alias: 'dynatraceStatus',
                    //                     },
                    //                 ],
                    //                 propertyKey: 'dynatraceProblemId',
                    //             },
                    //         ],
                    //         entityType: 'issue',
                    //         name: {
                    //             value: 'Dynatrace Problem Id',
                    //         },
                    //         key: 'dynatraceProblemId',
                    //     },
                    // ],
                },
            },
        });
    }
}

export class InstallEndpoint extends ApiEndpoint {
    public path: string = 'app-installed-callback';

    // public constructor(public app: IApp) {}

    // tslint:disable-next-line:max-line-length
    public async post(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<IApiResponse> {
        this.app.getLogger().log(request);
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'auth');
        // TODO: Need to remove the old one
        await persis.createWithAssociation({
            clientKey: request.content.clientKey,
            publicKey: request.content.publicKey,
            sharedSecret: request.content.sharedSecret,
            serverVersion: request.content.serverVersion,
            pluginsVersion: request.content.pluginsVersion,
            baseUrl: request.content.baseUrl,
            productType: request.content.productType,
            description: request.content.description,
        }, association);

        return this.success();
    }
}

export class AuthEndpoint extends ApiEndpoint {
    public path: string = 'auth';

    // public constructor(public app: IApp) {}

    public async get(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<IApiResponse> {
        this.app.getLogger().log(request);
        // const url = await getUrl(read, '/rest/api/3/issue/TEST-39');
        const { url, token } = await getUrl(read, 'rest/webhooks/1.0/webhook', 'POST');

        const siteUrl = await read.getEnvironmentReader().getServerSettings().getValueById('Site_Url');
        const baseUrl = resolveUrl(siteUrl, endpoint.basePath);

        const result = await http.post(url, {
            content: JSON.stringify({
                name: 'my first webhook via rest',
                url: baseUrl + '/on_issue',
                events: [
                    'jira:issue_created',
                    'jira:issue_updated',
                ],
                // jqlFilter: 'Project = JRA AND resolution = Fixed',
                excludeIssueDetails: false,
            }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `JWT ${token}`,
            },
        });

        return {
            status: HttpStatusCode.OK,
            content: {
                result,
            },
        };
    }
}

export class SampleEndpoint extends ApiEndpoint {
    public path: string = 'message/:id';

    @example({
        params: {
            id: 'message_id',
        },
        query: {
            asd: '123',
        },
        headers: {
            'X-Auth': 'asd: 123',
        },
    })
    public async get(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<IApiResponse> {
        this.app.getLogger().log(request);
        // const url = await getUrl(read, '/rest/api/3/issue/TEST-39');
        const { url, token } = await getUrl(read, 'rest/webhooks/1.0/webhook', 'POST');

        const siteUrl = await read.getEnvironmentReader().getServerSettings().getValueById('Site_Url');
        const baseUrl = resolveUrl(siteUrl, endpoint.basePath);

        const result = await http.post(url, {
            content: JSON.stringify({
                name: 'my first webhook via rest',
                url: baseUrl + '/on_issue',
                events: [
                    'jira:issue_created',
                    'jira:issue_updated',
                ],
                // jqlFilter: 'Project = JRA AND resolution = Fixed',
                excludeIssueDetails: false,
            }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `JWT ${token}`,
            },
        });

        return {
            status: HttpStatusCode.OK,
            content: {
                result,
            },
        };
    }
}

async function getUrl(read: IRead, path: string, method: string = 'GET'): Promise<{ url: string, token: string }> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'auth');
    const records = await read.getPersistenceReader().readByAssociation(association);
    const authData: any = records[0];
    const req: jwt.IRequest = jwt.fromMethodAndUrl(method, path);

    const tokenData = {
        iss: 'rocketchat',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 60 * 3,
        qsh: jwt.createQueryStringHash(req),
    };

    const token = jwt.encode(tokenData, authData.sharedSecret);

    return {
        url: `${authData.baseUrl}${path}`,
        token,
    };
}
