const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const tag = client.user?.tag ?? 'Bot';
    const totalCommands = client.commands.size;
    console.log(`Conectado como ${tag}. Cargados ${totalCommands} comandos en memoria.`);
    
    try {
      const guilds = await client.guilds.fetch();
      console.log(`Servidores detectados: ${guilds.size}`);
      for (const [id] of guilds) {
        try {
          const guild = await client.guilds.fetch(id);
          await guild.commands.set(client.commandData);
          console.log(`- Comandos registrados en: ${guild.name} (${client.commandData.length} comandos registrados)`);
        } catch (e) {
          console.error(`- Error registrando comandos en ${id}:`, e.message);
        }
      }
    } catch (e) {
      console.error('Error al obtener servidores:', e.message);
    }
    console.log('---------------------------------');
    console.log(`${tag} LISTO Y OPERATIVO.`);
    console.log('---------------------------------');
  }
};
