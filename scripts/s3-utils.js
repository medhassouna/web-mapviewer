// Load the AWS SDK for Node.js
const AWS = require('aws-sdk')

// Loading filesystem API
const fs = require('fs')

// Loading utility to detect mime types (and set the Content-type header accordingly)
const mime = require('mime-types')

// loading gzipper
const { gzipSync } = require('zlib')

/**
 * Load an AWS-SDK S3 instance for the given region, switch role if roleArn is defined
 *
 * @param region The AWS region on which to connect to
 * @param roleArn A full ARN to a role that will be used to `aws sts assume-role` for this session
 * @returns {Promise<S3>}
 */
async function getS3(region, roleArn) {
    console.log('loading s3 service for region', region)
    const s3Options = { apiVersion: '2006-03-01' }

    // if a switch role is needed, we generate the session token before returning the S3 instance
    if (roleArn) {
        console.log('switching to role', roleArn)
        const sts = new AWS.STS({ region })
        const switchRoleParams = {
            RoleArn: roleArn,
            RoleSessionName: 'SwitchRoleSession',
        }
        const assumeRole = await sts.assumeRole(switchRoleParams).promise()

        s3Options.accessKeyId = assumeRole.Credentials.AccessKeyId
        s3Options.secretAccessKey = assumeRole.Credentials.SecretAccessKey
        s3Options.sessionToken = assumeRole.Credentials.SessionToken
    }
    console.log('loading done for s3 service')
    return new AWS.S3(s3Options)
}

/**
 * Uploads a file to a S3 bucket using the S3 instance given in param
 *
 * @param s3 An instance of AWS.S3
 * @param filePath A local file path to be uploaded on S3
 * @param bucket The bucket name (must be accessible and writable through the current AWS profile/role)
 * @param bucketFilePath Where the file should be uploaded on the S3 bucket (relative to the root of
 *   the bucket)
 * @param callback A callback that will be called if successful
 */
function uploadFileToS3(s3, filePath, bucket, bucketFilePath, callback) {
    const data = fs.readFileSync(filePath)
    const params = {
        Bucket: bucket,
        Key: bucketFilePath,
        Body: gzipSync(data),
        ACL: 'public-read',
        // mime.lookup will return false if it can't detect content type
        ContentType: mime.lookup(filePath) || 'application/octet-stream',
        ContentEncoding: 'gzip',
    }
    s3.upload(params, function (s3Err, data) {
        if (s3Err) {
            console.error(`Error while uploading file ${bucketFilePath} to bucket ${bucket}`, s3Err)
            process.exit(-1)
        }
        console.log(`File uploaded successfully at ${data.Location}`)
        callback && callback()
    })
}

module.exports = {
    getS3,
    uploadFileToS3,
}
