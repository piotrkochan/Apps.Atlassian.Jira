import { HttpStatusCode, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { resolve as resolveUrl } from 'url';

import { AppInfoEnum } from '../enums/AppInfoEnum';

export class ManifestEndpoint extends ApiEndpoint {
    public path: string = 'manifest.json';

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
