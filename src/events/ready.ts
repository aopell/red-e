import { updateMessages } from "../update-messages";
import type { RedEClient } from "../typedefs";
import { deployGlobalCommands } from "../deploy-commands";

export default {
    name: "ready",
    once: true,
    async execute(client: RedEClient) {
        console.log(`Ready! Logged in as ${client.user?.tag}`);

        await deployGlobalCommands(client);

        updateMessages(client);
        setInterval(() => updateMessages(client), 60000);
    },
};