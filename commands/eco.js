const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');
const path = require('path');
const fs = require('fs').promises;

const defaultEconomy = {
    balance: 0,
    lastDaily: 0,
    lastWork: 0,
    lastWeekly: 0,
    inventory: []
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eco')
        .setDescription('Comandos del sistema de economía')
        .addSubcommand(sub => sub.setName('balance').setDescription('Mira tu saldo actual').addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')))
        .addSubcommand(sub => sub.setName('daily').setDescription('Reclama tus monedas diarias'))
        .addSubcommand(sub => sub.setName('weekly').setDescription('Reclama tu bono semanal'))
        .addSubcommand(sub => sub.setName('work').setDescription('Trabaja para ganar monedas'))
        .addSubcommand(sub => sub.setName('shop').setDescription('Mira la tienda de items'))
        .addSubcommand(sub => sub.setName('buy').setDescription('Compra un item de la tienda').addStringOption(o => o.setName('item').setDescription('ID del item').setRequired(true)))
        .addSubcommand(sub => sub.setName('inventory').setDescription('Mira tu inventario de items'))
        .addSubcommand(sub => sub.setName('leaderboard').setDescription('Ranking de los más ricos'))
        .addSubcommand(sub => sub.setName('give').setDescription('Regala monedas a otro usuario').addUserOption(o => o.setName('usuario').setDescription('Destinatario').setRequired(true)).addIntegerOption(o => o.setName('cantidad').setDescription('Monto').setRequired(true).setMinValue(1))),

    async execute(interaction, client, args, context = {}) {
        const isInteraction = interaction.commandName !== undefined;
        let subcommand, user, amount, itemId;

        if (isInteraction) {
            subcommand = interaction.options.getSubcommand();
            user = interaction.options.getUser('usuario') || interaction.user;
            amount = interaction.options.getInteger('cantidad');
            itemId = interaction.options.getString('item');
        } else {
            subcommand = args[0];
            user = context.user;
            amount = context.amount;
            itemId = args[1]; // Para comandos como !eco buy <item>
            if (!subcommand) return interaction.reply({ content: 'Uso: `!eco <subcomando>` (balance, daily, work, etc.)' });
        }

        const guildId = interaction.guild.id;
        const userId = (isInteraction ? interaction.user.id : interaction.author.id);

        // Función de respuesta universal
        const reply = async (options) => {
            if (isInteraction) return interaction.reply(options);
            return interaction.channel.send(options);
        };

        try {
            switch (subcommand) {
                case 'balance': {
                    const data = await DataManager.getFile(`economy/${guildId}_${user.id}.json`, defaultEconomy);
                    const embed = createEmbed('economy', `Cartera de ${user.username}`, `Aquí tienes el estado financiero actual.`, {
                        fields: [
                            { name: '💰 Saldo Total', value: `\`$${data.balance.toLocaleString()}\``, inline: true },
                            { name: '🏦 Banco', value: '`$0` (Próximamente)', inline: true }
                        ],
                        thumbnail: user.displayAvatarURL({ dynamic: true })
                    });
                    return reply({ embeds: [embed] });
                }

                case 'daily': {
                    const data = await DataManager.getFile(`economy/${guildId}_${userId}.json`, defaultEconomy);
                    const cooldown = 24 * 60 * 60 * 1000;
                    const timeLeft = cooldown - (Date.now() - (data.lastDaily || 0));
                    if (timeLeft > 0) {
                        return reply({ embeds: [createEmbed('error', 'Tiempo de Espera', `Ya has reclamado tu diario. Vuelve <t:${Math.floor((Date.now() + timeLeft) / 1000)}:R>.`)].map(e => isInteraction ? e : e), flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
                    }
                    const reward = 500;
                    data.balance += reward;
                    data.lastDaily = Date.now();
                    await DataManager.saveFile(`economy/${guildId}_${userId}.json`, data);
                    return reply({ embeds: [createEmbed('success', '💰 Recompensa Diaria', `Has recibido **$${reward}** monedas.\nSaldo actual: **$${data.balance.toLocaleString()}**`)] });
                }

                case 'weekly': {
                    const data = await DataManager.getFile(`economy/${guildId}_${userId}.json`, defaultEconomy);
                    const cooldown = 7 * 24 * 60 * 60 * 1000;
                    const timeLeft = cooldown - (Date.now() - (data.lastWeekly || 0));
                    if (timeLeft > 0) {
                        return reply({ embeds: [createEmbed('error', 'Tiempo de Espera', `Aún no puedes reclamar tu bono semanal. Vuelve <t:${Math.floor((Date.now() + timeLeft) / 1000)}:R>.`)], flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
                    }
                    const reward = 5000;
                    data.balance += reward;
                    data.lastWeekly = Date.now();
                    await DataManager.saveFile(`economy/${guildId}_${userId}.json`, data);
                    return reply({ embeds: [createEmbed('success', '💎 Bono Semanal', `¡Increíble! Has recibido **$${reward}** monedas.\nSaldo actual: **$${data.balance.toLocaleString()}**`)] });
                }

                case 'work': {
                    const data = await DataManager.getFile(`economy/${guildId}_${userId}.json`, defaultEconomy);
                    const cooldown = 3600000; // 1 hora
                    const timeLeft = cooldown - (Date.now() - (data.lastWork || 0));
                    if (timeLeft > 0) {
                        return reply({ embeds: [createEmbed('error', 'Cansancio', `Estás cansado, vuelve a trabajar <t:${Math.floor((Date.now() + timeLeft) / 1000)}:R>.`)], flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
                    }
                    const earned = Math.floor(Math.random() * 300) + 100;
                    data.balance += earned;
                    data.lastWork = Date.now();
                    await DataManager.saveFile(`economy/${guildId}_${userId}.json`, data);
                    return reply({ embeds: [createEmbed('economy', '👷 Trabajo Terminado', `Has trabajado duro y ganado **$${earned}**.\nSaldo actual: **$${data.balance.toLocaleString()}**`)] });
                }

                case 'shop': {
                    const items = await DataManager.getFile('shop/items.json', []);
                    if (!items.length) {
                        return reply({ embeds: [createEmbed('info', 'Tienda Vacía', 'No hay ítems disponibles en la tienda en este momento.')] });
                    }
                    const embed = createEmbed('economy', 'Tienda Louther', 'Usa `/eco buy <id>` para comprar.', {
                        fields: items.map(i => ({ name: `${i.name} (ID: ${i.id})`, value: `Precio: **$${i.price}**\n${i.description}` }))
                    });
                    return reply({ embeds: [embed] });
                }

                case 'buy': {
                    if (!itemId) return reply({ content: 'Debes especificar el ID del item. Ejemplo: `!eco buy pocion`' });
                    const [items, data] = await Promise.all([
                        DataManager.getFile('shop/items.json', []),
                        DataManager.getFile(`economy/${guildId}_${userId}.json`, defaultEconomy)
                    ]);
                    const itemToBuy = items.find(i => i.id === itemId);
                    if (!itemToBuy) {
                        return reply({ embeds: [createEmbed('error', 'Item No Encontrado', 'Ese item no existe en la tienda.')], flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
                    }
                    if (data.balance < itemToBuy.price) {
                        return reply({ embeds: [createEmbed('error', 'Saldo Insuficiente', `Necesitas \`$${itemToBuy.price}\` pero solo tienes \`$${data.balance}\`.`)], flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
                    }
                    data.balance -= itemToBuy.price;
                    data.inventory.push({ id: itemToBuy.id, name: itemToBuy.name, purchasedAt: Date.now() });
                    await DataManager.saveFile(`economy/${guildId}_${userId}.json`, data);
                    const embed = createEmbed('economy', 'Compra Exitosa', `Has comprado **${itemToBuy.name}** correctamente.`, {
                        fields: [
                            { name: '💸 Precio Pagado', value: `\`$${itemToBuy.price}\``, inline: true },
                            { name: '💰 Saldo Restante', value: `\`$${data.balance}\``, inline: true }
                        ]
                    });
                    return reply({ embeds: [embed] });
                }

                case 'inventory': {
                    const data = await DataManager.getFile(`economy/${guildId}_${userId}.json`, defaultEconomy);
                    if (!data.inventory.length) {
                        return reply({ embeds: [createEmbed('economy', 'Inventario Vacío', 'No tienes ningún ítem en tu inventario.')] });
                    }
                    const invList = data.inventory.map((item, index) => `${index + 1}. **${item.name}** (ID: \`${item.id}\`)`).join('\n');
                    const embed = createEmbed('economy', `Inventario de ${isInteraction ? interaction.user.username : interaction.author.username}`, invList);
                    return reply({ embeds: [embed] });
                }

                case 'leaderboard': {
                    const economyDir = path.join(__dirname, '..', 'data', 'economy');
                    let files;
                    try {
                        files = await fs.readdir(economyDir);
                    } catch (e) {
                        return reply({ embeds: [createEmbed('info', 'Top Más Ricos', 'Nadie tiene dinero aún.')] });
                    }

                    const guildFiles = files.filter(f => f.startsWith(`${guildId}_`));
                    if (!guildFiles.length) {
                        return reply({ embeds: [createEmbed('info', 'Top Más Ricos', 'Nadie tiene dinero aún.')] });
                    }

                    const leaderboardData = await Promise.all(
                        guildFiles.map(async f => {
                            const data = await DataManager.getFile(`economy/${f}`);
                            const userIdFromFile = f.split('_')[1].replace('.json', '');
                            return { id: userIdFromFile, balance: data.balance || 0 };
                        })
                    );

                    const sorted = leaderboardData.sort((a, b) => b.balance - a.balance).slice(0, 10);
                    const lbText = sorted.map((u, i) => `${i + 1}. <@${u.id}> - **$${u.balance.toLocaleString()}**`).join('\n') || 'Nadie tiene dinero aún.';
                    return reply({ embeds: [createEmbed('economy', 'Top Más Ricos del Servidor', lbText)] });
                }

                case 'give': {
                    if (!user || user.id === userId) return reply({ content: 'Debes mencionar a un usuario válido.', flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
                    if (!amount || amount <= 0) return reply({ content: 'Debes especificar una cantidad válida mayor a 0.', flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
                    
                    if (user.bot) return reply({ content: 'No puedes dar dinero a un bot.', flags: isInteraction ? [MessageFlags.Ephemeral] : [] });

                    const [senderData, receiverData] = await Promise.all([
                        DataManager.getFile(`economy/${guildId}_${userId}.json`, defaultEconomy),
                        DataManager.getFile(`economy/${guildId}_${user.id}.json`, defaultEconomy)
                    ]);

                    if (senderData.balance < amount) {
                        return reply({ embeds: [createEmbed('error', 'Saldo Insuficiente', `No tienes suficientes monedas para regalar **$${amount}**.`)] , flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
                    }

                    senderData.balance -= amount;
                    receiverData.balance += amount;

                    await Promise.all([
                        DataManager.saveFile(`economy/${guildId}_${userId}.json`, senderData),
                        DataManager.saveFile(`economy/${guildId}_${user.id}.json`, receiverData)
                    ]);

                    const embed = createEmbed('success', 'Transferencia Exitosa', `Has regalado **$${amount.toLocaleString()}** a ${user.username}.`, {
                        fields: [{ name: 'Tu Saldo Actual', value: `\`$${senderData.balance.toLocaleString()}\`` }]
                    });
                    return reply({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error(`[Economy Command] Error en subcomando ${subcommand}:`, error);
            return reply({ embeds: [createEmbed('error', 'Error Inesperado', 'Ocurrió un error al procesar tu solicitud.')], flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
        }
    }
};
