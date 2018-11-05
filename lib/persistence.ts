import { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';

export interface IConnectedProjectsRecord {
    room: string;
    connectedProjects: object;
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
