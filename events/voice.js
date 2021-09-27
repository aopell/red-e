module.exports = {
    name: "voiceStateUpdate",
    once: false,
    async execute(client, oldState, newState) {
        console.log("Voice state changed");
        console.log(JSON.stringify(oldState));
        console.log(JSON.stringify(newState));
    },
};