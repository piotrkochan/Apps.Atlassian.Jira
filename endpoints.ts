import { HttpStatusCode, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { example, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { ApiEndpoint } from '@rocket.chat/apps-engine/definition/api/ApiEndpoint';
import { IApiEndpointInfo } from '@rocket.chat/apps-engine/definition/api/IApiEndpointInfo';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { resolve as resolveUrl } from 'url';

import * as jwt from './jwt';

export class InstallEndpoint extends ApiEndpoint {
    public path: string = 'app-installed-callback';

    // public constructor(public app: IApp) {}

    // tslint:disable-next-line:max-line-length
    public async post(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<IApiResponse> {
        this.app.getLogger().log(request);
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'auth');

        await persis.removeByAssociation(association);

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
