module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name      : 'Captionify.com',
      script    : 'src/server/index.js',
      env: {
        COMMON_VARIABLE: 'true'
      },
      env_production : {
        NODE_ENV: 'production'
      }
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
      host : 'ec2-13-58-138-53.us-east-2.compute.amazonaws.com',
      ref  : 'origin/master',
      //repo : 'https://github.com/ezeeideas/delphinus.git',
      repo : 'git@github.com:ezeeideas/delphinus.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install --prefix ./src/server && pm2 startOrRestart ./deployment/aws/ecosystem.config.js --env production'
    },
    staging : {
      user : 'node',
      host : 'ec2-13-58-138-53.us-east-2.compute.amazonaws.com',
      ref  : 'origin/master',
      repo : 'git@github.com:ezeeideas/delphinus.git',
      path : '/var/www/staging',
      'post-deploy' : 'npm install && pm2 startOrRestart ecosystem.config.js --env staging',
      env  : {
        NODE_ENV: 'dev'
      }
    }
  }
};
