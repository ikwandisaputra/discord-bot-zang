
require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Events
} = require("discord.js");

// Memuat database
require("./database/db");

// Memuat event
const interactionCreate = require("./events/interactionCreate");

// ======================================
// VALIDASI ENV
// ======================================

const requiredEnv = [
    "DISCORD_TOKEN",
    "CLIENT_ID",
    "GUILD_ID",
    "ADMIN_ROLE_ID"
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`${key} belum diisi di .env`);
    }
}

// ======================================
// DISCORD CLIENT
// ======================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Menghubungkan client dengan catalog.js
global.discordClient = client;

// ======================================
// BOT READY
// ======================================

client.once(Events.ClientReady, readyClient => {

    console.log("================================");
    console.log(`Bot      : ${readyClient.user.tag}`);
    console.log(`Bot ID   : ${readyClient.user.id}`);
    console.log("Status   : ONLINE");
    console.log("================================");

});

// ======================================
// INTERACTION EVENT
// ======================================

client.on(
    interactionCreate.name,
    interactionCreate.execute
);

// ======================================
// LOGIN
// ======================================

client.login(process.env.DISCORD_TOKEN)
    .catch(error => {
        console.error("Gagal login:", error);
        process.exit(1);
    });

// ======================================
// SHUTDOWN
// ======================================

process.on("SIGINT", () => {
    console.log("Bot dihentikan...");
    client.destroy();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("Bot dihentikan...");
    client.destroy();
    process.exit(0);
});
