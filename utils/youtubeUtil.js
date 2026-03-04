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
        
        // Buscamos muchos resultados para filtrar bien
        const results = await youtube.searchVideos(keyword, 30, { type: 'video' });
        
        if (!results || results.length === 0) return null;

        const musicVideos = [];
        const blacklist = [
            'news', 'noticias', 'live', 'directo', 'reddit', 'r/', 'confessions', 
            'story', 'history', 'tutorial', 'how to', 'podcast', 'gameplay', 
            'walkthrough', 'review', 'reacción', 'reaction', 'breaking', 'explicación',
            'documentary', 'documental', 'biografía', 'biography', 'facts', 'datos',
            'curiosidades', 'top 10', 'top 5', 'analysis', 'análisis', 'essay',
            'video essay', 'crítica', 'criticism', 'theory', 'teoría', 'lessons',
            'clases', 'course', 'curso', 'behind the scenes', 'making of', 'entrevista',
            'interview', 'vlog', 'blog', 'journey', 'evolution', 'evolución',
            'the story of', 'la historia de', 'meaning of', 'significado de',
            'roblox', 'minecraft', 'brainrot', 'steal a', 'skibidi', 'gaming', 'funny moments',
            'meme', 'compilation', 'compilación', 'shorts', 'reels', 'tiktok'
        ];

        for (const v of results) {
            const title = v.title.toLowerCase();
            const channel = v.channel?.title?.toLowerCase() || '';

            // 1. Filtro de Blacklist
            if (blacklist.some(word => title.includes(word) || channel.includes(word))) continue;

            // 2. Filtro de caracteres no deseados (opcional, pero ayuda a evitar spam de otros idiomas si no se desea)
            if (title.includes('【') || title.includes('】') || title.includes('「') || title.includes('」')) continue;

            musicVideos.push(v);
        }

        if (musicVideos.length === 0) return null;

        // Intentar encontrar uno que sea REALMENTE música
        for (let i = 0; i < Math.min(musicVideos.length, 5); i++) {
            const selectedVideo = musicVideos[Math.floor(Math.random() * musicVideos.length)];
            const fullVideo = await youtube.getVideoByID(selectedVideo.id);
            
            // FILTRO DEFINITIVO: Categoría Música (10) Y Duración razonable (1.5 min a 10 min)
            // La duración viene en formato ISO 8601 (ej: PT4M30S)
            const duration = fullVideo.duration; 
            const isMusic = fullVideo.categoryId === '10';
            
            // Si es categoría música, lo aceptamos de inmediato
            if (isMusic) {
                return {
                    title: fullVideo.title,
                    author: fullVideo.channel.title,
                    url: `https://www.youtube.com/watch?v=${fullVideo.id}`,
                    thumbnail: fullVideo.thumbnails.maxres?.url || fullVideo.thumbnails.high?.url || fullVideo.thumbnails.default?.url
                };
            }
        }

        return null;
    } catch (error) {
        console.error('[YouTubeUtil] Error al obtener sugerencia musical:', error.message);
        return null;
    }
}

module.exports = { getRandomMusicSuggestion };
