// Import the Node modules we need
var connect = require('connect'),
	io = require('socket.io'),
	http = require('http'),
	opentok = require('opentok');

// Set up the HTTP server for serving our static fiels
var app = connect(
	connect.static(__dirname + "/web")
);
var server = http.createServer(app);
server.listen(3000); // Start server on port 3001

// Set up Socket listener and initialize event handlers
var socket = io.listen(server);
socket.sockets.on('connection', function(client) {
	
	// When a client connects, figure out which session to join
	getSession(client);
	
	client.on('disconnect', function() {
		// When a client disconnects, drop that client from the session
		leaveSession(client);
	});
});

// OpenTok Variables
var OPENTOK_API_KEY = '15943661',		// Replace with your API key
	OPENTOK_API_SECRET = 'e0ee51f8ff4912a3867344250d4181e4e1a047a3',		// Replace with your API secret

	// OpenTok SDK
	ot = new opentok.OpenTokSDK(OPENTOK_API_KEY, OPENTOK_API_SECRET),
	
	// NOTE: Uncomment for production, defaults to "staging.tokbox.com"
	// ot.setEnvironment("api.tokbox.com"),
	
	// Variables for managing OpenTok Sessions
	MAX_SESSION_CONNECTIONS = 3,	// Maximum number of client connections we want in a given session	
 	session_map = {},				// Hash for getting the session of a given client
	ot_sessions = new Array();		// Array for holding all sessions we have generated

var session;
// Finds an available session for the client to connect to
function getSession(client) {
	
	if (!session) {
		// If we didn't find a session, generate one and enter it
		ot.create_session('localhost', {}, function(sessionId) {
			session = sessionId;
			enterSession(session, client);
		})
	} else {
		// Otherwise enter the session we found
		enterSession(session, client);
	}	
}
var clients;
// Sends the session info back to the client for the client to join
function enterSession (session, client) {
	// Construct info object to pass back to client then send it
	var opentok_info = {
		sessionId: session,
		apiKey: OPENTOK_API_KEY,
		token: ot.generateToken()
	}
	client.emit('opentok_info', opentok_info);

	// Create array to hold all the clients in the session
	if (!clients) {
		clients = new Array();
	}

	// Add the client to the session
	clients.push(client.sessionId);
	session_map[client.sessionId] = session;	// Use map later to identify what session client was in
}

// Finds which session the client was in and removes the client from that session.
function leaveSession(client) {
	// Find the session that the client was in
	var session = session_map[client.sessionId];
	
	// Find the position of the client in the session
	var index = clients.indexOf(client.sessionId);
	
	// Remove the client from the session
	clients.splice(index, 1);
}