
require("dotenv").config();

const {
    REST,
    Routes
} = require("discord.js");

const commands = require("./src/commands/commands");

const rest = new REST({
    version: "10"
}).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {

    try {

        console.log("Memulai registrasi Slash Commands...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            {
                body: commands.map(command =>
                    command.data.toJSON()
                )
            }
        );

        console.log("================================");
        console.log("Slash Commands berhasil didaftarkan!");
        console.log(`Total Command: ${commands.length}`);
        console.log("================================");

    } catch (error) {

        console.error("Gagal deploy commands:", error);

        process.exitCode = 1;
    }
}

deployCommands();
