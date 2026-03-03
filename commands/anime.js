const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const anime = require('anime-actions');
const fs = require('fs');
const path = require('path');

const statsFile = path.join(__dirname, '..', 'data', 'anime_stats.json');

function getStats() {
    try {
        if (!fs.existsSync(statsFile)) return {};
        return JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
    } catch (e) { return {}; }
}

function saveStats(stats) {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
}

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('anime')
        .setDescription('Comandos de interacción anime')
        .addSubcommand(sub => sub.setName('hug').setDescription('Dale un abrazo a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a abrazar').setRequired(true)))
        .addSubcommand(sub => sub.setName('kiss').setDescription('Dale un beso a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a besar').setRequired(true)))
        .addSubcommand(sub => sub.setName('slap').setDescription('Dale una bofetada a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a abofetear').setRequired(true)))
        .addSubcommand(sub => sub.setName('poke').setDescription('Dale un toque a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a tocar').setRequired(true)))
        .addSubcommand(sub => sub.setName('pet').setDescription('Acaricia a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a acariciar').setRequired(true)))
        .addSubcommand(sub => sub.setName('punch').setDescription('Dale un puñetazo a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a golpear').setRequired(true)))
        .addSubcommand(sub => sub.setName('kick').setDescription('Dale una patada a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a patear').setRequired(true)))
        .addSubcommand(sub => sub.setName('bite').setDescription('Dale un mordisco a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a morder').setRequired(true)))
        .addSubcommand(sub => sub.setName('cuddle').setDescription('Acurrúcate con alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario con quien acurrucarse').setRequired(true)))
        .addSubcommand(sub => sub.setName('wave').setDescription('Saluda a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a saludar').setRequired(true)))
        .addSubcommand(sub => sub.setName('dance').setDescription('Baila con alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario con quien bailar').setRequired(true)))
        .addSubcommand(sub => sub.setName('smile').setDescription('Sonríele a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a quien sonreír').setRequired(true)))
        .addSubcommand(sub => sub.setName('stare').setDescription('Mira fijamente a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario a quien mirar').setRequired(true)))
        .addSubcommand(sub => sub.setName('cry').setDescription('Llora frente a alguien').addUserOption(o => o.setName('usuario').setDescription('Usuario frente a quien llorar').setRequired(true)))
        .addSubcommand(sub => sub.setName('pose').setDescription('Haz una pose épica de Jojo').addUserOption(o => o.setName('usuario').setDescription('Usuario con quien posar (opcional)').setRequired(false))),

    async execute(interaction, client, args, context = {}) {
        const isInteraction = interaction.commandName !== undefined;
        let subcommand, user;

        if (isInteraction) {
            subcommand = interaction.options.getSubcommand();
            user = interaction.options.getUser('usuario') || (subcommand === 'pose' ? interaction.user : null);
        } else {
            subcommand = args[0];
            user = context.user || (subcommand === 'pose' ? interaction.author : null);
            if (!subcommand) return interaction.reply({ content: 'Uso: `!anime <acción> @usuario` (hug, kiss, slap, etc.)' });
            if (!user && subcommand !== 'pose') return interaction.reply({ content: 'Debes mencionar a alguien para realizar esta acción.' });
        }

        const guildId = interaction.guild.id;
        const senderId = isInteraction ? interaction.user.id : interaction.author.id;
        const senderName = isInteraction ? interaction.user.username : interaction.author.username;
        const targetId = user?.id;

        // Función de respuesta universal
        const reply = async (options) => {
            if (isInteraction) return interaction.reply(options);
            return interaction.channel.send(options);
        };

        // Restricción de auto-interacción
        const expressiveActions = ['cry', 'smile', 'dance', 'wave', 'stare', 'pose'];
        if (senderId === targetId && !expressiveActions.includes(subcommand)) {
            const errEmbed = createEmbed('error', 'Acción No Válida', `No puedes usar \`${subcommand}\` contigo mismo. ¡Busca a alguien más!`);
            return reply({ embeds: [errEmbed], flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
        }

        let gif, title, desc;
        let thanksMsg = "";

        const isBot = targetId === (isInteraction ? interaction.client.user.id : client.user.id);
        const negativeActions = ['slap', 'punch', 'kick', 'bite'];
        const isNegativeAction = negativeActions.includes(subcommand);

        // Respuesta especial si mencionan al bot
        if (isBot) {
            if (isNegativeAction) {
                thanksMsg = "\n\n💢 **¡Oye! ¿Por qué me haces eso? ¡Eso dolió mucho! Eres muy cruel conmigo... 😭💔**";
            } else {
                thanksMsg = "\n\n✨ **¡Muchas gracias por ser tan amable conmigo! Me haces sentir muy especial. 😊💖**";
            }
        }

        // Sistema de contador
        const stats = getStats();
        if (!stats[guildId]) stats[guildId] = {};
        const pairKey = targetId ? [senderId, targetId].sort().join('-') : senderId;
        if (!stats[guildId][pairKey]) stats[guildId][pairKey] = {};
        if (!stats[guildId][pairKey][subcommand]) stats[guildId][pairKey][subcommand] = 0;
        
        stats[guildId][pairKey][subcommand]++;
        const count = stats[guildId][pairKey][subcommand];
        saveStats(stats);

        const countText = count > 1 ? `\n*¡Ya han hecho esto ${count} veces!*` : "";

        switch (subcommand) {
            case 'pose': {
                try {
                    const jojoData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jojo_gifs.json'), 'utf-8'));
                    gif = jojoData[Math.floor(Math.random() * jojoData.length)];
                } catch (e) {
                    // Fallback
                    gif = 'https://media.giphy.com/media/f9jxYYRVPHtKs/giphy.gif';
                }
                title = '🕺 ¡JOJO POSE!';
                desc = senderId === targetId ? `**${senderName}** está haciendo una pose épica.` : `**${senderName}** está haciendo una pose épica con **${user.username}**.`;
                break;
            }
            case 'hug':
                gif = await anime.hug();
                title = '🫂 ¡Un Gran Abrazo!';
                desc = `**${senderName}** ha abrazado a **${user.username}**.`;
                break;
            case 'kiss':
                gif = await anime.kiss();
                title = '💋 ¡Un Dulce Beso!';
                desc = `**${senderName}** ha besado a **${user.username}**.`;
                break;
            case 'slap':
                gif = await anime.slap();
                title = '🖐️ ¡ZAS en toda la cara!';
                desc = `**${senderName}** le ha dado una bofetada a **${user.username}**.`;
                break;
            case 'poke':
                gif = await anime.poke();
                title = '👉 ¡Toque!';
                desc = `**${senderName}** le ha dado un toque a **${user.username}**.`;
                break;
            case 'pet':
                gif = await anime.pat();
                title = '🖐️ ¡Acariciando!';
                desc = `**${senderName}** está acariciando a **${user.username}**.`;
                break;
            case 'punch':
                gif = await anime.punch();
                title = '👊 ¡PUM! Puñetazo';
                desc = `**${senderName}** le ha dado un puñetazo a **${user.username}**.`;
                break;
            case 'kick':
                gif = await anime.kick();
                title = '🦶 ¡PATADÓN!';
                desc = `**${senderName}** le ha dado una patada a **${user.username}**.`;
                break;
            case 'bite':
                gif = await anime.bite();
                title = '🦷 ¡Muerde, muerde!';
                desc = `**${senderName}** ha mordido a **${user.username}**.`;
                break;
            case 'cuddle':
                gif = await anime.cuddle();
                title = '🥰 ¡Acurrucados!';
                desc = `**${senderName}** se está acurrucando con **${user.username}**.`;
                break;
            case 'wave':
                gif = await anime.wave();
                title = '👋 ¡Hola!';
                desc = `**${senderName}** está saludando a **${user.username}**.`;
                break;
            case 'dance':
                gif = await anime.dance();
                title = '💃 ¡A Bailar!';
                desc = `**${senderName}** está bailando con **${user.username}**.`;
                break;
            case 'smile':
                gif = await anime.smile();
                title = '😊 ¡Sonrisa!';
                desc = senderId === targetId ? `**${senderName}** está sonriendo.` : `**${senderName}** le ha sonreído a **${user.username}**.`;
                break;
            case 'stare':
                gif = await anime.stare();
                title = '👀 Mirada Fija...';
                desc = `**${senderName}** está mirando fijamente a **${user.username}**.`;
                break;
            case 'cry':
                gif = await anime.cry();
                title = '😭 ¡Buaaaaa!';
                desc = senderId === targetId ? `**${senderName}** se ha puesto a llorar.` : `**${senderName}** está llorando frente a **${user.username}**.`;
                break;
        }

        const embed = createEmbed('anime', title, desc + thanksMsg, { 
            image: gif,
            footer: `Reacción #${count} entre ustedes • Louther Anime`
        });

        return reply({ content: senderId === targetId ? null : `<@${user.id}>`, embeds: [embed] });
    }
};
