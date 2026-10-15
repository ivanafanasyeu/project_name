const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

if (!clientId || !clientSecret) {
	throw new Error('Set CLIENT_ID and CLIENT_SECRET in your environment');
}

const port = process.env.PORT ?? '3000';
const tokenUrl = `http://localhost:${port}/auth/token`;
const response = await fetch(tokenUrl, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({
		client_id: clientId,
		client_secret: clientSecret,
	}),
});
const result = await response.json();

if (!response.ok) {
	throw new Error(result.message ?? `Token request failed (${response.status})`);
}

if (typeof result.access_token !== 'string') {
	throw new Error('Token endpoint returned no access_token');
}

console.log(result.access_token);