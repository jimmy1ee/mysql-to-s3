const AWS = require('aws-sdk');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();


// Check environment variables
const host = process.env.DBHOST;
const port = process.env.DBPORT || 3306;
const user = process.env.DBUSER;
const password = process.env.DBPWD;
const database = process.env.DB;
const accessKeyId = process.env.AKID;
const secretAccessKey = process.env.AKSECRET;
const region = process.env.REGION;
const Bucket = process.env.BUCKET;
console.log(host, port, user, password, database, accessKeyId, secretAccessKey, region, Bucket)
if (!host || !user || !password || !database || !accessKeyId || !secretAccessKey || !region || !Bucket)
    throw new Error('Insufficient environment variables.');


// MySQL database credentials
const dbOptions = { host, user, password, database, port };

// AWS S3 configuration
const s3 = new AWS.S3({ accessKeyId, secretAccessKey, region });

// Function to backup data
function backupData() {
    // Define the backup file name
    const backupFile = path.join(__dirname, `${dbOptions.database}-${new Date().toISOString()}.sql`);

    // Create the dump command
    const cmd = `mysqldump -h${dbOptions.host} -P${dbOptions.port} -u${dbOptions.user} -p${dbOptions.password} ${dbOptions.database} > ${backupFile}`;

    // Execute the command
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error during backup: ${error}`);
        } else {
            console.log(`Backup saved as ${backupFile}`);
            uploadToS3(backupFile);
        }
    });
}

// Function to upload data to S3
function uploadToS3(file) {
    fs.readFile(file, (err, data) => {
        if (err) throw err;
        const params = {
            Bucket,
            Key: path.basename(file),
            Body: data
        };
        s3.upload(params, function (s3Err, data) {
            if (s3Err) throw s3Err;
            console.log(`File uploaded successfully at ${data.Location}`);
            // Delete the file after upload
            fs.unlink(file, function (err) {
                if (err) console.error(err);
                console.log('File deleted!');
            });
        });
    });
}

// Backup data every 24 hours
// setInterval(backupData, 24 * 60 * 60 * 1000);

backupData()