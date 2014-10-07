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

var targetPlaylists = {
  list: ['moodbox-ch0', 'moodbox-ch1', 'moodbox-ch2', 'moodbox-ch3', 'moodbox-ch4'],
  lookup: {
    'moodbox-ch0': false,
    'moodbox-ch1': false,
    'moodbox-ch2': false,
    'moodbox-ch3': false,
    'moodbox-ch4': false
  }
};

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

  /*spotifyApi.removeTracksFromPlaylist(userId, '1FGS9cQJhVBx92yLM5vqFu',
    [{
        'uri' : 'spotify:track:0bsSYZR6pr2NS2dbBZTw71'
    }]);*/

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
      return spotifyApi.getUserPlaylists(userId, {limit: 50}); // Get the user's playlists
    })
    .then(function(data) {
      var playlistName;
      for (var i = 0, max = data.items.length; i < max; i++) { // loop thru the playlists
        playlistName = data.items[i].name;
        if (
          playlistName == 'moodbox-ch0' ||
          playlistName == 'moodbox-ch1' ||
          playlistName == 'moodbox-ch2' ||
          playlistName == 'moodbox-ch3' ||
          playlistName == 'moodbox-ch4'
          ) {
          targetPlaylists.lookup[playlistName] = data.items[i].id;
        }
      }
      console.log(targetPlaylists.lookup);

      // uncomment to create target playlists that do not exist
      /*for (var j = 0, max = targetPlaylists.list.length; j < max; j++) {
        var playlistName = targetPlaylists.list[j];
        if (!targetPlaylists.lookup[playlistName]) { // create the target playlists
          spotifyApi.createPlaylist(userId, playlistName, {'public': true})
          .then(function(data) {
            targetPlaylists.lookup[playlistName] = data.id;
            console.log('Created playlist %s: %s', data.name, data.id);
          }, function(err) {
            console.log('Something went wrong!', err);
          });
        }
      }*/

      buildChannels();

    });
}

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();
var Channel = require('./src/channel').Channel;
var moods = require('./src/moods').moods;
var channels = [];
var serviceStarted;

function buildChannels() {
  if (!serviceStarted) {
    for (var i = 0; i < moods.length; i++) {
      channels.push(new Channel(spotifyApi, userId, targetPlaylists, emitter, moods[i].name, i));
      channels[channels.length - 1].init();
    }
  }
  serviceStarted = true;
}
