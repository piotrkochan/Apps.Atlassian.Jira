import { IMessageBuilder, IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { AppSetting } from './app-settings';
import * as jwt from './jwt';

export async function startNewMessageWithDefaultSenderConfig(modify: IModify, read: IRead, sender: IUser, room: IRoom): Promise<IMessageBuilder> {
    const settingsReader = read.getEnvironmentReader().getSettings();
    const userAliasSetting = await settingsReader.getValueById(AppSetting.UserAlias);
    const userAvatarSetting = await settingsReader.getValueById(AppSetting.UserAvatar);

    return modify.getCreator().startMessage()
        .setSender(sender)
        .setRoom(room)
        .setUsernameAlias(userAliasSetting)
        .setAvatarUrl(userAvatarSetting);
}

export function parseJiraDomainFromIssueUrl(issueUrl: string): string {
    const [domain] = (issueUrl.match(/^https?:\/\/[^\/]+/) as Array<any>);

    return domain;
}

export async function getUrlAndAuthToken(read: IRead, path: string, method: string = 'GET'): Promise<{ url: string, token: string }> {
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
