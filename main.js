var express = require('express');
var app = express();
var server = require('http').createServer(app);
var request = require('request');

var SpotifyWebApi = require('spotify-web-api-node');

var scopes = ['playlist-modify-public'],
    redirectUri = 'http://localhost:8888/callback', // make sure this uri is whitelisted; https://developer.spotify.com/my-applications
    clientId = 'ac28b81dffde45839c7b00ca2fc19494',
    clientSecret = 'd441fedb47704a4ba822c2370d2a472a', // IMPORTANT: Add your client secret.
    state = 'some-state-of-my-choice',
    port = 8888;

var spotifyApi = new SpotifyWebApi({
  redirectUri : redirectUri,
  clientId : clientId,
  clientSecret : clientSecret
});

var userId;

// Create the authorization URL
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

//

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.render('index', {pageTitle: 'Mood Box setup', authorizeURL: authorizeURL});
});

app.get('/callback', function(req, res) {

  res.render('callback', {pageTitle: 'Mood Box', message: 'You have successfully authorized your Mood Box.'});

  // your application requests refresh and access tokens
  var code = req.query.code;

  getAccessToken(code);
});

app.get('/shiftplaylist', function(req, res) {

  res.render('shiftplaylist', {pageTitle: 'Mood Box shiftplaylist'});

  spotifyApi.removeTracksFromPlaylist(userId, '1FGS9cQJhVBx92yLM5vqFu',
    [{
        'uri' : 'spotify:track:0bsSYZR6pr2NS2dbBZTw71'
    }]);

});

app.get('/thumbup', function(req, res) {
  console.log('thumbup');
});

app.get('/thumbup', function(req, res) {
  console.log('thumbup');
});

server.listen(port);

function getAccessToken(code) {

  // Retrieve an access token and a refresh token
  spotifyApi.authorizationCodeGrant(code)
    .then(function(data) {
      console.log('The token expires in ' + data['expires_in']);
      console.log('The access token is ' + data['access_token']);
      console.log('The refresh token is ' + data['refresh_token']);

      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(data['access_token']);
      spotifyApi.setRefreshToken(data['refresh_token']);

      return spotifyApi.getMe(); // Get user details
    })
    .then(function(data) {
      userId = data.id;
      return spotifyApi.getUserPlaylists(userId); // Get the user's playlists
    })
    .then(function(data) {
      for (var i = 0, max = data.items.length; i < max; i++) { // loop thru the playlists
        if (data.items[i].name === 'moodbox-ch1') {


        }
      }
    });
}



