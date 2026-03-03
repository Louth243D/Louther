const { Collection } = require('discord.js');

const cooldowns = new Collection();

/**
 * Gestiona el cooldown de un usuario para un comando.
 * @param {string} userId - ID del usuario.
 * @param {string} commandName - Nombre del comando.
 * @param {number} cooldownAmount - Tiempo en milisegundos.
 * @returns {number|null} - Tiempo restante en milisegundos o null si no hay cooldown.
 */
function checkCooldown(userId, commandName, cooldownAmount) {
    if (!cooldowns.has(commandName)) {
        cooldowns.set(commandName, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(commandName);
    
    if (timestamps.has(userId)) {
        const expirationTime = timestamps.get(userId) + cooldownAmount;

        if (now < expirationTime) {
            return expirationTime - now;
        }
    }

    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownAmount);
    return null;
}

module.exports = { checkCooldown };
