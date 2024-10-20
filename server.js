import mysql from "mysql2";
import express from 'express'
import cors from 'cors';
import { error } from "console";

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "bank",
  password: "root"
});

const app = express();
const PORT = 5000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const accountIsExists = (accountId) => {

  const sql = "SELECT * FROM `accounts` where id = ?";
  connection.query(sql, [accountId], (err, res) => {
    if (err) console.log(err)
    if (res?.length === 0) return true
    return false
  })

}

app.post('/account', (req, res) => {
  const { name, id, balance } = req.body;
  if (balance < 0 || accountIsExists(id)) {
    res.status(400)
    return
  }

  const sql = "INSERT INTO `bank`.`accounts` (`id`, `name`, `funds`) VALUES (?, ?, ?);"
  connection.query(sql, [id, name, balance], (err, response) => {
    if (err) {
      console.log(err)
      res.status(500)
      return
    }
    res.status(201).json({ message: "Account created successfully!" });
    return
  })
});

app.get('/account', (req, res) => {
  const accountId = req.query?.id;
  if (!accountId) {
    res.status(404).json({ message: "Account not found" })
  }

  const sql = "SELECT * FROM `accounts` WHERE `accounts`.`id` = ?";
  const sql2 = "SELECT * FROM `transactions` WHERE `transactions`.`from` = ? OR `transactions`.`to` = ?";
  connection.query(sql, [Number(accountId)], (err, response) => {
    if (err) {
      res.status(500)
      console.log(err)
      return
    }
    connection.query(sql2, [Number(accountId), Number(accountId)], (err, response2) => {
      if (err) {
        res.status(500)
        console.log(err)
        return
      }
      console.log(response2)
      res.status(200).json({
        ...response[0],
        transactions: [
          ...response2
        ]
      })
    })
  })
})

app.post('/addFunds', (req, res) => {
  const { id, funds } = req.body;

  const sql = "INSERT INTO `transactions` (`type`, `to`, `amount`) VALUES (?, ?, ?)";
  connection.query(sql, ['deposite', id, funds], (err, response) => {
    if (err) {
      res.status(500)
      console.log(err)
      return
    }
    res.status(201)
  })

})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
