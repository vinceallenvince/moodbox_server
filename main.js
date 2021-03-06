var config = require('./src/config').config;
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var request = require('request');

var SpotifyWebApi = require('spotify-web-api-node');

var scopes = ['playlist-modify-public'],
    redirectUri = config.REDIRECT_URI, // make sure this uri is whitelisted; https://developer.spotify.com/my-applications
    clientId = config.SPOTIFY_API_CLIENT_ID,
    clientSecret = config.SPOTIFY_API_CLIENT_SECRET, // IMPORTANT: Add your client secret.
    state = 'some-state-of-my-choice',
    port = 8888;

var spotifyApi = new SpotifyWebApi({
  redirectUri : redirectUri,
  clientId : clientId,
  clientSecret : clientSecret
});

var userId;

// moodbox uses a naming convention to map playlists to presets
var targetPlaylists = {
  list: ['moodbox-ch1', 'moodbox-ch2', 'moodbox-ch3', 'moodbox-ch4', 'moodbox-ch5'],
  lookup: {}
};

// TODO: when should we use the snapshot id?
var snapshotId;

// Create the authorization URL
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

//

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();
var Channel = require('./src/channel').Channel;
var moods = require('./src/moods').moods;
var channels = [];
var serviceStarted;

//

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.render('index', {pageTitle: 'MoodBox setup', authorizeURL: authorizeURL});
});

app.get('/callback', function(req, res) {

  res.render('callback', {pageTitle: 'MoodBox', messageA: 'You have successfully setup your MoodBox.', messageB: 'Plug in and play music.'});

  // your application requests refresh and access tokens
  var code = req.query.code;

  getAccessToken(code);
});

/**
 * Player should pass a uri and playlist channel
 * http://localhost:8888/shiftplaylist?uri=3MPqUOBndj5unD1dyvSO51&num=2
 */
app.get('/shiftplaylist', function(req, res) {

  var uri = req.query.uri;
  var channelnum = req.query.num; // channel from moodbox-ch1 thru 5
  var playlistId = targetPlaylists.lookup[targetPlaylists.list[channelnum - 1]];

  if (uri.search('spotify:track:') == -1) {
    uri = 'spotify:track:' + uri;
  }

  spotifyApi.removeTracksFromPlaylist(userId, playlistId, [{'uri' : uri}])
    .then(function(response) {
      snapshotId = response.snapshot_id;
      console.log('Removed track %s from %s.', uri, targetPlaylists.list[channelnum - 1]);
    })
    .catch(function(err) {
      console.log(err);
      console.log('Something went wrong!');
    });

  res.render('shiftplaylist', {pageTitle: 'Mood Box shiftplaylist'});

});

/**
 * Player should pass a uri and playlist channel
 * http://localhost:8888/pushplaylist?num=2
 */
app.get('/pushplaylist', function(req, res) {

  var channelnum = req.query.num; // channel from moodbox-ch1 thru 5

  channels[channelnum - 1].update().
  done(function() {
    res.render('pushplaylist', {pageTitle: 'Mood Box pushplaylist'});
  });

});

server.listen(port);

function getAccessToken(code) {

  // setup targetPlaylists
  for (var i = 0, max = targetPlaylists.list.length; i < max; i++) {
    targetPlaylists.lookup[targetPlaylists.list[i]] = false;
  }

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
          playlistName == 'moodbox-ch1' ||
          playlistName == 'moodbox-ch2' ||
          playlistName == 'moodbox-ch3' ||
          playlistName == 'moodbox-ch4' ||
          playlistName == 'moodbox-ch5'
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

function buildChannels() {
  if (!serviceStarted) {
    for (var i = 0; i < moods.length; i++) {
      channels.push(new Channel(spotifyApi, userId, targetPlaylists, moods[i].name, i));
      channels[channels.length - 1].init();
    }
  }
  serviceStarted = true;
}
