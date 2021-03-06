var config = require('./config').config,
    Q = require('q'),
    ArtistManager = require('./artistmanager.js').ArtistManager,
    PlaylistManager = require('./playlistmanager.js').PlaylistManager,
    TrackManager = require('./trackmanager.js').TrackManager,
    moods = require('./moods').moods;

var ARTIST_GENRE = config.ARTIST_GENRE || 'blues';

/**
 * Creates a new Channel.
 *
 * @param {string} genre An instance of EventEmitter.
 * @param {string} mood    A an artist descriptor.
 */
function Channel(spotifyApi, userId, targetPlaylists, mood, index) {

  /*if (!mood || typeof index === 'undefined') {
    this.fail(new Error('Channel: requires \'mood\' and \'index\' parameters.'));
  }*/

  this.spotifyApi = spotifyApi;
  this.userId = userId;
  this.targetPlaylists = targetPlaylists;
  this.mood = mood;
  this.index = index;
  this.fetching = false;
}

Channel.prototype.init = function() {

  this.artistMgr = new ArtistManager(ARTIST_GENRE, this.mood);
  this.playlistMgr = new PlaylistManager();
  this.trackMgr = new TrackManager(this.spotifyApi, this.userId, this.targetPlaylists, this.index);

  Q.fcall(this.artistMgr.getArtists.bind(this.artistMgr)).
  then(this.playlistMgr.createPlaylist.bind(this.playlistMgr)).
  then(this.trackMgr.addTracks.bind(this.trackMgr)).
  fail(this.fail.bind(this)).
  done();
};

Channel.prototype.update = function() {

  var deferred = Q.defer();

  Q.fcall(this.artistMgr.getArtists.bind(this.artistMgr)).
  then(this.playlistMgr.createPlaylist.bind(this.playlistMgr)).
  then(this.trackMgr.addTracks.bind(this.trackMgr)).
  fail(this.fail.bind(this)).
  done(function() {
    deferred.resolve();
  });

  return deferred.promise;
};

Channel.ready = false;

Channel.prototype.fail = function(error) {
  console.error(error);
  this.fetching = false;
};

exports.Channel = Channel;
