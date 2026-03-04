const YouTube = require('simple-youtube-api');
const youtube = new YouTube(process.env.YOUTUBE_API_KEY);

const keywords = [
    "top hits music video", "rock clásico official", "pop 2024 music", 
    "indie music official", "rap trending music video", "lofi hip hop beats", 
    "electronic dance music", "latin hits 2024 official", "r&b soul music",
    "k-pop official mv", "heavy metal official", "jazz classics music"
];

/**
 * Busca una canción aleatoria en YouTube basada en keywords musicales.
 * @returns {Promise<Object|null>} Objeto con datos del video o null si falla.
 */
async function getRandomMusicSuggestion() {
    try {
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        // Añadimos 'music' a la búsqueda para forzar resultados musicales
        const results = await youtube.searchVideos(keyword, 15);
        
        if (!results || results.length === 0) return null;

        // Filtrar resultados que parezcan noticias o directos (muy básico)
        const musicVideos = results.filter(v => {
            const title = v.title.toLowerCase();
            return !title.includes('news') && !title.includes('noticias') && !title.includes('live') && !title.includes('directo');
        });

        const finalResults = musicVideos.length > 0 ? musicVideos : results;
        const video = finalResults[Math.floor(Math.random() * finalResults.length)];
        
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
