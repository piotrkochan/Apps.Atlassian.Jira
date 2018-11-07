import { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IJiraProject } from '../sdk/index';

export interface IConnectedProjectsRecord {
    room: string;
    connectedProjects: object;
}

export interface IInstallationData {
    clientKey: string;
    publicKey: string;
    sharedSecret: string;
    serverVersion: string;
    pluginsVersion: string;
    baseUrl: string;
    productType: string;
    description: string;
}

export async function getConnectedProjects(persistence: IPersistenceRead, room?: IRoom): Promise<Array<IConnectedProjectsRecord>> {
    const associations = [new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'projects')];

    if (room) {
        associations.push(new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id));
    }

    return await persistence.readByAssociations(associations) as Array<IConnectedProjectsRecord>;
}

export async function persistConnectedProjects(persis: IPersistence, room: IRoom, connectedProjects: object): Promise<void> {
    const roomAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id);
    const projectsAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'projects');

    await persis.removeByAssociations([roomAssociation, projectsAssociation]);

    await persis.createWithAssociations({ room: room.id, connectedProjects }, [roomAssociation, projectsAssociation]);
}

export async function isProjectConnected(persistence: IPersistenceRead, project: IJiraProject, room?: IRoom): Promise<boolean> {
    const persistenceRecords = await getConnectedProjects(persistence, room);
    // tslint:disable-next-line:no-shadowed-variable
    let isProjectConnected = false;

    persistenceRecords.forEach((record) => !(isProjectConnected = record.connectedProjects.hasOwnProperty(project.key)));

    return isProjectConnected;
}

export async function getInstallationData(persistence: IPersistenceRead): Promise<IInstallationData | null> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'auth');
    const result = await persistence.readByAssociation(association) as Array<IInstallationData>;

    return result.length ? result[0] : null;
}
