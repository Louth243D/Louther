const YouTube = require('simple-youtube-api');
const youtube = new YouTube(process.env.YOUTUBE_API_KEY);

const keywords = ["top hits", "rock clásico", "pop 2024", "indie music", "rap trending", "lofi hip hop", "electronic dance", "latin hits 2024", "r&b soul"];

/**
 * Busca una canción aleatoria en YouTube basada en keywords musicales.
 * @returns {Promise<Object|null>} Objeto con datos del video o null si falla.
 */
async function getRandomMusicSuggestion() {
    try {
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        const results = await youtube.searchVideos(keyword, 10);
        
        if (!results || results.length === 0) return null;

        const video = results[Math.floor(Math.random() * results.length)];
        
        // Obtener detalles adicionales para el autor y thumbnail de alta calidad
        const fullVideo = await youtube.getVideoByID(video.id);

        return {
            title: fullVideo.title,
            author: fullVideo.channel.title,
            url: `https://www.youtube.com/watch?v=${fullVideo.id}`,
            thumbnail: fullVideo.thumbnails.maxres?.url || fullVideo.thumbnails.high?.url || fullVideo.thumbnails.default?.url
        };
    } catch (error) {
        console.error('[YouTubeUtil] Error al obtener sugerencia musical:', error.message);
        return null;
    }
}

module.exports = { getRandomMusicSuggestion };
