'use strict';

var FeedParser = require('feedparser'),
    axios = require('axios'),
    rest = require('../others/restware');

exports.getFeeds = function(req,res){
    var link = decodeURIComponent(req.query['link']),
        feedlimit = req.query['feedlimit'] || 100;

    if (!link)
        return rest.sendError(res, '****  Please provide a link to fetch RSS as query parameter link=\<link\>');

    if (link.indexOf("://") == -1) {
        link = 'http://' + link;
    }

    var reqt = axios({
            method: 'get',
            url: link,
            responseType: 'stream'
        }),
        feedparser = new FeedParser({"feedUrl": link}),
        index = 0,
        news = [];

    res.replySent = false;

    reqt
        .then(function (response) {
            var stream = response.data;

            stream.setEncoding('utf8');

            if (response.status !== 200) {
                stream.emit('error', new Error('Bad status code, can\'t fetch feeds from given URL'));
            }
            else {
                // The response `body` -- res.body -- is a stream
                stream.pipe(feedparser);
            }
        })
        .catch(function (error) {
            // handle error
            if (!res.replySent) {
                res.replySent = true;
                return rest.sendError(res, '****  request error, please check RSS feed URL', error);
            }
        })
        .then(function () {
            // always executed
        });
    
    // reqt.on('error', function (error) {
    //     if (!res.replySent) {
    //         res.replySent = true;
    //         return rest.sendError(res, '****  request error, please check RSS feed URL', error);
    //     }
    // });
    
    // reqt.on('response', function (resp) {
    //     var stream = this;
    //
    //     resp.setEncoding('utf8');
    //
    //     if (resp.statusCode != 200)
    //         return this.emit('error', new Error('Bad status code, can\'t fetch feeds from given URL'));
    //
    //     stream.pipe(feedparser);
    // });
    
    feedparser.on('error', function(error) {
        if (!res.replySent) {
            res.replySent = true;
            return rest.sendError(res, '****  feedparser error, please check RSS feed URL', error);
        }
    });
        
    feedparser.on('readable', function() {
        var stream = this,
            meta = this.meta,
            item;
    
        while (item = stream.read()) {
            if (item.title)
                item.title = item.title.replace(/'/g, "`")
            if (item.description)
                item.description = item.description.replace(/'/g, "`")
            if(news.length < feedlimit)
                news.push(item);
            else
                break;
        }
    });
    feedparser.on('end',function(){
        if (!res.replySent) {
            res.replySent = true;
            return rest.sendSuccess(res, 'RSS feeds', news);
        }
    })
}



