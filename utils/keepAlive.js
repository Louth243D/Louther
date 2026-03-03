const express = require('express');
const server = express();

function keepAlive() {
    server.all('/', (req, res) => {
        res.send('¡Louther está vivo y funcionando!');
    });

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
        console.log(`🌐 Servidor Keep-Alive listo en el puerto ${port}`);
    });
}

module.exports = keepAlive;
