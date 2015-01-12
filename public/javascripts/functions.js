
// Lookup URL
var Record = function (date, name, link) {

      var self    = this;
      self.date   = date;
      self.name   = name;
      self.link   = link;
      self.url    = 'http://216.119.100.169/history/rating/History/TResult.asp?' + link;
};

var StatGroup = function (statName, description) {

      var self         = this;
      self.name        = statName;
      self.description = description;
      self.wins        = ko.observable(0);
      self.losses      = ko.observable(0);
      self.sessions    = ko.observableArray([]);

      self.show_sessions = ko.computed(function() {
          return self.sessions.slice(0,5);
      }, self);

      self.reset = function() {
          self.wins(0);
          self.losses(0);
          self.sessions.removeAll();
          console.log('Sessions removed from ' + self.name)
      };

      self.played = ko.computed(function() {
          return self.wins() + self.losses();
      }, self);

      self.win_percentage = ko.computed(function() {
          return (self.wins() / self.played() * 100).toFixed(1) + '%';
      }, self);
};

var Player = function(name, rating, state, pid) {

    var self = this;
    self.name     = name.trim();
    self.rating   = rating.trim();
    self.state    = state.trim();
    self.pid      = pid.trim();
    self.fullName = ko.computed(function() {
        var pieces = self.name.split(',');
        return pieces[1] + ' ' + pieces[0];
    }, self);
};

// Some sample players
var sample_player = new Player('Sterling Jr, Daryl', '1741', 'CA', '54127');
var sample_player2 = new Player('Leibovitz, Tahl', '2444', 'NY', '39942');

ko.bindingHandlers.fadeVisible = {
    init: function(element, valueAccessor) {
        // Start visible/invisible according to initial value
        var shouldDisplay = valueAccessor();
        $(element).toggle(shouldDisplay);
    },
    update: function(element, valueAccessor) {
        // On update, fade in/out
        var shouldDisplay = valueAccessor();
        shouldDisplay ? $(element).fadeIn() : $(element).fadeOut();
    }
};

ko.bindingHandlers.slideVisible = {
    init: function(element, valueAccessor) {
        // Start visible/invisible according to initial value
        var shouldDisplay = valueAccessor();
        $(element).toggle(shouldDisplay);
    },
    update: function(element, valueAccessor) {
        // On update, fade in/out
        var shouldDisplay = valueAccessor();
        shouldDisplay ? $(element).slideDown('slow') : $(element).slideUp('slow');
    }
};

// Overall viewmodel for this screen, along with initial state
function StatsViewModel() {
    var self = this;

    self.names_found = ko.observableArray([]);
    self.firstName   = ko.observable('');
    self.lastName    = ko.observable('');
    self.player1     = ko.observable(false);
    self.player2     = ko.observable(false);

    // Tournaments is a special case
    self.tournaments = new StatGroup('Overview', "Here's a breakdown of how you did in tournaments.");
    self.tournaments.played = ko.observable(0);

    self.matches  = new StatGroup('Matches', "Here's a breakdown of how you did in individual matches");
    self.sweeps   = new StatGroup('Sweeps', "A <strong>sweep</strong> is a match where you didn't lose a single game! For example: 3-0");
    self.blowouts = new StatGroup('Blowouts', "A <strong>blowout</strong> is a match where you didn't win a single game! For example: 0-3");
    self.playoffs = new StatGroup('Playoffs', "A <strong>playoff</strong> match is a match that takes place <em>after</em> the round robin group. For example: Open Singles Final");
    self.nail_biters = new StatGroup('Nail Biters', "A <strong>nail biter</strong> is a close match down to the final game! For example: 9-11 in the 5th game or Deuce in the 7th");
    self.comebacks = new StatGroup('Comebacks', "A <strong>comeback</strong> is match where you are about to be swept and turn things around to victory in the final game! For example: You are down 0-2 and win in the 5th");

    self.games    = new StatGroup('Games', "Here's a breakdown of how you did in individual games");
    self.deuces   = new StatGroup('Deuces', "When the score becomes 10-10, the game is tied at deuce. How do you do in those situations?");

    self.resetStats = function() {

        self.tournaments.reset();
        self.tournaments.played(0);
        self.matches.reset();
        self.sweeps.reset();
        self.blowouts.reset();
        self.games.reset();
        self.deuces.reset();
    }

    self.lookupPlayer = function() {
        if(self.lastName().length <= 0) {
            alert('You must enter your last name.');
            return;
        }
        $.get('fetch/names?lastName=' + self.lastName(), function(data) {
            self.names_found(extractNameData(data));
            console.log('Found ' + self.names_found().length + ' names');
        });
    }

    self.selectPlayer = function(player) {
        self.player1(player);

        console.log('Calling tournaments...')
        $.get('fetch/tournaments?id=' + self.player1().pid, function(html) {

          $('#loading-area').html(html.replace('<link', '<meta'));

          console.log('GOT  tournaments: ' + $('#loading-area > table tbody tr').length )
          self.tournament_list = $('#loading-area > table tbody tr').slice(4).each(function(i, item) {

              // For each tournament sum the wins and losses
              var stats       = $('td:last', item).text().trim().split(' - '),
                  tournaments = self.tournaments,
                  matches     = self.matches,
                  games       = self.games,
                  wins        = parseInt(stats[0]),
                  losses      = parseInt(stats[1]),

                  this_tournament = new Record($('td:nth(1)', item).text().trim(),
                                               $('td:first', item).text().trim(),
                                               $('td:last a', item).attr('href').split('?').pop());

              // Record match wins & losses
              this_tournament.record = $('td:last', item).text().trim();
              matches.wins(matches.wins() + wins);
              matches.losses(matches.losses() + losses);

              // Keep track of tournament ratios
              tournaments.sessions.push(this_tournament);
              tournaments.played(tournaments.played() + 1);
              if(wins > losses) {
                  tournaments.wins(tournaments.wins() + 1);
              }
              else if(losses > wins) {
                  tournaments.losses(tournaments.losses() + 1);
              }

              if(i>0) {
                  // For each tournament, get the game data
                  $.get('fetch/tournament?' + this_tournament.link, function(html) {

                      //console.log('Processing Tournament: ' + this_tournament.name + ' ' + this_tournament.url);
                      $('#loading-area').html('').append(html.replace('<link', '<meta'));
                      var parsing_wins = true;

                      /*******************************
                       * Match Processing
                       *
                       * Parse each of the rows of
                       * the tournament results
                       *******************************/
                      $('#loading-area > table tbody').children().slice(2, -1).each(function(i, match) {

                          //console.log('*** New Match ***')
                          if(parsing_wins && $(match).text().trim() == "Losses") {
                            //  console.log('>>> Parsing Losses <<<')
                              parsing_wins = false;
                          }
                          else {
                              // Gather the match info
                              var match_info = [];
                              $('td', match).each(function() {
                                  match_info.push($(this).text().trim());
                              })

                              // Extract the useful data
                              var match_title   = match_info[0],
                                  opponent_name = match_info[2],
                                  this_record   = match_info[4];

                              if(match_title && opponent_name) {

                                  //console.log('Title: ' + match_title + ' vs. ' + opponent_name + ' // Record: ' + this_record);
                                  var games = this_record.split(',').map($.trim);
                                  var stat             = new Record(this_tournament.date, opponent_name, this_tournament.link);
                                  stat.tournament      = this_tournament.name;
                                  stat.result          = (parsing_wins) ? 'Won' : 'Lost';

                                  /**** Playoff matches *****/
                                  if(match_title.search(/rr/i) < 0 &&
                                    (match_title.search(/final/i) >= 0 ||
                                     match_title.search(/quarter/i) >= 0 ||
                                     match_title.search(/semi/i) >= 0)) {

                                      //console.log('Match title: ' + match_title);
                                      //console.log('Link: ' + this_tournament.link);
                                      //var stat        = new Record(this_tournament.date, match_title, this_tournament.link);
                                      stat.name = match_title;
                                      self.playoffs.sessions.push(stat);

                                      if(parsing_wins) {
                                          self.playoffs.wins(self.playoffs.wins() + 1);
                                      }
                                      else {
                                          self.playoffs.losses(self.playoffs.losses() + 1);
                                      }
                                  }

                                  /***** Nail biters (5th game and close) *****/
                                  if((games.length == 5 || games.length == 7) && games.length && Math.abs(games[games.length-1]) >= 8) {

                                    //console.log('Match vs %s went to %d in %d games', opponent_name, Math.abs(games[games.length-1]), games.length)
                                    stat.name = opponent_name;
                                    self.nail_biters.sessions.push(stat);
                                    if(parsing_wins) {
                                      self.nail_biters.wins(self.nail_biters.wins() + 1);
                                    }
                                    else {
                                      self.nail_biters.losses(self.nail_biters.losses() + 1);
                                    }
                                  }

                                  /*************************
                                   * Game Processing
                                   *
                                   * Proper matches are always
                                   * 3 games or more
                                   *************************/
                                  if(games.length >= 3) {

                                      var wins = 0, losses = 0, series = '', last_game = 0;
                                      games.forEach(function(game) {
                                          last_game = game;

                                          // When there's a - sign
                                          if(game.indexOf('-') >= 0) {

                                              // When parsing the "Wins" table, a minus sign means a loss.
                                              if(parsing_wins) {
                                                  losses++;
                                                  series += 'L';
                                                  self.games.losses(self.games.losses() + 1);
                                                  if(game <= -10) {
                                                      self.deuces.losses(self.deuces.losses() + 1);
                                                  }
                                              }
                                              // When parsing the "Losses" table, a minus sign means a win.
                                              else {
                                                  wins++;
                                                  series += 'W';
                                                  self.games.wins(self.games.wins() + 1);
                                                  if(game <= -10) {
                                                      self.deuces.wins(self.deuces.wins() + 1);
                                                  }
                                              }
                                          }
                                          else {
                                              // When there is no - sign
                                              if(parsing_wins) {
                                                  wins++;
                                                  series += 'W';
                                                  self.games.wins(self.games.wins() + 1);
                                                  if(game >= 10) {
                                                      self.deuces.wins(self.deuces.wins() + 1);
                                                  }
                                              }
                                              else {
                                                  // When parsing the "Wins" table, a minus sign means losses
                                                  losses++;
                                                  series += 'L';
                                                  self.games.losses(self.games.losses() + 1);
                                                  if(game >= 10) {
                                                      self.deuces.losses(self.deuces.losses() + 1);

                                                      var this_deuce = new Record(this_tournament.date, opponent_name, this_tournament.link);
                                                      this_deuce.tournament = this_tournament.name;
                                                      self.deuces.sessions.push(this_deuce);
                                                  }
                                              }
                                          }
                                      });

                                      // Sweeps & Blowouts
                                      if(wins >= 3 && losses == 0) {
                                          self.sweeps.wins(self.sweeps.wins() + 1);
                                          self.sweeps.sessions.push(stat);
                                      }
                                      else if(losses > 0 && wins == 0) {
                                          self.blowouts.wins(self.blowouts.wins() + 1);
                                          self.blowouts.sessions.push(stat);
                                      }

                                      // Comebacks
                                      if(series == 'LLWWW' || series == 'LLLWWWW') {
                                          self.comebacks.wins(self.comebacks.wins() + 1);
                                          self.comebacks.sessions.push(stat);
                                      }

                                      // Chokes
                                      // Dominations

                                  }
                                  else {
                                      console.log(match_title + 'has no game records!');
                                  }
                              }
                          }
                      });

                  })
              }
          })
       })
    }

    // DEBUG
    //self.selectPlayer(sample_player);

    self.startOver = function(player) {
        self.resetStats();
        self.player1(false);
        self.player2(false);
    }
}

// Get the name data out of the HTML
function extractNameData(html) {

    var players = [];
    // Take the rows with players...
    $('#loading-area').html(html.replace('<link', '<meta'));
    console.log('How many?: ' + $('#loading-area tbody tr:gt(1)').length)
    $('#loading-area tbody tr:gt(1)').each(function() {

        // Take the rows with name, rating and state
        var player_data = $('td', $(this)).slice(2,5).toArray(),
            pid = $('a', player_data[0]).attr('href').split('=').pop();

        players.push(new Player(player_data[0].innerText,
                                player_data[1].innerText,
                                player_data[2].innerText,
                                pid ));
    })

    return players;
}

function setCookie(c_name, value, exdays) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
    document.cookie = c_name + "=" + c_value;
}

function getCookie(c_name) {
    var i, x, y, ARRcookies = document.cookie.split(";");
    for (i = 0; i < ARRcookies.length; i++) {
        x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
        y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
        x = x.replace(/^\s+|\s+$/g, "");
        if (x == c_name) {
            return unescape(y);
        }
    }
}

$(document).ready(function() {
    ko.applyBindings(new StatsViewModel());
});
