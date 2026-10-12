import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL('https://dev-govi.internal.pallakastudio.com/mcp/cakada');
const transport = new StreamableHTTPClientTransport(url);

transport.onmessage = (msg) => console.log('MSG:', JSON.stringify(msg));
transport.onclose = () => console.log('CLOSED');
transport.onerror = (err) => console.error('ERROR:', err);

try {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', Authorization: 'Bearer ' + process.env.MCP_TOKEN },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
        duplex: 'half'
    });
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    const reader = response.body.getReader();
    const { value, done } = await reader.read();
    console.log('First chunk:', new TextDecoder().decode(value));
} catch (e) {
    console.error('Fetch error:', e.message);
}
