var config = require("./config")
    ,_ = require("underscore")
    ,cloudmine = require("cloudmine")
    ,mandrill = require("node-mandrill")(config.mandrill.apikey)
    ,express = require("express")
    ,app = new express();
(function(_, cloudmine, mandrill, app, config) {
    
    var ws = new cloudmine.WebService({
        appid: config.cloudmine.appid
        ,apikey: config.cloudmine.apikey
    });
    
    /**
     * Subscribe
     * @param {string} email
     * @param {string} coords
     */
    app.get("/subscribe/:email/:coords", function(req, res) {
        // TODO: Validation
        ws.set(null, {email: req.params.email, coords: req.params.coords, date_registered: new Date(), confirmed: false})
        .on("success", function(data, response) {
            
            // Send subscription confirmation email
            mandrill("/messages/send", {
                message: {
                    to: [{email: req.params.email}]
                    ,from_email: "subscriptions@phlcrimemapper.com"
                    ,from_name: "PHL Crime Mapper"
                    ,subject: "[PHL Crime Mapper] Please confirm your subscription"
                    ,text: "Please confirm your subscription to PHL Crime Mapper notifications\nhttp://crime-alerts.timwis.c9.io/confirm/" + req.params.email + "/" + _.keys(data)[0]
                }
            }, function(error, response) {
                // TODO: If error, delete from cloudmine?
                if(error) return res.json(500, {error: "Error sending confirmation email"});
                
                // All systems go
                res.json({success: true});
            });
        })
        .on("error", function(data, response) {
            res.json(500, {error: "Error adding new subscription to database"});
        });
    });
    
    /**
     * Confirm subscription
     */
    app.get("/confirm/:email/:key", function(req, res) {
        ws.get(req.params.key)
        .on("success", function(data, response) {
            // If email matches record, update record to set confirmed=true
            if(data[req.params.key] !== undefined && data[req.params.key].email === req.params.email) {
                ws.update(req.params.key, {confirmed: true})
                .on("success", function(data, response) {
                    // Send FYI email with unsubscribe link
                    mandrill("/messages/send", {
                        message: {
                            to: [{email: req.params.email}]
                            ,from_email: "subscriptions@phlcrimemapper.com"
                            ,from_name: "PHL Crime Mapper"
                            ,subject: "[PHL Crime Mapper] Subscription Confirmed"
                            ,text: "You have confirmed your subscription to PHL Crime Mapper notifications\nTo unsubscribe, click http://crime-alerts.timwis.c9.io/unsubscribe/" + req.params.email + "/" + req.params.key
                        }
                    }, function(error, response) {
                        if(error) {console.error(error); return res.json(500, {error: "Error sending confirmation email"})};
                        
                        // All systems go
                        res.json({success: true});
                    });
                })
                .on("error", function(data, response) {
                    res.json(500, {error: "Error updating database"});
                });
            } else {
                res.json(500, {error: "Invalid email/key combination"});
            }
        })
        .on("error", function(data, response) {
            res.json(500, {error: "Invalid key"});
        });
    });
    
    /**
     * Unsubscribe
     */
    app.get("/unsubscribe/:email/:key", function(req, res) {
        ws.get(req.params.key)
        .on("success", function(data, response) {
            // If email matches record, delete record
            if(data[req.params.key] !== undefined && data[req.params.key].email === req.params.email) {
                ws.destroy(req.params.key)
                .on("success", function(data, response) {
                    // Send FYI email
                    mandrill("/messages/send", {
                        message: {
                            to: [{email: req.params.email}]
                            ,from_email: "subscriptions@phlcrimemapper.com"
                            ,from_name: "PHL Crime Mapper"
                            ,subject: "[PHL Crime Mapper] Unsubscribed"
                            ,text: "You have unsubscribed to PHL Crime Mapper notifications"
                        }
                    }, function(error, response) {
                        if(error) return res.json(500, {error: "Error sending confirmation email"});
                        
                        // All systems go
                        res.json({success: true});
                    });
                })
                .on("error", function(data, response) {
                    res.json(500, {error: "Error removing record from database"});
                });
            } else {
                res.json(500, {error: "Invalid email/key combination"});
            }
        })
        .on("error", function(data, response) {
            res.json(500, {error: "Invalid key"});
        });
    });
    
    /**
     * Main initialization
     */
    app.listen(process.env.PORT || 4730, function() { console.log("Server Running..."); });
    
})(_, cloudmine, mandrill, app, config);