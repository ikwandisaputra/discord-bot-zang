const {
    SlashCommandBuilder,
    ChannelType,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/db");
const { setupCatalog, refreshCatalog } = require("../catalog/catalog");

// ==================================================
// ADMIN AUTHENTICATION
// ==================================================

async function requireAdmin(interaction) {
    const roleId = process.env.ADMIN_ROLE_ID;

    if (!interaction.inGuild()) {
        await interaction.reply({
            content: "❌ Command hanya bisa digunakan di server!",
            flags: MessageFlags.Ephemeral
        });
        return false;
    }

    const hasRole = interaction.member?.roles?.cache?.has(roleId);

    if (!hasRole) {
        await interaction.reply({
            content: "❌ Kamu tidak memiliki akses Admin!",
            flags: MessageFlags.Ephemeral
        });
        return false;
    }

    return true;
}

// ==================================================
// HELPER FUNCTIONS
// ==================================================

function rupiah(price) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(price);
}

function validImageUrl(value) {
    if (!value) return true;

    try {
        const url = new URL(value);
        return ["https:", "http:"].includes(url.protocol);
    } catch {
        return false;
    }
}

function getGame(gameId) {
    return db.prepare(
        "SELECT * FROM games WHERE id = ?"
    ).get(gameId);
}

function getService(serviceId) {
    return db.prepare(
        "SELECT * FROM services WHERE id = ?"
    ).get(serviceId);
}

// ==================================================
// 1. SETUP KATALOG
// ==================================================

const setupCatalogCommand = new SlashCommandBuilder()
    .setName("setup-katalog")
    .setDescription("Mengatur channel katalog untuk game tertentu")
    .addIntegerOption(option =>
        option
            .setName("game_id")
            .setDescription("ID game (cek di /list-game)")
            .setMinValue(1)
            .setRequired(true)
    )
    .addChannelOption(option =>
        option
            .setName("channel")
            .setDescription("Pilih channel katalog untuk game ini")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
    );

// ==================================================
// 2. ADD GAME
// ==================================================

const addGameCommand = new SlashCommandBuilder()
    .setName("add-game")
    .setDescription("Menambahkan game Roblox")
    .addStringOption(option =>
        option
            .setName("nama")
            .setDescription("Nama game Roblox")
            .setMaxLength(100)
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName("icon")
            .setDescription("URL gambar icon game")
            .setRequired(false)
    );

// ==================================================
// 3. EDIT GAME
// ==================================================

const editGameCommand = new SlashCommandBuilder()
    .setName("edit-game")
    .setDescription("Mengubah informasi game Roblox")
    .addIntegerOption(option =>
        option
            .setName("id")
            .setDescription("ID game")
            .setMinValue(1)
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName("nama")
            .setDescription("Nama game baru")
            .setMaxLength(100)
            .setRequired(false)
    )
    .addStringOption(option =>
        option
            .setName("icon")
            .setDescription("URL icon baru")
            .setRequired(false)
    );

// ==================================================
// 4. DELETE GAME
// ==================================================

const deleteGameCommand = new SlashCommandBuilder()
    .setName("delete-game")
    .setDescription("Menghapus game Roblox beserta paketnya")
    .addIntegerOption(option =>
        option
            .setName("id")
            .setDescription("ID game yang akan dihapus")
            .setMinValue(1)
            .setRequired(true)
    );

// ==================================================
// 5. LIST GAME
// ==================================================

const listGameCommand = new SlashCommandBuilder()
    .setName("list-game")
    .setDescription("Melihat daftar game dan ID game");

// ==================================================
// 6. ADD JOKI
// ==================================================

const addJokiCommand = new SlashCommandBuilder()
    .setName("add-joki")
    .setDescription("Menambahkan paket joki Roblox")
    .addIntegerOption(option =>
        option
            .setName("game_id")
            .setDescription("ID game tujuan")
            .setMinValue(1)
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName("nama")
            .setDescription("Nama paket joki")
            .setMaxLength(100)
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option
            .setName("harga")
            .setDescription("Harga paket dalam Rupiah")
            .setMinValue(1)
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName("unit")
            .setDescription("Contoh: chapter, hari, jam")
            .setRequired(false)
    )
    .addBooleanOption(option =>
        option
            .setName("hot")
            .setDescription("Tampilkan tanda 🔥")
            .setRequired(false)
    )
    .addStringOption(option =>
        option
            .setName("status")
            .setDescription("Status paket")
            .addChoices(
                { name: "Tersedia", value: "Tersedia" },
                { name: "Penuh", value: "Penuh" },
                { name: "Tidak Tersedia", value: "Tidak Tersedia" }
            )
            .setRequired(false)
    )
    .addStringOption(option =>
        option
            .setName("deskripsi")
            .setDescription("Deskripsi paket")
            .setMaxLength(500)
            .setRequired(false)
    );

// ==================================================
// 7. EDIT JOKI
// ==================================================

const editJokiCommand = new SlashCommandBuilder()
    .setName("edit-joki")
    .setDescription("Mengubah informasi paket joki")
    .addIntegerOption(option =>
        option
            .setName("id")
            .setDescription("ID paket joki")
            .setMinValue(1)
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName("nama")
            .setDescription("Nama paket baru")
            .setMaxLength(100)
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option
            .setName("harga")
            .setDescription("Harga baru dalam Rupiah")
            .setMinValue(1)
            .setRequired(true)
    )
    .addBooleanOption(option =>
        option
            .setName("hot")
            .setDescription("Tampilkan tanda 🔥")
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName("status")
            .setDescription("Status paket")
            .addChoices(
                { name: "Tersedia", value: "Tersedia" },
                { name: "Penuh", value: "Penuh" },
                { name: "Tidak Tersedia", value: "Tidak Tersedia" }
            )
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName("unit")
            .setDescription("Contoh: chapter, hari, jam")
            .setRequired(false)
    )
    .addStringOption(option =>
        option
            .setName("deskripsi")
            .setDescription("Deskripsi paket")
            .setMaxLength(500)
            .setRequired(false)
    );

// ==================================================
// 8. DELETE JOKI
// ==================================================

const deleteJokiCommand = new SlashCommandBuilder()
    .setName("delete-joki")
    .setDescription("Menghapus paket joki")
    .addIntegerOption(option =>
        option
            .setName("id")
            .setDescription("ID paket yang akan dihapus")
            .setMinValue(1)
            .setRequired(true)
    );

// ==================================================
// 9. ADD CUSTOM CATALOG
// ==================================================

const addCustomCommand = new SlashCommandBuilder()
    .setName("add-custom")
    .setDescription("Isi atau edit katalog game dengan format teks bebas")
    .addIntegerOption(option =>
        option
            .setName("game_id")
            .setDescription("ID game tujuan (cek di /list-game)")
            .setMinValue(1)
            .setRequired(true)
    );

// ==================================================
// COMMAND HANDLERS
// ==================================================

const commands = [

    // ------------------------------------------------
    // SETUP KATALOG
    // ------------------------------------------------

    {
        data: setupCatalogCommand,

        async execute(interaction) {
            if (!await requireAdmin(interaction)) return;

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const gameId = interaction.options.getInteger("game_id");
            const channel = interaction.options.getChannel("channel");
            const game = getGame(gameId);

            if (!game) {
                return interaction.editReply(
                    "❌ Game tidak ditemukan! Gunakan /list-game untuk cek ID game."
                );
            }

            try {
                await setupCatalog(game, channel);

                await interaction.editReply(
                    `✅ Katalog untuk **${game.name}** berhasil dibuat di ${channel}!`
                );

            } catch (error) {
                console.error(error);

                await interaction.editReply(
                    "❌ Gagal membuat katalog. Periksa permission bot di channel tersebut."
                );
            }
        }
    },

    // ------------------------------------------------
    // ADD GAME
    // ------------------------------------------------

    {
        data: addGameCommand,

        async execute(interaction) {
            if (!await requireAdmin(interaction)) return;

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const name = interaction.options.getString("nama");
            const icon = interaction.options.getString("icon") || "";

            if (!validImageUrl(icon)) {
                return interaction.editReply("❌ URL icon tidak valid!");
            }

            try {
                const result = db.prepare(`
                    INSERT INTO games (name, icon_url)
                    VALUES (?, ?)
                `).run(name, icon);

                await interaction.editReply(
                    `✅ Game berhasil ditambahkan!\n\n` +
                    `**Nama:** ${name}\n` +
                    `**ID Game:** ${result.lastInsertRowid}\n\n` +
                    `Gunakan \`/setup-katalog game_id:${result.lastInsertRowid}\` untuk mengatur channel katalognya.`
                );

            } catch (error) {
                console.error(error);

                await interaction.editReply(
                    error.code === "SQLITE_CONSTRAINT_UNIQUE"
                        ? "❌ Game tersebut sudah terdaftar!"
                        : "❌ Gagal menambahkan game."
                );
            }
        }
    },

    // ------------------------------------------------
    // EDIT GAME
    // ------------------------------------------------

    {
        data: editGameCommand,

        async execute(interaction) {
            if (!await requireAdmin(interaction)) return;

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const id = interaction.options.getInteger("id");
            const name = interaction.options.getString("nama");
            const icon = interaction.options.getString("icon");

            const game = getGame(id);

            if (!game) {
                return interaction.editReply("❌ Game tidak ditemukan!");
            }

            if (name === null && icon === null) {
                return interaction.editReply(
                    "❌ Masukkan nama atau icon yang ingin diubah!"
                );
            }

            if (!validImageUrl(icon)) {
                return interaction.editReply("❌ URL icon tidak valid!");
            }

            try {
                db.prepare(`
                    UPDATE games
                    SET name = ?, icon_url = ?
                    WHERE id = ?
                `).run(
                    name ?? game.name,
                    icon ?? game.icon_url,
                    id
                );

                await refreshCatalog(id);

                await interaction.editReply(
                    `✅ Game **${game.name}** berhasil diperbarui!`
                );

            } catch (error) {
                console.error(error);

                await interaction.editReply(
                    "❌ Gagal mengubah game. Periksa kemungkinan nama duplikat."
                );
            }
        }
    },

    // ------------------------------------------------
    // DELETE GAME
    // ------------------------------------------------

    {
        data: deleteGameCommand,

        async execute(interaction) {
            if (!await requireAdmin(interaction)) return;

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const id = interaction.options.getInteger("id");
            const game = getGame(id);

            if (!game) {
                return interaction.editReply("❌ Game tidak ditemukan!");
            }

            try {
                if (game.channel_id) {
                    try {
                        const channel = await interaction.client.channels.fetch(game.channel_id);

                        if (game.header_message_id) {
                            try {
                                const headerMsg = await channel.messages.fetch(game.header_message_id);
                                await headerMsg.delete();
                            } catch {}
                        }

                        const messages = db.prepare(`
                            SELECT * FROM catalog_game_messages
                            WHERE game_id = ?
                        `).all(id);

                        for (const item of messages) {
                            try {
                                const message = await channel.messages.fetch(item.message_id);
                                await message.delete();
                            } catch {}
                        }
                    } catch {}
                }

                db.prepare("DELETE FROM catalog_game_messages WHERE game_id = ?").run(id);
                db.prepare("DELETE FROM games WHERE id = ?").run(id);

                await interaction.editReply(
                    `✅ Game **${game.name}** dan seluruh paketnya berhasil dihapus!`
                );

            } catch (error) {
                console.error(error);

                await interaction.editReply(
                    "❌ Gagal menghapus game."
                );
            }
        }
    },

    // ------------------------------------------------
    // LIST GAME
    // ------------------------------------------------

    {
        data: listGameCommand,

        async execute(interaction) {
            if (!await requireAdmin(interaction)) return;

            const games = db.prepare(`
                SELECT * FROM games
                ORDER BY id ASC
            `).all();

            if (!games.length) {
                return interaction.reply({
                    content: "Belum ada game yang terdaftar.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const embed = new EmbedBuilder()
                .setColor("#2563EB")
                .setTitle("🎮 DAFTAR GAME ROBLOX");

            for (const game of games) {
                const total = db.prepare(`
                    SELECT COUNT(*) AS total
                    FROM services
                    WHERE game_id = ?
                `).get(game.id);

                const channelInfo = game.channel_id ? `<#${game.channel_id}>` : "Belum diatur";

                embed.addFields({
                    name: `ID ${game.id} - ${game.name}`,
                    value: `Channel: ${channelInfo} • Total paket: ${total.total}`,
                    inline: false
                });
            }

            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });
        }
    },

    // ------------------------------------------------
    // ADD JOKI
    // ------------------------------------------------

    {
        data: addJokiCommand,

        async execute(interaction) {
            if (!await requireAdmin(interaction)) return;

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const gameId = interaction.options.getInteger("game_id");
            const game = getGame(gameId);

            if (!game) {
                return interaction.editReply(
                    "❌ Game tidak ditemukan! Gunakan /list-game."
                );
            }

            const name = interaction.options.getString("nama");
            const price = interaction.options.getInteger("harga");
            const unit = interaction.options.getString("unit") || "";
            const hot = interaction.options.getBoolean("hot") ? 1 : 0;
            const status = interaction.options.getString("status") || "Tersedia";
            const description = interaction.options.getString("deskripsi") || "";

            try {
                const result = db.prepare(`
                    INSERT INTO services (
                        game_id,
                        name,
                        price,
                        unit,
                        is_hot,
                        status,
                        description
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    gameId,
                    name,
                    price,
                    unit,
                    hot,
                    status,
                    description
                );

                await refreshCatalog(gameId);

                await interaction.editReply(
                    `✅ Paket joki berhasil ditambahkan!\n\n` +
                    `**Game:** ${game.name}\n` +
                    `**ID Paket:** ${result.lastInsertRowid}\n` +
                    `**Nama:** ${name}\n` +
                    `**Harga:** ${rupiah(price)}`
                );

            } catch (error) {
                console.error(error);

                await interaction.editReply(
                    "❌ Gagal menambahkan paket joki."
                );
            }
        }
    },

    // ------------------------------------------------
    // EDIT JOKI
    // ------------------------------------------------

    {
        data: editJokiCommand,

        async execute(interaction) {
            if (!await requireAdmin(interaction)) return;

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const id = interaction.options.getInteger("id");
            const service = getService(id);

            if (!service) {
                return interaction.editReply(
                    "❌ Paket joki tidak ditemukan!"
                );
            }

            const name = interaction.options.getString("nama");
            const price = interaction.options.getInteger("harga");
            const unit = interaction.options.getString("unit") ?? service.unit;
            const hot = interaction.options.getBoolean("hot") ? 1 : 0;
            const status = interaction.options.getString("status");
            const description =
                interaction.options.getString("deskripsi") ?? service.description;

            try {
                db.prepare(`
                    UPDATE services
                    SET
                        name = ?,
                        price = ?,
                        unit = ?,
                        is_hot = ?,
                        status = ?,
                        description = ?
                    WHERE id = ?
                `).run(
                    name,
                    price,
                    unit,
                    hot,
                    status,
                    description,
                    id
                );

                await refreshCatalog(service.game_id);

                await interaction.editReply(
                    `✅ Paket **${name}** berhasil diperbarui!\n\n` +
                    `**Harga baru:** ${rupiah(price)}`
                );

            } catch (error) {
                console.error(error);

                await interaction.editReply(
                    "❌ Gagal mengubah paket joki."
                );
            }
        }
    },

    // ------------------------------------------------
    // DELETE JOKI
    // ------------------------------------------------

    {
        data: deleteJokiCommand,

        async execute(interaction) {
            if (!await requireAdmin(interaction)) return;

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const id = interaction.options.getInteger("id");
            const service = getService(id);

            if (!service) {
                return interaction.editReply(
                    "❌ Paket joki tidak ditemukan!"
                );
            }

            try {
                db.prepare(
                    "DELETE FROM services WHERE id = ?"
                ).run(id);

                await refreshCatalog(service.game_id);

                await interaction.editReply(
                    `✅ Paket **${service.name}** berhasil dihapus!`
                );

            } catch (error) {
                console.error(error);

                await interaction.editReply(
                    "❌ Gagal menghapus paket joki."
                );
            }
        }
    },

    // ------------------------------------------------
    // ADD CUSTOM CATALOG
    // ------------------------------------------------

    {
        data: addCustomCommand,

        async execute(interaction) {
            if (!await requireAdmin(interaction)) return;

            const gameId = interaction.options.getInteger("game_id");
            const game = getGame(gameId);

            if (!game) {
                return interaction.reply({
                    content: "❌ Game tidak ditemukan! Gunakan /list-game.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const modal = new ModalBuilder()
                .setCustomId(`custom_catalog_modal_${game.id}`)
                .setTitle(`Custom Katalog: ${game.name}`.slice(0, 45));

            const textInput = new TextInputBuilder()
                .setCustomId("custom_catalog_text")
                .setLabel("Daftar Paket (Bisa Copy-Paste Multi-baris)")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("-----DUNGEON-----\n-> 10 Floor = 7k\n-> 20 Floor = 14k")
                .setValue(game.custom_text || "")
                .setMaxLength(4000)
                .setRequired(false);

            const actionRow = new ActionRowBuilder().addComponents(textInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        }
    }

];

// ==================================================
// EXPORT COMMANDS
// ==================================================

module.exports = commands;