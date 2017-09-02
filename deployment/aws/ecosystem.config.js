module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name      : 'Captionify.com',
      script    : 'index.js',
      cwd: "src/server",
      "log_date_format"  : "YYYY-MM-DD HH:mm Z",
      "error_file" : "/var/log/captionify_error.log",
      "out_file"   : "/var/log/captionify_out.log",
      "pid_file"   : "/var/log/captionify.pid",
      env: {
        COMMON_VARIABLE: 'true'
      },
      env_production : {
        NODE_ENV: 'production'
      },
      "exec_mode": "fork",
  	  "instances": 1
    }

       /*,

    // Second application
 
    {
      name      : 'WEB',
      script    : 'web.js'
    }
    */
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */

  /*
  	Structure of target server folder:

  	path: /var/www/production or /var/www/staging
  	root: path/current (root of source code / git repo)

  	all commands are w.r.t. root folder

  	root == /var/www/production/current

  	structure:
  	/var/www/production/
  						current -> source
  						data -> mounted in case of production, and actual in case of staging
  							contentImages -> content images
  								challenges
  								entries
  								users
  						public -> folder containing links to public folders
  							css -> link to root/src/client/web/public/css
  							js -> link to root/src/client/web/public/js
  							images -> link to root/src/client/web/public/images
  							contentImages -> link to root/../data/contentImages

  */

  /*
  	Note: ASSUMPTIONS BEFORE RUNNING THIS DEPLOY SCRIPT

  	ASSUMPTIONS FOR BOTH PRODUCTION & STAGING ENVIRONMENTS:
  	- The server has all necessary software installed, and is running
  	- The server's public domain name should match the 'host' value below
  	- You have already configured the Github private key in the server as per the steps in "generalDeploymentSteps.txt"

  	ASSUMPTIONS FOR PRODUCTION SERVER:
  	- The server has allowed access to your dev machine by adding the public key to the ~/.ssh/authorized_keys file
  		(refer the "generalDeploymentSteps.txt" for more information)
  	- The folder /var/www/production is already created and set up with access to the 'node' user
  	- The folder /var/www/production/data is mounted from the EBS Volume that has the above assumed folder structure

  	ASSUMPTIONS FOR STAGING SERVER:
  	- The server has allowed access to CircleCI by adding the public key to the ~/.ssh/authorized_keys file
  		(refer the "generalDeploymentSteps.txt" for more information)
  	- The folder /var/www/staging is already created and set up with access to the 'node' user

  	NOTE: post-setup is only called when pm2 deploy .. setup is called, not for every deploy
  		post-deploy is called at every deploy
  */
  deploy : {
    production : {
      user : 'node',
      host : 'ec2-18-220-213-3.us-east-2.compute.amazonaws.com',
      ref  : 'origin/master',
      repo : 'git@github.com:ezeeideas/delphinus.git',
      path : '/var/www/production',

      "post-setup": "mkdir ../data/log; mkdir ../data/contentImages; mkdir ../data/contentImages/challenges; mkdir ../data/contentImages/entries; mkdir ../data/contentImages/users; mkdir ../data/db; mkdir ../public; ln -s ../data/contentImages ../public/contentImages; ln -s ../current/src/client/web/public/css ../public/css; ln -s ../current/src/client/web/public/js ../public/js; ln -s ../current/src/client/web/public/images ../public/images; ln -s ../current/src/client/web/public/third-party ../public/third-party;",
      'post-deploy' : 'npm install --prefix ./src/server && pm2 startOrRestart ./deployment/aws/ecosystem.config.js --env production'
    },

    staging : {
      user : 'node',
      host : 'ec2-18-221-25-182.us-east-2.compute.amazonaws.com',
      ref  : 'origin/master',
      repo : 'git@github.com:ezeeideas/delphinus.git',
      path : '/var/www/staging',

      "post-setup": "mkdir ../data; mkdir ../data/log; mkdir ../data/contentImages; mkdir ../data/contentImages/challenges; mkdir ../data/contentImages/entries; mkdir ../data/contentImages/users; mkdir ../data/db; mkdir ../public; ln -s ../data/contentImages ../public/contentImages; ln -s ../current/src/client/web/public/css ../public/css; ln -s ../current/src/client/web/public/js ../public/js; ln -s ../current/src/client/web/public/images ../public/images; ln -s ../current/src/client/web/public/third-party ../public/third-party;",
      'post-deploy' : 'npm install --prefix ./src/server&& pm2 startOrRestart ./deployment/aws/ecosystem.config.js --env staging',
      env  : {
        NODE_ENV: 'dev'
      }
    }
  }
};
