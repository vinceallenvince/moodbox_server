var config = require('./config').config,
    echojs = require('echojs'),
    moods = require('./moods').moods,
    Q = require('q'),
    Utils = require('./utils').Utils;

var echo = echojs({
  key: config.EN_API_KEY
});

var TOTAL_ARTIST_RESULTS = 5;
var TOTAL_PLAYLIST_RESULTS = config.TOTAL_PLAYLIST_RESULTS || 20; // TODO: Add to config file.

/**
 * Creates a new PlaylistManager.
 *
 * @param {Object} artists An array of artists.
 */
function PlaylistManager() {
  this.artists = null;
}

/**
 * Creates a dynamic playlist session from the EN playlist endpoint.
 */
PlaylistManager.prototype.createPlaylist = function(artists) {

  if (!artists) {
    this.handleError(new Error('PlaylistManager: requires \'artists\' parameter.'));
  }

  var deferred = Q.defer();

  this.artists = artists;

  var l = this.artists.length;
  var artist_seeds = [];
  for (var i = 0; i < l; i++) {
    artist_seeds.push(this.artists[i].id);
  }

  echo('playlist/static').get({
    format: 'json',
    results: TOTAL_PLAYLIST_RESULTS,
    type: 'artist',
    artist: artist_seeds,
    target_tempo: Utils.map(this.index, 0, moods.length - 1, 500, 0),
    target_danceability: Utils.map(this.index, 0, moods.length - 1, 1, 0),
    target_energy: Utils.map(this.index, 0, moods.length - 1, 1, 0),
    song_selection: this.index < moods.length / 2 ? 'valence-top' : 'valence-bottom',
    variety: 1,
    adventurousness: 1,
    distribution: 'wandering',
    bucket: ['id:spotify', 'tracks'],
    callback: Utils.bustClientCache()
  }, this.handleCreatePlaylist.bind(this, deferred));

  return deferred.promise;
};

/**
 * Handles the EN create playlist session request.
 * @param  {Object} err  An error object.
 * @param  {Object} json Data returned from the request.
 */
PlaylistManager.prototype.handleCreatePlaylist = function(deferred, error, json) {
  if (error) {
    this.handleError(deferred, new Error(error));
    return;
  }
  deferred.resolve(json.response);
};

/**
 * Handles errors.
 * @param  {Object} error  An error object.
 */
PlaylistManager.prototype.handleError = function(deferred, error) {
  deferred.reject(error);
};

exports.PlaylistManager = PlaylistManager;
