// Load .env file
require('dotenv').config();

// Load required libraries from node_modules
const express = require('express')
const hbs = require('express-handlebars')
const mysql = require('mysql2/promise')

// Configure the environment
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

// SQL Query
const SQL_LIST_TV_SHOWS_IN_DESC = 'SELECT * from tv_shows order by name asc limit ? offset ?'
const SQL_FIND_TV_SHOW_BY_TVID = 'SELECT * FROM tv_shows WHERE tvid = ?'

// Create the database connection pool (used for MySQL)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'leisure',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT),
  timezone: '+08:00'
})

const startApp = async (app, pool) => {
  try {
    // Acquire a connection from the connection pool
    const conn = await pool.getConnection();
    console.info('Pinging DB')
    await conn.ping()
    // release the connection
    console.info('Ping DB successful, releasing connection')
    conn.release()
    // Start express
    app.listen(PORT, () => { // first parameter = port number
      console.log(`Application started on port ${PORT} at ${new Date()}`)
    })
  } catch(e) {
    console.error('Error! Cannot ping DB: ', e)
  }
}

// Create an instance of the express application
const app = express()

// Configure handlebars to manage views
app.engine('hbs', hbs({ defaultLayout: 'default.hbs' }))
app.set('view engine', 'hbs')
app.set('views', __dirname + '/views')

// Configure the static files
app.use(express.static(__dirname + '/static'))

// Match Routes
app.get(['/', 'index.html'], async (req, res) => {
  const conn = await pool.getConnection()
  // const offset = parseInt(req.query.offset) || 0
  // const limit = 12
  try {
    const result = await conn.query(SQL_LIST_TV_SHOWS_IN_DESC, [12, 0])
    const showsArr = result[0]
    console.info(showsArr)
    res.status(200)
    res.type('text/html')
    res.render('index', {
      showsArr: showsArr
      // offset: offset,
      // nextOffset: limit + offset,
      // prevOffset: Math.max(0, (offset - limit))
      })
  } catch(e) {
    res.status(500)
    res.type('text/html')
    res.send('<h2>Error</h2>' + e)
  } finally {
    console.info('Releasing connection')
    conn.release()
  }
})

app.get('/tv_show/:tv_id', async (req, res) => {
  const tv_id = req.params.tv_id
  const conn = await pool.getConnection()
  try {
    console.log('Getting query by tv_id query')
    const result = await conn.query(SQL_FIND_TV_SHOW_BY_TVID, [tv_id])
    const show = result[0]
    console.log(show)
    if (show.length <= 0) {
      res.status(404)
      res.type('text/html')
      res.send('<p>Show not found, ID:</p>' + e)
    }
    res.render('show', { show })
  } catch(e) {
    res.status(500)
    res.type('text/html')
    res.send('<h2>Error: </h2>' + JSON.stringify(e))

  } finally {
    console.info('Releasing connection')
    conn.release()
  }
})

startApp(app, pool)
