const Pool  = require('pg').Pool
const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    port: 5432,
    password: 'P4ssw0rd!',
    database: 'absensi'
})

module.exports = pool
