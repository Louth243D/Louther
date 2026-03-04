const Genius = require('genius-lyrics');
const Client = new Genius.Client(process.env.GENIUS_API_KEY);

/**
 * Busca la letra de una canción en Genius.
 * @param {string} query - Nombre de la canción y autor.
 * @returns {Promise<string[]|null>} Array de fragmentos de letra o null si no se encuentra.
 */
async function getSongLyrics(query) {
    try {
        const searches = await Client.songs.search(query);
        if (searches.length === 0) return null;

        const song = searches[0];
        const lyrics = await song.lyrics();

        if (!lyrics) return null;

        // Discord tiene un límite de 4096 caracteres para embeds (descripción) o 1024 para campos.
        // Aquí dividimos la letra en fragmentos de ~2000 caracteres para mayor seguridad y legibilidad.
        const chunks = [];
        for (let i = 0; i < lyrics.length; i += 2000) {
            chunks.push(lyrics.substring(i, i + 2000));
        }

        return chunks;
    } catch (error) {
        console.error('[LyricsUtil] Error al obtener letras:', error.message);
        return null;
    }
}

module.exports = { getSongLyrics };
