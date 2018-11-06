import { IHttp, IRead } from '@rocket.chat/apps-engine/definition/accessors';

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

export interface IJiraField {
    self: string;
    name: string;
    id: number;
    [ key: string ]: any;
}

export interface IJiraIssueFields {
    summary: string;
    description: string;
    project: IJiraProject;
    attachment: Array<any>;
    issuetype: IJiraField;
    assignee: IJiraField;
    priority: IJiraField;
    status: IJiraField;
}

export interface IJiraIssue {
    expand: string;
    id: string;
    self: string;
    key: string;
    fields: IJiraIssueFields;
}

export interface IJiraError {
    errorMessages: Array<string>;
    errors: object;
}

export interface IJiraSearchResponse<T = object> {
    self: string;
    maxResults: number;
    startAt: number;
    total: number;
    isLast: boolean;
    values: Array<T>;
}

class Jira {
    public async get(read: IRead, http: IHttp, path: string): Promise<IJiraSearchResponse | IJiraIssue> {
        const { url, token } = await getUrlAndAuthToken(read, path);
        const response = await http.get(url, { headers: { Authorization: `JWT ${token}` } });

        return JSON.parse(response.content || '{}');
    }

    public listProjects(read: IRead, http: IHttp): Promise<IJiraSearchResponse<IJiraProject>> {
        return this.get(read, http, '/rest/api/3/project/search?expand=description') as Promise<IJiraSearchResponse<IJiraProject>>;
    }

    public getProject(read: IRead, http: IHttp, project: string): Promise<IJiraSearchResponse<IJiraProject>> {
        return this.get(read, http, `/rest/api/3/project/search?query=${project}&expand=description`) as Promise<IJiraSearchResponse<IJiraProject>>;
    }

    public getIssue(read: IRead, http: IHttp, issueKey: string): Promise<IJiraIssue | IJiraError> {
        return this.get(
            read,
            http,
            `/rest/api/2/issue/${issueKey}?fields=summary,attachment,status,assignee,priority,project,issuetype,description`
        ) as Promise<IJiraIssue | IJiraError>;
    }
}

export const sdk = new Jira();
