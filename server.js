var connect = require('connect');
var request = require('request');
var fs = require('fs');

var express = require('express');
var app = express();

app.engine('ejs', require('ejs').__express);

app.get('/', function(req, res){
    res.end(fs.readFileSync('index.html'));
});

app.get('/js/:file', function(req, res){
    console.log('Loading: ' + req.params.file)
    res.end(fs.readFileSync('public/javascripts/' + req.params.file));
});

app.get('/fetch/names', function(req, res) {

    if(req.query && req.query.lastName) {
        fs.exists('names-' + req.query.lastName + '.html', function(exists) {
            if(exists) {
                console.log('>>> Names CACHE HIT');
                fs.readFile('names-' + req.query.lastName + '.html', function(err, html) {
                    res.end(html);
                })
            }
            else {
                console.log('<<< Names CACHE MISS');
                console.log('** Fetching names for ' + req.query.lastName)
                request('http://216.119.100.169/history/rating/History/Allplayers.asp?Alpha=' + req.query.lastName, function(err, data) {
                    res.end(data.body);
                    fs.writeFile('names-' + req.query.lastName + '.html', data.body, function(err) {
                        console.log('Done caching names for: ' + req.query.id)
                    })
                })
            }

        })
    }
});

app.get('/fetch/tournaments', function(req, res){

    if(req.query && parseInt(req.query.id) > 0) {
        var cache_file_name = 'tournaments-' + req.query.id + '.html';

        console.log('** Fetching tournaments for ' + req.query.id)
        var forced_refresh = (req.query.refresh) ? true : false;
        fs.exists(cache_file_name, function(exists) {
          if(exists && !forced_refresh) {
              console.log('>>> Tournaments CACHE HIT');
              fs.readFile(cache_file_name, function(err, html) {
                  console.log('Done writing stats for: ' + req.query.id)
                  res.end(html);
              })
          }
          else {
              console.log('>>> Tournaments CACHE MISS');
              request('http://216.119.100.169/history/rating/History/Phistory.asp?Pid=' + req.query.id, function(err, data) {
                  res.end(data.body);
                  fs.writeFile(cache_file_name, data.body, function(err) {
                      console.log('Done writing stats for: ' + req.query.id)
                      res.end(data.body);
                  })
              })
          }
        });
    }
});

app.get('/fetch/tournament', function(req, res){

    console.log('Fetching tournament for ' + req.query.Pid)
    if(req.query.Pid && req.query.Tid) {

        var cache_file_name = 'tournament-' + req.query.Tid + '-' + req.query.Pid + '.html';

        console.log('** Fetching tournament ' + req.query.Tid)
        var forced_refresh = (req.query.refresh) ? true : false;
        fs.exists(cache_file_name, function(exists) {
          if(exists && !forced_refresh) {
              console.log('>>> Tournament CACHE HIT');
              fs.readFile(cache_file_name, function(err, html) {
                  res.end(html);
              })
          }
          else {
              console.log('>>> Tournament CACHE MISS');
              request('http://216.119.100.169/history/rating/History/TResult.asp?Pid=' + req.query.Pid + '&Tid=' + req.query.Tid, function(err, data) {
                  console.log('Fetched tournament data (' + req.query.Tid + ') for ' + req.query.Pid);
                  res.end(data.body);
                  fs.writeFile(cache_file_name, data.body, function(err) {
                      res.end(data.body);
                  })
              })
          }
        });
    }
});

var server = app.listen(8080, function() {
    console.log('Listening on port %d', server.address().port);
});
