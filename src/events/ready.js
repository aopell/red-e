const { updateMessages } = require("../update-messages");

module.exports = {
    name: "ready",
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        updateMessages(client);
        setInterval(() => updateMessages(client), 60000);
    },
};