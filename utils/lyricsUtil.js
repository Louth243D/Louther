const Genius = require('genius-lyrics');

/**
 * Busca la letra de una canción en Genius.
 * @param {string} query - Nombre de la canción y autor.
 * @param {string} artistName - Nombre del artista original para validar.
 * @returns {Promise<string[]|null>} Array de fragmentos de letra o null si no se encuentra.
 */
async function getSongLyrics(query, artistName) {
    try {
        const token = process.env.GENIUS_API_KEY?.trim();
        if (!token) {
            console.error('[LyricsUtil] No se encontró GENIUS_API_KEY.');
            return null;
        }

        console.log(`[LyricsUtil] Buscando: "${query}" (Artista esperado: ${artistName})`);

        const Client = new Genius.Client(token);
        const searches = await Client.songs.search(query);
        if (searches.length === 0) return null;

        // Intentar encontrar un resultado que coincida mejor con el artista
        let song = searches.find(s => 
            s.artist.name.toLowerCase().includes(artistName.toLowerCase()) ||
            artistName.toLowerCase().includes(s.artist.name.toLowerCase())
        );

        // Si no hay coincidencia clara de artista, pero el primer resultado parece ser la canción (por título), lo usamos.
        if (!song) {
            song = searches[0];
            console.warn(`[LyricsUtil] No hubo coincidencia exacta de artista. Usando primer resultado: ${song.title} por ${song.artist.name}`);
        } else {
            console.log(`[LyricsUtil] Coincidencia encontrada: ${song.title} por ${song.artist.name}`);
        }

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
