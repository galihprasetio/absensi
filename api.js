const express = require('express')
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require('body-parser')
const client = require('./connection')
const config = require('./config');

const app = express()
const port = 3002

app.use(bodyParser.json())
app.listen(port, () => {
    console.log(`Listen port ${port}`)
})

client.connect(error => {
    if (error) {
        console.log(error.message)
    } else {
        console.log(`Connected`)
    }
})
// verifikasi token ketika mengakses url/routing 
const verifyToken = (req, res, next) => {
    const tokenHeader = req.headers["authorization"];
    if (tokenHeader == undefined) {
        return res.status(500).send({
            auth: false,
            message: "Error",
            errors: "Token Invalid or Null",
        });
    }

    if (tokenHeader.split(" ")[0] !== "Bearer") {
        return res.status(500).send({
            auth: false,
            message: "Incorrect token format",
            errors: "Incorrect token format",
        });
    }

    let token = tokenHeader.split(" ")[1];

    if (!token) {
        return res.status(403).send({
            auth: false,
            message: "No token provided",
            errors: "No token provided",
        });
    }

    jwt.verify(token, config, async (err, decoded) => {
        if (err) {
            return res.status(500).send({
                auth: false,
                message: err,
                errors: err,
            });
        }
        req.karyawanId = parseInt(decoded.id);
        next();
    });
}

app.get('/karyawan', (req, res) => {
    client.query('select * from karyawan', (error, result) => {
        if (!error) {
            return res.status(200).send(result.rows)
        }
    })
})

app.get('/profile', [verifyToken], (req, res) => {
    const karyawanId = req.karyawanId
    client.query(`select name, email, no_handphone from karyawan where id =${karyawanId} `, (error, result) => {
        if (!error) {
            return res.status(200).send(result.rows)
        }
    })
})

app.post('/karyawan', (req, res) => {
    const { name, email, password, no_handphone } = req.body
    client.query((`insert into karyawan (name, email,password,no_handphone,created_at,updated_at) values ('${name}','${email}','${password}','${no_handphone}','now()','now()')`), (error, result) => {
        if (!error) {
            return res.status(200).send({ message: 'Insert success' })
        } else {
            return res.status(500).send(error.message)
        }
    })
})

app.put('/karyawan/:karyawanId', (req, res) => {
    const { name, email, password, no_handphone } = req.body
    const karyawanId = req.params.karyawanId
    client.query((`update karyawan set name = '${name}' ,email = '${email}' ,password = '${password}',no_handphone = '${no_handphone}' , updated_at = now() where id ='${karyawanId}'`), (error, result) => {
        if (!error) {
            return res.status(200).send({ message: 'update success' })
        } else {
            return res.status(500).send(error.message)
        }
    })
})

app.delete('/karyawan/:karyawanId', (req, res) => {
    const karyawanId = req.params.karyawanId
    client.query((`delete from karyawan where id='${karyawanId}'`), (error, result) => {
        if (!error) {
            return res.status(200).send('Delete success')
        } else {
            return res.status(500).send(error.message)
        }
    })
})

app.post('/register', (req, res) => {
    const { name, email, password, no_handphone } = req.body
    client.query((`insert into karyawan (name, email,password,no_handphone,created_at,updated_at) values ('${name}','${email}','${bcrypt.hashSync(password,8)}','${no_handphone}',now(),now())`), (error, result) => {
        if (!error) {              
            return res.status(200).send('Register success')            
        } else {
            return res.status(500).send(error.message)
        }
    })    
})

app.post('/login', (req, res) => {
    const { email, password} = req.body
    client.query(`select * from karyawan where email = '${email}'`).then((result) => {
        const { rows } = result
        const karyawan = rows
        if (!karyawan.length > 0) {
            return res.status(404).send({
                auth: false,
                id: req.body.id,
                accessToken: null,
                karyawanInfo: null,
                message: "User Not Found",
                errors: "User Not Found.",
            });
        }
        var passwordIsValid = bcrypt.compareSync(
            req.body.password,
            karyawan[0].password
        );

        if (!passwordIsValid) {
            return res.status(500).send({
                auth: false,
                id: req.body.id,
                accessToken: null,
                karyawanInfo: null,
                message: "Invalid Password!",
                errors: "Invalid Password!",
            });
        }
                
        var token =
                "Bearer " +
                jwt.sign(
                    {
                        id: karyawan[0].id,
                        email: karyawan[0].email,
                    },
                    config,
                    {
                        expiresIn: 86400, //24h expired
                    }
            );
        
        res.status(200).send({
            auth: true,
            id: req.body.id,
            accessToken: token,
            karyawanInfo: {
                name: karyawan[0].name,
                email: karyawan[0].email,
            },
            message: "Error",
            errors: null,
        });
    }).catch((error) => {
        console.log(error)
    })    
})

app.post('/absen', [verifyToken], (req, res) => {
    const { waktuAbsen, status } = req.body
    const karyawanId = req.karyawanId
    client.query((`insert into absensi(karyawan_id,waktu_absen, status,created_at,updated_at) values('${karyawanId}','${waktuAbsen}','${status}','now()','now()')`), (error, result) => {
        if (!error) {
            return res.status(200).send('Absensi success')
        } else {
            return res.status(500).send(error.message)
        }
    })
})

app.get('/rekapabsensi', (req, res) => {
    const { tanggalAwal, tanggalAkhir } = req.body
    client.query((`
        SELECT
            karyawan.NAME,
            karyawan.email,
            absensi.waktu_absen,
            absensi.status,
            to_char(absensi.waktu_absen , 'dd-mm-yyyy')
        FROM
            karyawan
            LEFT JOIN absensi ON absensi.karyawan_id = karyawan.ID
        where 
        to_char(absensi.waktu_absen , 'dd-mm-yyyy') >= '${tanggalAwal}' 
        and 
        to_char(absensi.waktu_absen , 'dd-mm-yyyy') <= '${tanggalAkhir}'
    `), (error, result) => {
        if (!error) {
            return res.status(200).send(result.rows);
        } else {
            return res.status(500).send(error.message);
        }
    })
})

app.post('/updatepassword',[verifyToken], (req, res) => {
    const password = req.body.password
    const karyawanId = req.karyawanId
    client.query(`update karyawan set password ='${bcrypt.hashSync(password, 8)}' where id = '${karyawanId}'`, (error, result) => {
        if (!error) {
            return res.status(200).send({message: 'success'})
        } else {
            return res.status(500).send(error.message)
        }
    })
})

