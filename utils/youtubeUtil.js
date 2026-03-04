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
        
        // Buscamos más resultados (25) para tener un buen margen de filtrado
        const results = await youtube.searchVideos(keyword, 25, { type: 'video' });
        
        if (!results || results.length === 0) return null;

        // Filtrado estricto para asegurar que sea MÚSICA
        const musicVideos = [];
        
        for (const v of results) {
            const title = v.title.toLowerCase();
            const channel = v.channel?.title?.toLowerCase() || '';

            // Blacklist de palabras que indican que NO es música (Reddit, noticias, tutoriales, etc.)
            const blacklist = [
                'news', 'noticias', 'live', 'directo', 'reddit', 'r/', 'confessions', 
                'story', 'history', 'tutorial', 'how to', 'podcast', 'gameplay', 
                'walkthrough', 'review', 'reacción', 'reaction', 'breaking'
            ];

            if (blacklist.some(word => title.includes(word) || channel.includes(word))) continue;

            // Si pasa el filtro de palabras, lo añadimos
            musicVideos.push(v);
        }

        if (musicVideos.length === 0) return null;

        // Elegimos uno al azar de los filtrados
        const selectedVideo = musicVideos[Math.floor(Math.random() * musicVideos.length)];
        
        // Obtener detalles completos para verificar la categoría (ID 10 = Music)
        const fullVideo = await youtube.getVideoByID(selectedVideo.id);
        
        // Si no es categoría música, intentamos con otro de la lista (máximo 3 intentos)
        if (fullVideo.categoryId !== '10') {
            console.log(`[YouTubeUtil] El video "${fullVideo.title}" no es categoría música (ID: ${fullVideo.categoryId}). Filtrando...`);
            // Simplemente buscamos otro de la lista filtrada que ya tenemos
            const backupVideo = musicVideos.find(v => v.id !== fullVideo.id);
            if (!backupVideo) return null;
            return await youtube.getVideoByID(backupVideo.id).then(fv => ({
                title: fv.title,
                author: fv.channel.title,
                url: `https://www.youtube.com/watch?v=${fv.id}`,
                thumbnail: fv.thumbnails.maxres?.url || fv.thumbnails.high?.url || fv.thumbnails.default?.url
            }));
        }

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
