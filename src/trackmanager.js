var config = require('./config').config,
    Q = require('q'),
    Utils = require('./utils').Utils;

/**
 * Creates a new PlaylistManager.
 *
 * @param {Object} artists An array of artists.
 */
function TrackManager(spotifyApi, userId, targetPlaylists, index) {
  if (!spotifyApi) {
    throw new Error('TrackManager requires an instance of spotifyApi.');
  }
  this.spotifyApi = spotifyApi;
  this.userId = userId;
  this.targetPlaylists = targetPlaylists;
  this.index = index;
}

TrackManager.prototype.addTracks = function(data) {
  var tracks = [];
  console.log(data.songs.length);
  for (var i = 0, max = data.songs.length; i < max; i++) {
    if (data.songs[i].tracks[0]) {
      tracks.push(data.songs[i].tracks[0].foreign_id);
    }
  }
  var playlistId = this.targetPlaylists.lookup[this.targetPlaylists.list[this.index]];
  return this.spotifyApi.replaceTracksInPlaylist(this.userId, playlistId, tracks);
};

/**
 * Handles errors.
 * @param  {Object} error  An error object.
 */
TrackManager.prototype.handleError = function(deferred, error) {
  deferred.reject(error);
};
exports.TrackManager = TrackManager
