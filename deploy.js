module.exports = {
    apps : [{
      name: "quiz",
      script: "node /var/repo/code_puzzle/api/build/index.js",
    }, {
        name: "quiz_build",
        script: "node /var/repo/code_puzzle/scripts/build.js",
        autorestart: false,
        watch: false,
        instances: 1,
        cron_restart: '*/10 * * * *',
        env: {
            BOT_TOCKEN: "TOKEN",
            NOTIFY_CHAT: "CHAT",
        },
      },
      {
        name: "jira_report",
        script: "node /var/repo/jira_report/scripts/build.js",
        autorestart: false,
        watch: false,
        instances: 1,
        cron_restart: '0 0 * * *',
        env: {
            BOT_TOCKEN: "TOKEN",
            NOTIFY_CHAT: "CHAT",
            LOGIN: "LOGIN",
            PASSWORD: "PASSWORD",
        },
      }]
  }

  