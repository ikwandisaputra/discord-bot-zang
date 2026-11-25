const { Events, MessageFlags } = require("discord.js");

const commands = require("../commands/commands");
const db = require("../database/db");
const { refreshCatalog } = require("../catalog/catalog");

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {

        // 1. Menangani Submit Modal (/add-custom)
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith("custom_catalog_modal_")) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                try {
                    const gameId = interaction.customId.replace("custom_catalog_modal_", "");
                    const customText = interaction.fields.getTextInputValue("custom_catalog_text");

                    // Jika dikosongkan, simpan NULL agar kembali memakai list /add-joki biasa
                    const valueToSave = customText.trim() === "" ? null : customText;

                    db.prepare(`
                        UPDATE games
                        SET custom_text = ?
                        WHERE id = ?
                    `).run(valueToSave, gameId);

                    await refreshCatalog();

                    return interaction.editReply({
                        content: valueToSave
                            ? "✅ Katalog custom berhasil disimpan dan diperbarui!"
                            : "✅ Teks custom dihapus. Katalog dikembalikan ke daftar paket normal."
                    });
                } catch (error) {
                    console.error("Error pada modal custom_catalog:", error);
                    return interaction.editReply({
                        content: "❌ Gagal menyimpan katalog custom."
                    });
                }
            }
            return;
        }

        // 2. Hanya menangani Slash Command
        if (!interaction.isChatInputCommand()) return;

        // Mencari command berdasarkan nama
        const command = commands.find(
            item => item.data.name === interaction.commandName
        );

        if (!command) return;

        try {

            await command.execute(interaction);

        } catch (error) {

            console.error(
                `Error pada command ${interaction.commandName}:`,
                error
            );

            const response = {
                content: "❌ Terjadi kesalahan ketika menjalankan command.",
                flags: MessageFlags.Ephemeral
            };

            if (interaction.replied || interaction.deferred) {

                await interaction.followUp(response).catch(console.error);

            } else {

                await interaction.reply(response).catch(console.error);
            }
        }
    }
};