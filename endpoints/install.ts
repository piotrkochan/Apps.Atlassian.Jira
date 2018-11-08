import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';

import { JiraApp } from '../index';

export class InstallEndpoint extends ApiEndpoint {
    public path: string = 'app-installed-callback';

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
