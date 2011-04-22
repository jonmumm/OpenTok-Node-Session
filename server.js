// Import the Node modules we need
var connect = require('connect'),
	io = require('socket.io'),
	opentok = require('opentok');

// Set up the HTTP server for serving our static fiels
var server = connect(
	connect.static(__dirname + "/web")
);
server.listen(3000); // Start server on port 3000

// Set up Socket listener and initialize event handlers
var socket = io.listen(server);
socket.on('connection', function(client) {
	
	// When a client connects, figure out which session to join
	getSession(client);
	
	client.on('disconnect', function() {
		// When a client disconnects, drop that client from the session
		leaveSession(client);
	});
});

// OpenTok Variables
var OPENTOK_API_KEY = '413302',		// Replace with your API key
	OPENTOK_API_SECRET = 'fc512f1f3c13e3ec3f590386c986842f92efa7e7',		// Replace with your API secret

	// OpenTok SDK
	ot = new opentok.OpenTokSDK(OPENTOK_API_KEY, OPENTOK_API_SECRET),
	
	// NOTE: Uncomment for production, defaults to "staging.tokbox.com"
	// ot.setEnvironment("api.tokbox.com"),
	
	// Variables for managing OpenTok Sessions
	MAX_SESSION_CONNECTIONS = 3,	// Maximum number of client connections we want in a given session	
 	session_map = {},				// Hash for getting the session of a given client
	ot_sessions = new Array();		// Array for holding all sessions we have generated

// Finds an available session for the client to connect to
function getSession(client) {
	
	var session;
	// Look through all sessions to find a session that has less than the max number of sessions
	// NOTE: We start searching from the top of the array since it is more likely a non-full session is there
	for (var i = ot_sessions.length - 1; i >= 0; i--) {
		var tmp_session = ot_sessions[i];
		if (tmp_session.clients.length < MAX_SESSION_CONNECTIONS) {
			session = tmp_session;
			break;
		}
	}
	
	if (!session) {
		// If we didn't find a session, generate one and enter it
		ot.createSession('localhost',{},function(session) {
			ot_sessions.push(session);
			enterSession(session,client);
		})
	} else {
		// Otherwise enter the session we found
		enterSession(session, client);
	}	
}

// Sends the session info back to the client for the client to join
function enterSession(session, client) {
	// Construct info object to pass back to client then send it
	var opentok_info = {
		sessionId: session.sessionId,
		apiKey: OPENTOK_API_KEY,
		token: ot.generateToken()
	}
	client.send(opentok_info);
	
	// Create array to hold all the clients in the session
	if (!session.clients) {
		session.clients = new Array();
	}
	
	// Add the client to the session
	session.clients.push(client.sessionId);
	session_map[client.sessionId] = session;	// Use map later to identify what session client was in
}

// Finds which session the client was in and removes the client from that session.
function leaveSession(client) {
	// Find the session that the client was in
	var session = session_map[client.sessionId];
	
	// Find the position of the client in the session
	var index = session.clients.indexOf(client.sessionId);
	
	// Remove the client from the session
	session.clients.splice(index, 1);
}