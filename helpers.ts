import {
    IMessageBuilder,
    IModify,
    IPersistence,
    IPersistenceRead,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { AppSetting } from './app-settings';
import { AppInfoEnum } from './enums/AppInfoEnum';
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

    const now = Math.floor((new Date()).getTime() / 1000);

    const tokenData = {
        iss: AppInfoEnum.AppKey,
        iat: now,
        exp: now + 60 * 3,
        qsh: jwt.createQueryStringHash(req),
    };

    const token = jwt.encode(tokenData, authData.sharedSecret);

    return {
        url: `${authData.baseUrl}${path}`,
        token,
    };
}

interface IConnectedProjectsRecord {
    room: string;
    connectedProjects: object;
}

export async function getConnectedProjects(persistence: IPersistenceRead, room?: IRoom): Promise<IConnectedProjectsRecord> {
    const associations = [new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'projects')];

    if (room) {
        associations.push(new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id));
    }

    const records = await persistence.readByAssociations(associations);

    return (records[0] as IConnectedProjectsRecord) || { room: '', connectedProjects: {} };
}

export async function persistConnectedProjects(persis: IPersistence, room: IRoom, connectedProjects: object): Promise<void> {
    const roomAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id);
    const projectsAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'projects');

    await persis.removeByAssociations([roomAssociation, projectsAssociation]);

    await persis.createWithAssociations({ room: room.id, connectedProjects }, [roomAssociation, projectsAssociation]);
}
