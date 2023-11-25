import net from 'net';
import fs from 'fs';
import path from 'path';
import { getType } from 'mime';
import httpStatusCodes from './lib/statusCodes.json';

const server = net.createServer();

type HttpHeaders = object;
type HttpRequestLine = {
    method: string;
    path: string;
    version: string;
};

type ParsedHttpData = [
    HttpRequestLine,
    HttpHeaders
];

function connectionHandler(conn: net.Socket) {
    const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;

    function dataHandler(buf: Buffer) {
        const data = buf.toString();
        const [requestLine, headers] = parseHttpData(data) as ParsedHttpData;

        if (!requestLine) {
            return conn.destroy(new Error('http/1 request line missing'));
        }

        switch (requestLine.method) {
            case 'GET':
                return handleGetRequest(conn, requestLine, headers);
            default:
                return;
        }
    }

    function closeHandler() {
        console.log('connection closed from %s', remoteAddress);
    }

    function errorHandler(err: Error) {
        console.log('connection %s error: %s', remoteAddress, err.message);
    }

    conn.on('data', dataHandler);
    conn.on('close', closeHandler);
    conn.on('error', errorHandler);
}

function parseHttpData(data: String): [HttpRequestLine, HttpHeaders] {
    const HEADER_KEY_VALUE_SEPERATOR = ': ';
    const EXPECTED_HEADER_ARRAY_LENGTH = 2;
    const REQUEST_LINE_VALUE_SEPERATOR = ' ';
    const NEWLINE_CHARACTER = '\n';
    const MATCH_CARRIAGE_RETURN_REGEX = /\r/g;

    const lines: Array<string> = data.split(NEWLINE_CHARACTER)
        .map(ln => ln.replace(MATCH_CARRIAGE_RETURN_REGEX, ''));

    const requestLine: Array<string> = lines[0]
        .split(REQUEST_LINE_VALUE_SEPERATOR);
    const requestLineFormatted: HttpRequestLine = {
        method: requestLine[0],
        path: requestLine[1],
        version: requestLine[2]
    }

    const headerLines: Array<Array<string>> = lines.slice(1)
        .map(ln => ln.split(HEADER_KEY_VALUE_SEPERATOR))
        .filter(ln => ln.length == EXPECTED_HEADER_ARRAY_LENGTH);
    const headers: HttpHeaders = Object.fromEntries(headerLines);

    return [requestLineFormatted, headers];
}

function handleGetRequest(
    conn: net.Socket,
    requestLine: HttpRequestLine,
    headers: HttpHeaders
): void {
    const IS_REQUESTING_INDEX = [
        '/',
        '/index.html'
    ].includes(requestLine.path);
    const REQUEST_PATH = path.join(
        __dirname,
        '/../data/public_html/',
        IS_REQUESTING_INDEX ? 'index.html' : requestLine.path
    );

    // this should obviously not be included on a production server but this is
    // a project exclusively for learning, so we'll allow ourselves to do this.
    if (requestLine.path == '/.env.json') {
        return sendJSON(process.env, 200, conn);
    }

    if (!fs.existsSync(REQUEST_PATH)) {
        return sendErrorPage(404, conn);
    }

    const lstat = fs.lstatSync(REQUEST_PATH);
    if (lstat.isDirectory() &&
        fs.existsSync(
            path.join(REQUEST_PATH, '/index.html')
        )
    ) {
        return sendResponse(path.join(REQUEST_PATH, 'index.html'), 200, conn);
    }

    return sendResponse(REQUEST_PATH, 200, conn);
}

function constructHttpResponseHeaders(
    statusCode: number, 
    contentLength: number,
    contentType: string
): string {
    const HTTP_STATUS_VERB = Object.values(httpStatusCodes)
        .find(e => e.code == statusCode)?.message;

    if (!HTTP_STATUS_VERB) {
        throw 'unknown or undefined http status code (cannot resolve to message)';
    }

    let returnText = "";
    returnText += `HTTP/1.1 ${statusCode} ${HTTP_STATUS_VERB}\n`;
    returnText += `Date: ${new Date().toUTCString()}\n`;
    returnText += 'Server: ts-tcp-httpserver\n';
    returnText += 'Accept-Ranges: no\n';
    returnText += `Content-Length: ${contentLength}\n`;
    returnText += `Content-Type: ${contentType}\n`;

    return returnText;
}

function sendErrorPage(statusCode: number, conn: net.Socket): void {
    const DOCUMENT_PATH = path.join(
        __dirname,
        '/../data/private_html/',
        `${statusCode}.html`
    );

    if (!fs.existsSync(DOCUMENT_PATH)) {
        throw 'unsupported standard page';
    }

    return sendResponse(DOCUMENT_PATH, statusCode, conn, 'text/html');
}

function sendResponse(
    path: string,
    statusCode: number,
    conn: net.Socket,
    contentType: string|null = null,
): void {
    const file = fs.readFileSync(path);
    const fileSize = fs.statSync(path).size;

    // mimetype can be explicitly set so loops do not occur when sendErrorPage()
    // calls sendResponse().
    const mimetype = contentType ? contentType : getType(path);
    if (!mimetype) {
        return sendErrorPage(500, conn);
    }

    const httpResHeaders = constructHttpResponseHeaders(
        statusCode,
        fileSize,
        mimetype
    ) + '\n';

    const headerBuffer = Buffer.from(httpResHeaders);
    const concatBuffer = Buffer.concat(
        [headerBuffer, file],
        headerBuffer.length + file.length
    );

    conn.write(concatBuffer);
}

function sendJSON(json: object, statusCode: number, conn: net.Socket): void {
    const data = JSON.stringify(json);

    const httpResHeaders = constructHttpResponseHeaders(
        statusCode,
        sizeof(data),
        'application/json'
    ) + '\n';

    conn.write(httpResHeaders + data);
}

function sizeof(s: string): number {
    return new Blob([s]).size;
}

server.on('connection', connectionHandler);
server.listen(9000, () => {
    console.log('server listening on %j', server.address());
});