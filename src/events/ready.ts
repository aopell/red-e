import { updateMessages } from "../update-messages";
import type { RedEClient } from "../typedefs";
import { deployGlobalCommands, deleteAllGlobalCommands, deleteAllGuildCommands, deployGuildCommands } from "../deploy-commands";

export default {
    name: "ready",
    once: true,
    async execute(client: RedEClient) {
        console.log(`Ready! Logged in as ${client.user?.tag}`);

        // await deleteAllGuildCommands(client, "136711405356318721");
        // await deployGuildCommands(client, "136711405356318721");

        await deployGlobalCommands(client);

        updateMessages(client);
        setInterval(() => updateMessages(client), 60000);
    },
};