const YouTube = require('simple-youtube-api');
const youtube = new YouTube(process.env.YOUTUBE_API_KEY);

const keywords = [
    "top hits official music video", "rock clásico official mv", "pop 2024 official music video", 
    "indie music official mv", "rap trending official music video", "lofi hip hop beats study", 
    "electronic dance music official", "latin hits 2024 official mv", "r&b soul official music video",
    "k-pop official mv", "heavy metal official music video", "jazz classics official",
    "reggae hits official video", "alternative rock official mv", "country music official video",
    "synthwave music official", "blues classics official video", "classical music masterpieces",
    "techno mix 2024 official", "house music official video", "trap hits 2024 official mv"
];

/**
 * Busca una canción aleatoria en YouTube basada en keywords musicales.
 * @returns {Promise<Object|null>} Objeto con datos del video o null si falla.
 */
async function getRandomMusicSuggestion() {
    let attempts = 0;
    const maxAttempts = 5; // Intentar hasta 5 veces con diferentes keywords

    while (attempts < maxAttempts) {
        try {
            const keyword = keywords[Math.floor(Math.random() * keywords.length)];
            console.log(`[YouTubeUtil] Intento ${attempts + 1}: Buscando con "${keyword}"`);
            
            const results = await youtube.searchVideos(keyword, 40, { type: 'video' });
            
            if (!results || results.length === 0) {
                attempts++;
                continue;
            }

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
                'meme', 'compilation', 'compilación', 'shorts', 'reels', 'tiktok', 'extreme',
                'challenge', 'reto', 'prank', 'broma', 'fail', 'wins', 'best of'
            ];

            for (const v of results) {
                const title = v.title.toLowerCase();
                const channel = v.channel?.title?.toLowerCase() || '';

                // 1. Filtro de Blacklist
                if (blacklist.some(word => title.includes(word) || channel.includes(word))) continue;

                // 2. Filtro de caracteres basura (emojis o símbolos de spam)
                if (title.includes('【') || title.includes('】') || title.includes('「') || title.includes('」')) continue;

                musicVideos.push(v);
            }

            if (musicVideos.length === 0) {
                attempts++;
                continue;
            }

            // Barajar los resultados para mayor aleatoriedad
            const shuffled = musicVideos.sort(() => 0.5 - Math.random());

            for (const selectedVideo of shuffled) {
                const fullVideo = await youtube.getVideoByID(selectedVideo.id);
                
                // FILTRO DEFINITIVO: Categoría Música (10)
                const isMusic = fullVideo.categoryId === '10';
                
                if (isMusic) {
                    console.log(`[YouTubeUtil] ¡Canción encontrada!: ${fullVideo.title}`);
                    return {
                        title: fullVideo.title,
                        author: fullVideo.channel.title,
                        url: `https://www.youtube.com/watch?v=${fullVideo.id}`,
                        thumbnail: fullVideo.thumbnails.maxres?.url || fullVideo.thumbnails.high?.url || fullVideo.thumbnails.default?.url
                    };
                }
            }
            
            attempts++;
        } catch (error) {
            console.error('[YouTubeUtil] Error en intento:', error.message);
            attempts++;
        }
    }

    console.error('[YouTubeUtil] No se encontró ninguna canción válida tras todos los intentos.');
    return null;
}

module.exports = { getRandomMusicSuggestion };
