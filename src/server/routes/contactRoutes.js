var express = require("express");
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var config = require("../config");

var routes = function() {
	var contactRouter = express.Router();

	contactRouter.route("/")
		.post(function(req, res) {
			logger.debug("POST received on /api/contact, body: " + JSON.stringify(req.body));

			var validationParams = [
				{
					name: "name",
					required: "yes",
					type: "string"
				},
				{
					name: "email",
					type: "email",
					required: "yes"
				},
				{
					name: "subject",
					required: "yes",
					type: "string"
				},
				{
					name: "message",
					type: "string",
					required: "yes"
				}
			];

			if (!serverUtils.validateQueryParams(req.body, validationParams)) {
				return res.sendStatus(400);
			}

			//send email - refer https://nodemailer.com/transports/sendmail/
			var nodemailer = require('nodemailer');

			var transporter = nodemailer.createTransport({
			  sendmail: true,
			  newline: "unix",
			  path: "sendmail"
			});

			var mailOptions = {
			  from: "\"" + req.body.name + "\" " + req.body.email,
			  to: config.contact.email,
			  subject: req.body.subject,
			  text: req.body.message
			};

			transporter.sendMail(mailOptions, function(error, info){
				if (error) {
			  		logger.error("Failed to sent email - " + error + ", mailOptions: " + JSON.stringify(mailOptions));
				} else {
			    	logger.info("Email sent successfully!");
				}
			});

			return res.status(201).json({});
		})

	return contactRouter;
};

module.exports = routes;