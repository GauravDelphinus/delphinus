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
  deploy : {
    production : {
      user : 'node',
      host : 'ec2-18-220-56-134.us-east-2.compute.amazonaws.com', 
      ref  : 'origin/master',
      //repo : 'https://github.com/ezeeideas/delphinus.git',
      repo : 'git@github.com:ezeeideas/delphinus.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install --prefix ./src/server && pm2 startOrRestart ./deployment/aws/ecosystem.config.js --env production'
    },
    staging : {
      user : 'node',
      host : 'ec2-18-221-25-182.us-east-2.compute.amazonaws.com',
      ref  : 'origin/master',
      repo : 'git@github.com:ezeeideas/delphinus.git',
      path : '/var/www/staging',
      'post-deploy' : 'npm install --prefix ./src/server&& pm2 startOrRestart ./deployment/aws/ecosystem.config.js --env staging',
      env  : {
        NODE_ENV: 'dev'
      }
    }
  }
};
