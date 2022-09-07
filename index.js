const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => { res.send("Logged In Successfully") })

app.get("/spreadsheet/:spreadsheetId", async (req, res) => {
	try {
		const auth = new google.auth.GoogleAuth({
			keyFile: "credentials.json",
			scopes: "https://www.googleapis.com/auth/spreadsheets",
		});

		const client = await auth.getClient();

		const googleSheets = google.sheets({ version: "v4", auth: client });

		const spreadsheetId = req.params.spreadsheetId;

		const metaData = await googleSheets.spreadsheets.values.get({
			auth,
			spreadsheetId,
			range: "Sheet1",
		});

		const values = metaData.data.values;

		const value = {}
		const return_values = []
		for (let i = 0; i < values.length; i++) {
			Object.assign(value, values[i])
			return_values.push(value)
		}

		const response = {}
		response[spreadsheetId] = return_values
		res.send({ sucess: true, data: response });
	} catch (error) {
		res.send({ success: false, error: error.response.data.error.message });
	}
});

app.post("/spreadsheet/update", async (req, res) => {
	try {
		const body = req.body;
		const spreadsheet_id = body.spreadsheet_id;
		const sheet_id = body.sheet_id;
		const row_number = body.row_number;
		const column_number = body.column_number;
		const value = body.value;

		const auth = new google.auth.GoogleAuth({
			keyFile: "credentials.json",
			scopes: "https://www.googleapis.com/auth/spreadsheets",
		});

		const client = await auth.getClient();

		const googleSheets = google.sheets({ version: "v4", auth: client });

		const result = await googleSheets.spreadsheets.values.update({
			auth,
			spreadsheetId: spreadsheet_id,
			range: `${sheet_id}!R${row_number}C${column_number}`,
			valueInputOption: "USER_ENTERED",
			resource: {
				values: [[`${value}`]],
			},
		});

		res.status(200).send({ success: true });
	} catch (e) {
		res.send({ success: false, error: e.response.data.error });
	}
});

app.get("/login", async (req, res) => {
	const credentials = JSON.parse(
		await fs.readFile("desktop-client-secret.json", "utf-8")
	);

	const {
		client_secret: clientSecret,
		client_id: clientId,
		redirect_uris: redirectUris,
	} = credentials.installed;

	const oAuth2Client = new google.auth.OAuth2(
		clientId,
		clientSecret,
		redirectUris[0]
	);

	// Generate a url that asks permissions for Gmail scopes
	const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

	const url = oAuth2Client.generateAuthUrl({
		access_type: "offline",
		scope: SCOPES,
	});

	console.log(`authUrl: ${url}`);
	res.send(url)
});

app.listen(port, () => console.log(`App running on port ${port}`));
