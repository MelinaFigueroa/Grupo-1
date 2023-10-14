const express = require('express');
const app = express();
const dotenv = require('dotenv');

dotenv.config();
const PORT = process.env.PORT || 3000;

// para evitar TypeError: Cannot read property '_id' of undefined
const bodyParser = require('body-parser');

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

const { connectToMongodb, disconnectToMongodb} = require('./src/mongoDB');

//Middleware
app.use((req, res, next) => {
    res.header("Content-Type", "application/json; charset=utf-8");
    next();
});

app.get('/', (req, res) => { res.status(200).end('¡Bienvenido a la API de articulos de computación!'); } );
// incluyo funciones declaradas en mongodb.js


const removeAccents = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};




//Endpoints lista base de datos
app.get('/computacion', async (req, res) => {
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    const db = client.db('computacion')
    const computacion = await db.collection('articulos').find().toArray()
    await disconnectToMongodb()
    res.json(computacion)
});

app.get('/computacion/: nombre', async (req, res) =>{
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    const db = client.db('computacion')
    const computacion = await db.collection('articulos').find().toArray()
    await disconnectToMongodb()
    res.json(computacion)
});

//Ruta para filtrar productos por nombre
app.get('/computacion/nombre/:letra', async (req, res) => {
    const nombre_producto = req.params.nombre;
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    const letraInicio = req.params.letra.toLowerCase(); // Letra específica con la que quieres empezar
    const regex = new RegExp(`^${letraInicio}`, 'i');
    const db = client.db('computacion')
    const computacion = await db.collection('articulos').find({ nombre: regex}).toArray()
    await disconnectToMongodb()
    computacion.length == 0 ? res.status(404).send('No encontre el articulo con el nombre '+ nombre_producto): res.json(computacion)
});
// Metodo para agregar
app.post('/computacion', async (req, res) => {
    const nuevo_producto = req.body;
    if (nuevo_producto === undefined){
        res.status(400).send('Error en el formato de datos a crear');
    }
    const client = await connectToMongodb();
    if (!client){
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    const db = client.db('computacion') 
    const collection = await db.collection('articulos').insertOne(nuevo_producto)
        .then(() => {
            console.log('Nuevo producto creado')
            res.status(201).send(nuevo_producto)
        }).catch(err => { 
            console.error(err)
        }).finally(() => { client.close()})
})



// Metodo de actualizacion
app.put('/computacion/:codigo', async (req, res) => { 
    const codigo = parseInt(req.params.codigo) || 0;
    const nuevosDatos = req.body
    if (!nuevosDatos) {
        res.status(400).send('Error en el formato de los datos recibidos')
    }
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    const db = client.db('computacion') 
    // ,{hint:true} 
    const collection = await db.collection('articulos').updateOne({ codigo: codigo }, { $set: nuevosDatos })
        .then(() => {
            let mensaje ='Articulo actualizado ID : ' + codigo
          res.status(200).json({ descripcion: mensaje , objeto: nuevosDatos})
        }).catch(err => { 
            let mensaje = 'Error al actualizar ID: ' + codigo 
            console.error(err)
            res.status(500).json({descripcion : mensaje, objeto: nuevosDatos})
        }).finally(() => {
            client.close()
        })
})

// Metodo de eliminacion
app.delete('/computacion/:codigo', async (req, res) => { 
    const codigo = req.params.codigo;
    if (!codigo) {
        res.status(400).send('Error en el formato del id recibido')
    }
    const client = await connectToMongodb();
    if (!client) {
        res.status(500).send('Error al conectarse a MongoDB')
        return;
    }
    client.connect()
        .then(() => { 
            const collection = client.db('computacion').collection('articulos')
            return collection.deleteOne({codigo: parseInt(codigo)})
        }).then((resultado) => {
            if (resultado.deletedCount === 0) {
                res.status(404).send('No se pudo encontrar el articulo con id: '+codigo)
            } else {
                console.log('Articulo eliminado')
                res.status(204).send('Articulo eliminado')
            }
        }).catch((err) => {
            console.error(err)
             res.status(500).send('Error al eliminar articulo')
            }).finally(() => {
                client.close()
            })
})

//Manejo de errores
app.get('*', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).send(JSON.stringify({ error: 404, description: 'No se encuentra la ruta' }));
});




app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});