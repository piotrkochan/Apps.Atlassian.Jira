/*
 * Based off jwt-simple, adds query string hash verification
 *
 * JSON Web Token encode and decode module for node.js
 *
 * Copyright(c) 2011 Kazuhito Hokamura
 * MIT Licensed
 */

/**
 * module dependencies
 */
import { Buffer } from 'buffer';
import * as crypto from 'crypto';
import * as path from 'path';
import * as url from 'url';

// import { Request as ExpressRequest } from 'express';

export enum Algorithm {
    HS256 = 'HS256',
    HS384 = 'HS384',
    HS512 = 'HS512',
}

function getAlgorithmFromString(rawAlgorithm: string): Algorithm | undefined {
    switch (rawAlgorithm) {
        case 'HS256':
            return Algorithm.HS256;
        case 'HS384':
            return Algorithm.HS384;
        case 'HS512':
            return Algorithm.HS512;
        default:
            return undefined;
    }
}

type Hash = 'sha256' | 'sha384' | 'sha512';

// export function fromExpressRequest(eReq: ExpressRequest): IRequest {
//     // req.originalUrl represents the full URL and req.path represents the URL from the last router
//     // (https://expressjs.com/en/4x/api.html#req.originalUrl)
//     // However, since some people depend on this lib without using real req object but rather mock them, we need this
//     // fallback for it to not break.
//     const pathname = eReq.originalUrl ? url.parse(eReq.originalUrl).pathname : eReq.path;
//     return {
//         method: eReq.method,
//         pathname,
//         query: eReq.query,
//         body: eReq.body,
//     };
// }

export function fromMethodAndUrl(method: string, rawUrl: string): IRequest {
    const parsedUrl = url.parse(rawUrl, true);

    return {
        method,
        pathname: parsedUrl.pathname,
        query: parsedUrl.query,
    };
}

export function fromMethodAndPathAndBody(
    method: 'put' | 'post' | 'delete',
    rawUrl: string,
    body: IParams): IRequest {
    const parsedUrl = url.parse(rawUrl, false);

    return {
        method,
        pathname: parsedUrl.pathname,
        body,
    };
}

export interface IParams {
    [param: string]: any; // tslint:disable-line:no-any
}

/**
 * Fields from an incoming HTTP Request object that are used to generate a signed JWT.
 */
export interface IRequest {
    /**
     * The HTTP method of this request. GET, PUT, POST, DELETE etc
     */
    method: string;

    /**
     * The pathname of this request, should give the same result as calling
     * {@link https://nodejs.org/api/url.html#url_url_pathname uri.pathname}.
     */
    pathname?: string;

    /**
     * The query parameters on this request. Should match the same structure as
     * the {@link https://expressjs.com/en/api.html#req.query req.query} from Express.js.
     */
    query?: IParams;

    /**
     * The body parameters on this request. Should match the same structure as
     * the {@link https://expressjs.com/en/api.html#req.body req.body} from Express.js.
     */
    body?: IParams;
}

/**
 * support algorithm mapping
 */
const algorithmMap: { [alg in Algorithm]: Hash } = {
    HS256: 'sha256',
    HS384: 'sha384',
    HS512: 'sha512',
};

/**
 * The separator between sections of a canonical query.
 */
const CANONICAL_QUERY_SEPARATOR = '&';

/**
 * version
 */
export const version = '0.1.0';

/**
 * Decode jwt
 *
 * @param {Object} token
 * @param {String} key
 * @param {Boolean} noVerify
 * @return {Object} payload
 * @api public
 */
export const decode = function jwt_decode(token: string, key: string, noVerify?: boolean) {
    // check seguments
    const segments = token.split('.');
    if (segments.length !== 3) {
        throw new Error('Not enough or too many segments');
    }

    // All segment should be base64
    const headerSeg = segments[0];
    const payloadSeg = segments[1];
    const signatureSeg = segments[2];

    // base64 decode and parse JSON
    const header = JSON.parse(base64urlDecode(headerSeg));
    const payload = JSON.parse(base64urlDecode(payloadSeg));

    // normalize 'aud' claim, the spec allows both String and Array
    if (payload.aud && !Array.isArray(payload.aud)) {
        payload.aud = [ payload.aud ];
    }

    if (!noVerify) {
        const alg = getAlgorithmFromString(header.alg);
        if (!alg) {
            throw new Error('Algorithm "' + header.alg + '" is not supported');
        }
        const signingMethod = algorithmMap[alg];
        if (!signingMethod) {
            throw new Error('Algorithm "' + header.alg + '" is not supported');
        }

        // verify signature. `sign` will return base64 string.
        const signingInput = [headerSeg, payloadSeg].join('.');
        if (signatureSeg !== sign(signingInput, key, signingMethod)) {
            throw new Error(
                'Signature verification failed for input: ' + signingInput + ' with method ' + signingMethod,
            );
        }
    }

    return payload;
};

/**
 * Encode jwt
 *
 * @param {Object} payload
 * @param {String} key
 * @param {String} algorithm
 * @return {String} token
 * @api public
 */
export const encode = function jwt_encode(payload: object, key: string, algorithm?: Algorithm) {
    // Check key
    if (!key) {
        throw new Error('Require key');
    }

    // Check algorithm, default is HS256
    if (!algorithm) {
        algorithm = Algorithm.HS256;
    }

    const signingMethod = algorithmMap[algorithm];
    if (!signingMethod) {
        throw new Error('Algorithm "' + algorithm + '" is not supported');
    }

    // header, typ is fixed value.
    const header = { typ: 'JWT', alg: algorithm };

    // create segments, all segment should be base64 string
    const segments: Array<string> = [];
    segments.push(base64urlEncode(JSON.stringify(header)));
    segments.push(base64urlEncode(JSON.stringify(payload)));
    segments.push(sign(segments.join('.'), key, signingMethod));

    return segments.join('.');
};

export function createCanonicalRequest(req: IRequest, checkBodyForParams?: boolean, baseUrl?: string): string {
    return canonicalizeMethod(req) +
        CANONICAL_QUERY_SEPARATOR +
        canonicalizeUri(req, baseUrl) +
        CANONICAL_QUERY_SEPARATOR +
        canonicalizeQueryString(req, checkBodyForParams);
}

export function createQueryStringHash(req: IRequest, checkBodyForParams?: boolean, baseUrl?: string): string {
    return crypto
        .createHash(algorithmMap.HS256)
        .update(createCanonicalRequest(req, checkBodyForParams, baseUrl))
        .digest('hex');
}

/**
 * private util functions
 */

function sign(input: string, key: string, method: Hash) {
    const base64str = crypto.createHmac(method, key).update(input).digest('base64');
    return base64urlEscape(base64str);
}

function base64urlDecode(str: string): string {
    return new Buffer(base64urlUnescape(str), 'base64').toString();
}

function base64urlUnescape(str: string): string {
    str += Array(5 - str.length % 4).join('=');
    return str.replace(/\-/g, '+').replace(/_/g, '/');
}

function base64urlEncode(str: string): string {
    return base64urlEscape(new Buffer(str).toString('base64'));
}

function base64urlEscape(str: string): string {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function canonicalizeMethod(req: IRequest): string {
    return req.method.toUpperCase();
}

function canonicalizeUri(req: IRequest, baseUrlString: string = '/') {
    let pathname = req.pathname;
    const baseUrl = url.parse(baseUrlString);

    if (!baseUrl.pathname) {
        return;
    }

    const baseUrlPath = baseUrl.pathname;

    if (pathname && pathname.indexOf(baseUrlPath) === 0) {
        pathname = pathname.slice(baseUrlPath.length);
    }

    if (!pathname || pathname.length === 0) {
        return '/';
    }

    // If the separator is not URL encoded then the following URLs have the same query-string-hash:
    //   https://djtest9.jira-dev.com/rest/api/2/project&a=b?x=y
    //   https://djtest9.jira-dev.com/rest/api/2/project?a=b&x=y
    pathname = pathname.replace(new RegExp(CANONICAL_QUERY_SEPARATOR, 'g'), encodeRfc3986(CANONICAL_QUERY_SEPARATOR));

    // prefix with /
    if (pathname[0] !== '/') {
        pathname = '/' + pathname;
    }

    // remove trailing /
    if (pathname.length > 1 && pathname[pathname.length - 1] === '/') {
        pathname = pathname.substring(0, pathname.length - 1);
    }

    return pathname;
}

function canonicalizeQueryString(req: IRequest, checkBodyForParams?: boolean) {
    let queryParams = req.query;
    const method = req.method.toUpperCase();

    // Apache HTTP client (or something) sometimes likes to take the query string and put it into the request body
    // if the method is PUT or POST
    if (checkBodyForParams && (queryParams == null || Object.keys(queryParams).length === 0) && (method === 'POST' || method === 'PUT')) {
        queryParams = req.body;
    }

    const sortedQueryString = new Array<string>();
    const query = Object.assign({}, queryParams);

    if (queryParams != null && Object.keys(queryParams).length) {
        // remove the 'jwt' query string param
        delete query.jwt;

        Object.keys(query).sort().forEach((key) => {
            // The __proto__ field can sometimes sneak in depending on what node version is being used.
            // Get rid of it or the qsh calculation will be wrong.
            if (key === '__proto__') {
                return;
            }
            const param = query[key];
            let paramValue = '';
            if (Array.isArray(param)) {
                paramValue = param.sort().map(encodeRfc3986).join(',');
            } else {
                paramValue = encodeRfc3986(param);
            }
            sortedQueryString.push(encodeRfc3986(key) + '=' + paramValue);
        });
    }
    return sortedQueryString.join('&');
}

/**
 * We follow the same rules as specified in OAuth1:
 * Percent-encode everything but the unreserved characters according to RFC-3986:
 * unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
 * See http://tools.ietf.org/html/rfc3986
 */
function encodeRfc3986(value: string): string {
    return encodeURIComponent(value)
        .replace(/[!'()]/g, escape)
        .replace(/\*/g, '%2A');
}
