import { IHttp, IHttpResponse, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { getUrlAndAuthToken } from '../lib/helpers';

export interface IAvatarUrls {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
}

export interface IJiraProject {
    expand: string;
    self: string;
    id: string;
    key: string;
    description: string;
    name: string;
    avatarUrls: IAvatarUrls;
    projectTypeKey: string;
    simplified: boolean;
    style: string;
}

export interface IJiraResponse<T = object> {
    self: string;
    maxResults: number;
    startAt: number;
    total: number;
    isLast: boolean;
    values: Array<T>;
}

class Jira {
    public async get(read: IRead, http: IHttp, path: string): Promise<IJiraResponse> {
        const { url, token } = await getUrlAndAuthToken(read, path);
        const response = await http.get(url, { headers: { Authorization: `JWT ${token}` } });

        return JSON.parse(response.content || '{}');
    }

    public async listProjects(read: IRead, http: IHttp): Promise<IJiraResponse<IJiraProject>> {
        return await this.get(read, http, '/rest/api/3/project/search?expand=description') as IJiraResponse<IJiraProject>;
    }

    public async getProject(read: IRead, http: IHttp, project: string): Promise<IJiraResponse<IJiraProject>> {
        return await this.get(read, http, `/rest/api/3/project/search?query=${project}&expand=description`) as IJiraResponse<IJiraProject>;
    }
}

export const sdk = new Jira();
