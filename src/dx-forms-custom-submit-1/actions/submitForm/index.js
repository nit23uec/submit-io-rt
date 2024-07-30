/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const { Core } = require("@adobe/aio-sdk")
const Busboy = require('busboy');


// Function to parse multipart form data
async function parseMultipartFormData(headers, requestBody) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: headers });
    const result = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      let fileData = [];
      file.on('data', (data) => {
        fileData.push(data);
      });
      file.on('end', () => {
        result[fieldname] = {
          filename: filename,
          encoding: encoding,
          mimetype: mimetype,
          data: Buffer.concat(fileData).toString('base64') // or any other encoding you need
        };
      });
    });

    busboy.on('field', (fieldname, val) => {
      result[fieldname] = val;
    });

    busboy.on('finish', () => {
      resolve({ result });
    });
    // Write the request body to busboy
    busboy.end(requestBody);
  });
}

async function main (params) {
  const logger = Core.Logger("main", { level: params.LOG_LEVEL || "info" })

  try {
    logger.info("Calling the main action - submit form")

    if(params['__ow_headers']['content-type'].includes('multipart')) {
      const formData64 = Buffer.from(params['__ow_body'], 'base64')
      var formDataDecoded = formData64.toString('utf-8');
      logger.info(formDataDecoded);
      const { result } = await parseMultipartFormData(params['__ow_headers'], formDataDecoded);
  
      const data = JSON.parse(result['jcr:data']);
      logger.info('data', JSON.stringify(data));
      const response = {
        statusCode: 200,
        body: JSON.stringify(data)
      }
      return response
    }

    const response = {
      statusCode: 400,
      body: "Bad Request - Expected a multi-part request"
    }
    return response

  } catch (error) {
    // log any server errors
    logger.error(error)
    return {
      error: {
        statusCode: 500,
        body: {
          error:  `server error ${error}`
        }
      }
    }
  }
}

exports.main = main
