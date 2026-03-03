const fs = require('fs').promises;
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

class DataManager {
    constructor() {
        this.cache = new Map();
    }

    async getFile(fileName, defaultData = {}) {
        if (this.cache.has(fileName)) {
            return this.cache.get(fileName);
        }

        const filePath = path.join(dataDir, fileName);
        try {
            await fs.access(filePath);
            const raw = await fs.readFile(filePath, 'utf-8');
            const data = raw.trim() ? JSON.parse(raw) : defaultData;
            this.cache.set(fileName, data);
            return data;
        } catch (error) {
            this.cache.set(fileName, defaultData);
            return defaultData;
        }
    }

    async saveFile(fileName, data) {
        this.cache.set(fileName, data);
        const filePath = path.join(dataDir, fileName);
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error(`[DataManager] Error guardando el archivo ${fileName}:`, error);
        }
    }
}

module.exports = new DataManager();
