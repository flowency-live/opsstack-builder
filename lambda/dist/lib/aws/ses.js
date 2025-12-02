"use strict";
/**
 * SES Client Configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sesClient = void 0;
const client_ses_1 = require("@aws-sdk/client-ses");
const config_1 = require("./config");
// Create SES client
exports.sesClient = new client_ses_1.SESClient(config_1.sesConfig);
//# sourceMappingURL=ses.js.map