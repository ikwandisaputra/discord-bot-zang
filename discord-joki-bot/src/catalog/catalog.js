const {
    EmbedBuilder
} = require("discord.js");

const db = require("../database/db");

// ==========================================
// FORMAT HARGA
// ==========================================

function formatPrice(price) {
    return new Intl.NumberFormat("id-ID").format(price);
}

// ==========================================
// MEMBAGI PAKET MENJADI BEBERAPA PESAN
// ==========================================

function createChunks(services) {
    const chunks = [];
    let current = [];

    for (const service of services) {

        const hot = service.is_hot ? " 🔥" : "";

        const unit = service.unit
            ? `/${service.unit}`
            : "";

        const status = service.status !== "Tersedia"
            ? ` · ${service.status}`
            : "";

        const desc = service.description
            ? `\n> *${service.description}*`
            : "";

        const line =
            `**${service.name}** — Rp${formatPrice(service.price)}${unit}${hot}${status}${desc}`;

        if (
            current.length > 0 &&
            current.join("\n").length + line.length + 1 > 3500
        ) {
            chunks.push(current);
            current = [];
        }

        current.push(line);
    }

    if (current.length > 0) {
        chunks.push(current);
    }

    return chunks;
}

// ==========================================
// MEMBAGI TEKS CUSTOM MENJADI BEBERAPA PESAN
// ==========================================

function createCustomChunks(text) {
    const lines = text.split("\n");
    const chunks = [];
    let current = [];

    for (const line of lines) {
        if (
            current.length > 0 &&
            current.join("\n").length + line.length + 1 > 3500
        ) {
            chunks.push(current);
            current = [];
        }
        current.push(line);
    }

    if (current.length > 0) {
        chunks.push(current);
    }

    return chunks;
}

// ==========================================
// MEMBUAT EMBED GAME
// ==========================================

function createGameEmbed(game, services, part, totalParts) {

    const description = services.length
        ? services.join("\n")
        : "Belum ada paket joki untuk game ini.";

    const embed = new EmbedBuilder()
        .setColor("#2563EB")
        .setTitle(`🎮 ${game.name}`)
        .setDescription(description)
        .setFooter({
            text: `Katalog Joki Roblox • Bagian ${part + 1}/${totalParts}`
        });

    if (game.icon_url) {
        embed.setThumbnail(game.icon_url);
    }

    return embed;
}

// ==========================================
// SETUP KATALOG PER GAME
// ==========================================

async function setupCatalog(game, channel) {

    // Hapus header & pesan game lama di channel sebelumnya jika ada
    if (game.channel_id) {
        try {
            const oldChannel = await global.discordClient.channels.fetch(game.channel_id);
            if (oldChannel && oldChannel.isTextBased()) {
                if (game.header_message_id) {
                    try {
                        const oldHeader = await oldChannel.messages.fetch(game.header_message_id);
                        await oldHeader.delete();
                    } catch {}
                }

                const oldGameMessages = db.prepare(`
                    SELECT * FROM catalog_game_messages
                    WHERE game_id = ?
                `).all(game.id);

                for (const item of oldGameMessages) {
                    try {
                        const oldMsg = await oldChannel.messages.fetch(item.message_id);
                        await oldMsg.delete();
                    } catch {}
                }
            }
        } catch {}
    }

    // Reset pesan game khusus untuk game ini
    db.prepare(`DELETE FROM catalog_game_messages WHERE game_id = ?`).run(game.id);

    const header = new EmbedBuilder()
        .setColor("#2563EB")
        .setTitle(`🔥 JOKI ${game.name.toUpperCase()}`)
        .setDescription(
            "Males grinding? Biar kita yang kerjain!\n" +
            `Pilih paket joki **${game.name}** yang tersedia di bawah ini.`
        )
        .setFooter({
            text: "Roblox Joki Catalog"
        });

    const headerMessage = await channel.send({
        embeds: [header]
    });

    db.prepare(`
        UPDATE games
        SET channel_id = ?, header_message_id = ?
        WHERE id = ?
    `).run(
        channel.id,
        headerMessage.id,
        game.id
    );

    await refreshCatalog(game.id);
}

// ==========================================
// REFRESH KATALOG
// ==========================================

async function refreshCatalog(targetGameId = null) {

    const games = targetGameId
        ? db.prepare(`SELECT * FROM games WHERE id = ?`).all(targetGameId)
        : db.prepare(`SELECT * FROM games ORDER BY id ASC`).all();

    for (const game of games) {

        // Lewati game yang belum diatur channel katalognya
        if (!game.channel_id) continue;

        let channel;
        try {
            channel = await global.discordClient.channels.fetch(game.channel_id);
        } catch {
            continue;
        }

        if (!channel || !channel.isTextBased() || !channel.messages) continue;

        const services = db.prepare(`
            SELECT * FROM services
            WHERE game_id = ?
            ORDER BY id ASC
        `).all(game.id);

        const serviceChunks = createChunks(services);
        const customChunks = (game.custom_text && game.custom_text.trim() !== "")
            ? createCustomChunks(game.custom_text)
            : [];

        const allLines = [
            ...serviceChunks.flat(),
            ...(serviceChunks.length > 0 && customChunks.length > 0 ? [""] : []),
            ...customChunks.flat()
        ];

        const chunks = allLines.length > 0
            ? createCustomChunks(allLines.join("\n"))
            : [[]];

        const existingMessages = db.prepare(`
            SELECT * FROM catalog_game_messages
            WHERE game_id = ?
            ORDER BY part ASC
        `).all(game.id);

        const messageMap = new Map(
            existingMessages.map(item => [
                item.part,
                item.message_id
            ])
        );

        for (let i = 0; i < chunks.length; i++) {

            const embed = createGameEmbed(
                game,
                chunks[i],
                i,
                chunks.length
            );

            const messageId = messageMap.get(i);
            let message = null;

            if (messageId) {
                try {
                    message = await channel.messages.fetch(messageId);
                    await message.edit({
                        embeds: [embed]
                    });
                } catch {
                    message = null;
                }
            }

            if (!message) {
                message = await channel.send({
                    embeds: [embed]
                });
            }

            db.prepare(`
                INSERT INTO catalog_game_messages (
                    game_id,
                    part,
                    message_id
                )
                VALUES (?, ?, ?)
                ON CONFLICT(game_id, part)
                DO UPDATE SET
                    message_id = excluded.message_id
            `).run(
                game.id,
                i,
                message.id
            );
        }

        // Hapus pesan yang sudah tidak diperlukan
        for (const item of existingMessages) {

            if (item.part >= chunks.length) {

                try {
                    const message = await channel.messages.fetch(
                        item.message_id
                    );
                    await message.delete();
                } catch {}

                db.prepare(`
                    DELETE FROM catalog_game_messages
                    WHERE game_id = ? AND part = ?
                `).run(game.id, item.part);
            }
        }
    }
}

// ==========================================
// EXPORT
// ==========================================

module.exports = {
    setupCatalog,
    refreshCatalog
};