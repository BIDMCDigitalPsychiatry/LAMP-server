/**
 * CouchDB Proxy Express middleware
 *
 * @author Amir Malik
 */

var express = require('express'),
      https = require('https'),
       http = require('http'),
    mod_url = require('url');

var utils = require('./utils');

module.exports = function(options, cb) {
  var app = express();
  
  // parse credentials from Authorization header into req.remote_*
  app.use(function(req, res, next) {
    var creds = utils.authorization(req.headers['authorization']);
    
    if(!creds)
      return utils.unauthorized(res, options.realm);
    
    req.remote_user = creds[0];
    req.remote_pass = creds[1];
    
    next();
  });
  
  // CouchDB replication base endpoint
  app.all('/:db/*', function(req, res) {
    req.pause();
    
    cb(req.params.db, req.remote_user, req.remote_pass, function(err, url) {
      if(err) {
        res.statusCode = 401;
        return res.end('unauthorized');
      }
      
      var remoteHeaders = {};
      for(var header in req.headers) {
        if(req.headers.hasOwnProperty(header)) {
          remoteHeaders[header] = req.headers[header];
        }
      }
      
      delete remoteHeaders['authorization'];
      delete remoteHeaders['host'];
      
      var remoteURL = mod_url.parse(url);
      remoteURL.path += req.url.slice(req.params.db.length + 1);
      
      console.log("[CouchProxy] %s", req.url, req.headers);
      
      var request = 'https:' == remoteURL.protocol ? https.request : http.request;
      
      var PREFIX = '[' + req.url + '] ';
      console.log('---------------------------------');
      
      var remoteReq = request({
        method: req.method,
        hostname: remoteURL.hostname,
        port: remoteURL.port || ('https:' == remoteURL.protocol ? 443 : 80),
        path: remoteURL.path,
        headers: remoteHeaders,
        auth: remoteURL.auth,
      }, function(remoteRes) {
        delete remoteRes.headers['transfer-encoding'];
        
        remoteRes.headers['content-type'] = remoteRes.headers['content-type'].replace(/"/g, '').replace(/\s+/g, '');
        remoteRes.headers['Content-Type'] = remoteRes.headers['content-type'];
        delete remoteRes.headers['content-type'];
        
        console.log(PREFIX + 'PROXY RESPONSE', remoteRes.statusCode, remoteRes.headers);
        
        res.writeHead(remoteRes.statusCode, remoteRes.headers);
        remoteRes.pipe(res);
        
        /*
        var recvData = '';
        
        remoteRes.on('data', function(chunk) {
          recvData += chunk.toString();
          
          res.write(chunk);
        });
        
        remoteRes.on('end', function() {
          console.log(PREFIX + ' PROXY RESPONSE', recvData);
          
          res.end();
        });
        */
      });
      
      remoteReq.on('error', function(err) {
        res.statusCode = 500;
        return res.end('error connecting to upstream server: ' + err.syscall +  ' ' + err.errno);
      });
      
      req.setEncoding('utf8');
      req.resume();
      
      req.pipe(remoteReq);
      
      /*
      if(req.headers['content-length'] > 0 || req.headers['content-type'] == 'mixed/multipart') {
        var sentData = '';
        
        req.on('data', function(chunk) {
          sentData += chunk.toString();
          
          remoteReq.write(chunk);
        });
        
        req.on('end', function() {
          remoteReq.end();
          
          console.log(PREFIX + 'RAW:', utils.rawRequest(remoteURL.path, remoteHeaders, remoteReq, sentData));
        });
      } else {
        remoteReq.end();
      }
      */
    });
  });
  
  return app;
};
