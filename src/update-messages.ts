import type { RedEClient } from "./typedefs";
import { TimeUnit } from "./util";

/**
 * Updates the message
 * @param client The bot client
 */
export async function updateMessages(client: RedEClient) {
    for (const emessage of client.state.getAllEMessages()) {
        emessage.updateAllMessages(client);
        emessage.pingLateUsers(client);

        if (emessage.creationTimestamp < Date.now() - ((client.config.expirationHours ?? 12) * TimeUnit.HOURS)) {
            client.state.setEMessage(emessage.guildId, emessage.channelId, undefined);
        }
    }
}